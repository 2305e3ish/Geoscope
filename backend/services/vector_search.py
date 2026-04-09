import json
from pathlib import Path

import faiss
import joblib
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer

from config import (
    DEFAULT_COLLECTIONS_PATH,
    EMBEDDING_MODEL,
    VECTOR_ENCODER_PATH,
    VECTOR_INDEX_PATH,
    VECTOR_META_PATH,
)
from services.lexical_search import build_search_document, tokenize_text
from services.metadata_store import ensure_data_directories, load_jsonl, load_records_from_sqlite


class LocalVectorSearchService:
    def __init__(
        self,
        input_path=DEFAULT_COLLECTIONS_PATH,
        index_path=VECTOR_INDEX_PATH,
        meta_path=VECTOR_META_PATH,
        encoder_path=VECTOR_ENCODER_PATH,
        embedding_model=EMBEDDING_MODEL,
    ):
        self.input_path = Path(input_path)
        self.index_path = Path(index_path)
        self.meta_path = Path(meta_path)
        self.encoder_path = Path(encoder_path)
        self.embedding_model_name = embedding_model
        self._records = []
        self._record_lookup = {}
        self._tokenized_records = []
        self._record_ids = []
        self._id_to_index = {}
        self._index = None
        self._embeddings = None
        self._backend = None
        self._encoder = None
        self._model = None
        self._last_mtime = None

    def _load_source_records(self):
        sqlite_records = load_records_from_sqlite()
        if sqlite_records:
            return sqlite_records
        return load_jsonl(self.input_path)

    def _metadata_quality_boost(self, record):
        quality = record.get("metadataQuality") or {}
        boost = 0.0
        if quality.get("hasSummary"):
            boost += 0.15
        if quality.get("hasSpatial"):
            boost += 0.1
        boost += min((quality.get("keywordCount") or 0) * 0.02, 0.2)
        boost += min((quality.get("scienceKeywordCount") or 0) * 0.03, 0.2)
        return round(boost, 6)

    def _normalize_embeddings(self, vectors):
        array = np.asarray(vectors, dtype="float32")
        if array.ndim == 1:
            array = array.reshape(1, -1)
        faiss.normalize_L2(array)
        return array

    def _record_texts(self, records):
        return [build_search_document(record) for record in records]

    def _load_sentence_model(self):
        if self._model is None:
            self._model = SentenceTransformer(self.embedding_model_name)
        return self._model

    def _build_fallback_encoder(self, texts):
        vectorizer = TfidfVectorizer(max_features=8000, ngram_range=(1, 2))
        tfidf_matrix = vectorizer.fit_transform(texts)

        if tfidf_matrix.shape[0] > 2 and tfidf_matrix.shape[1] > 2:
            n_components = min(256, tfidf_matrix.shape[0] - 1, tfidf_matrix.shape[1] - 1)
            if n_components >= 2:
                svd = TruncatedSVD(n_components=n_components, random_state=42)
                vectors = svd.fit_transform(tfidf_matrix)
                return {"backend": "tfidf_svd", "vectorizer": vectorizer, "svd": svd}, vectors

        return {"backend": "tfidf", "vectorizer": vectorizer, "svd": None}, tfidf_matrix.toarray()

    def _encode_texts(self, texts):
        try:
            model = self._load_sentence_model()
            vectors = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
            self._backend = "sentence_transformer"
            self._encoder = None
            return np.asarray(vectors, dtype="float32")
        except Exception as exc:
            print(f"Sentence-transformer embedding failed, falling back to TF-IDF+SVD: {exc}")
            self._encoder, vectors = self._build_fallback_encoder(texts)
            self._backend = self._encoder["backend"]
            return self._normalize_embeddings(vectors)

    def _encode_query(self, query):
        if self._backend == "sentence_transformer":
            model = self._load_sentence_model()
            vector = model.encode([query], normalize_embeddings=True, show_progress_bar=False)
            return np.asarray(vector, dtype="float32")

        if self._encoder is None and self.encoder_path.exists():
            self._encoder = joblib.load(self.encoder_path)

        if not self._encoder:
            return np.zeros((1, 1), dtype="float32")

        vectorizer = self._encoder["vectorizer"]
        svd = self._encoder.get("svd")
        transformed = vectorizer.transform([query])
        if svd is not None:
            transformed = svd.transform(transformed)
        else:
            transformed = transformed.toarray()
        return self._normalize_embeddings(transformed)

    def _write_artifacts(self):
        ensure_data_directories()
        self.index_path.parent.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self._index, str(self.index_path))
        self.meta_path.write_text(
            json.dumps(
                {
                    "recordIds": self._record_ids,
                    "backend": self._backend,
                    "embeddingModel": self.embedding_model_name,
                    "dimension": int(self._index.d),
                    "sourcePath": str(self.input_path),
                },
                ensure_ascii=True,
                indent=2,
            ),
            encoding="utf-8",
        )
        if self._backend in {"tfidf", "tfidf_svd"} and self._encoder is not None:
            joblib.dump(self._encoder, self.encoder_path)
        elif self.encoder_path.exists():
            self.encoder_path.unlink()

    def _load_artifacts(self):
        if not self.index_path.exists() or not self.meta_path.exists():
            return False

        metadata = json.loads(self.meta_path.read_text(encoding="utf-8"))
        records = self._load_source_records()
        record_lookup = {record.get("id"): record for record in records if record.get("id")}
        record_ids = metadata.get("recordIds") or []

        if not record_ids:
            return False

        ordered_records = []
        for record_id in record_ids:
            record = record_lookup.get(record_id)
            if record is None:
                return False
            ordered_records.append(record)

        self._records = ordered_records
        self._record_lookup = {record.get("id"): record for record in ordered_records}
        self._record_ids = record_ids
        self._id_to_index = {record_id: index for index, record_id in enumerate(record_ids)}
        self._tokenized_records = [tokenize_text(build_search_document(record)) for record in ordered_records]
        self._index = faiss.read_index(str(self.index_path))
        self._backend = metadata.get("backend") or "sentence_transformer"
        self._embeddings = None
        if self._backend in {"tfidf", "tfidf_svd"} and self.encoder_path.exists():
            self._encoder = joblib.load(self.encoder_path)
        self._last_mtime = self.input_path.stat().st_mtime if self.input_path.exists() else None
        return True

    def build(self, force=False):
        current_mtime = self.input_path.stat().st_mtime if self.input_path.exists() else None
        if not force and self._last_mtime == current_mtime and self._index is not None:
            return {
                "count": len(self._records),
                "backend": self._backend,
                "indexPath": str(self.index_path),
            }

        records = self._load_source_records()
        texts = self._record_texts(records)
        embeddings = self._encode_texts(texts) if texts else np.zeros((0, 1), dtype="float32")

        self._records = records
        self._record_lookup = {record.get("id"): record for record in records if record.get("id")}
        self._record_ids = [record.get("id") for record in records]
        self._id_to_index = {record_id: index for index, record_id in enumerate(self._record_ids)}
        self._tokenized_records = [tokenize_text(text) for text in texts]
        self._embeddings = embeddings
        dimension = embeddings.shape[1] if embeddings.size else 1
        self._index = faiss.IndexFlatIP(dimension)
        if embeddings.size:
            self._index.add(embeddings)

        self._write_artifacts()
        self._last_mtime = current_mtime
        return {
            "count": len(records),
            "backend": self._backend,
            "dimension": dimension,
            "indexPath": str(self.index_path),
        }

    def load(self, force=False):
        current_mtime = self.input_path.stat().st_mtime if self.input_path.exists() else None
        if not force and self._last_mtime == current_mtime and self._index is not None:
            return

        if not force and self._load_artifacts():
            return

        self.build(force=True)

    def corpus_size(self):
        self.load()
        return len(self._records)

    def get_backend(self):
        self.load()
        return self._backend

    def get_record_by_id(self, record_id):
        self.load()
        return self._record_lookup.get(record_id)

    def _search_by_vector(self, query_vector, limit=10):
        if self._index is None or self._index.ntotal == 0:
            return []

        distances, indices = self._index.search(query_vector, min(limit, self._index.ntotal))
        query_terms = tokenize_text("")
        results = []

        for raw_score, index in zip(distances[0], indices[0]):
            if index < 0:
                continue
            record = self._records[index]
            quality_boost = self._metadata_quality_boost(record)
            results.append(
                {
                    **record,
                    "vectorScore": round(float(raw_score), 6),
                    "qualityBoost": quality_boost,
                }
            )
        return results

    def search(self, query, limit=10):
        self.load()
        query_terms = tokenize_text(query)
        if not query_terms or not self._records:
            return []

        query_vector = self._encode_query(query)
        if query_vector.shape[1] != self._index.d:
            return []

        distances, indices = self._index.search(query_vector, min(limit, self._index.ntotal))
        results = []
        for raw_score, index in zip(distances[0], indices[0]):
            if index < 0:
                continue
            record = self._records[index]
            quality_boost = self._metadata_quality_boost(record)
            token_set = set(self._tokenized_records[index])
            matched_terms = [term for term in dict.fromkeys(query_terms) if term in token_set]
            results.append(
                {
                    **record,
                    "vectorScore": round(float(raw_score), 6),
                    "qualityBoost": quality_boost,
                    "matchedTerms": matched_terms,
                }
            )
        return results

    def similar_to(self, record_id, limit=5):
        self.load()
        target_index = self._id_to_index.get(record_id)
        if target_index is None or self._index is None or self._index.ntotal == 0:
            return []

        if self._embeddings is None:
            if self._backend == "sentence_transformer":
                texts = self._record_texts(self._records)
                self._embeddings = np.asarray(
                    self._load_sentence_model().encode(
                        texts, normalize_embeddings=True, show_progress_bar=False
                    ),
                    dtype="float32",
                )
            else:
                return []

        query_vector = self._embeddings[target_index : target_index + 1]
        distances, indices = self._index.search(
            query_vector, min(limit + 1, self._index.ntotal)
        )
        target_terms = set(self._tokenized_records[target_index])
        results = []

        for raw_score, index in zip(distances[0], indices[0]):
            if index < 0 or index == target_index:
                continue
            record = self._records[index]
            shared_terms = sorted(target_terms.intersection(self._tokenized_records[index]))[:10]
            quality_boost = self._metadata_quality_boost(record)
            results.append(
                {
                    **record,
                    "vectorScore": round(float(raw_score), 6),
                    "qualityBoost": quality_boost,
                    "sharedTerms": shared_terms,
                }
            )
            if len(results) >= limit:
                break

        return results


local_vector_search = LocalVectorSearchService()
