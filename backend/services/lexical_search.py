import re
from pathlib import Path

from rank_bm25 import BM25Okapi

from config import DEFAULT_COLLECTIONS_PATH
from services.metadata_store import load_jsonl, load_records_from_sqlite

TOKEN_PATTERN = re.compile(r"[a-z0-9]+")


def tokenize_text(text):
    if not text:
        return []
    return TOKEN_PATTERN.findall(text.lower())


def build_search_document(record):
    weighted_fields = []

    def add_field(value, weight=1):
        if not value:
            return
        if isinstance(value, str):
            weighted_fields.extend([value] * weight)
            return
        if isinstance(value, (list, tuple)):
            for item in value:
                if item:
                    weighted_fields.extend([str(item)] * weight)

    add_field(record.get("title"), weight=4)
    add_field(record.get("shortName"), weight=3)
    add_field(record.get("summary"), weight=2)
    add_field(record.get("keywords"), weight=3)
    add_field(record.get("scienceKeywords"), weight=3)
    add_field(record.get("spatialKeywords"), weight=2)
    add_field(record.get("platforms"), weight=2)
    add_field(record.get("instruments"), weight=2)
    add_field(record.get("projects"), weight=2)
    add_field(record.get("dataCenter"), weight=1)
    return " ".join(weighted_fields)


class LocalBM25SearchService:
    def __init__(self, input_path=DEFAULT_COLLECTIONS_PATH):
        self.input_path = Path(input_path)
        self._records = []
        self._tokenized_records = []
        self._bm25 = None
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

    def load(self, force=False):
        current_mtime = self.input_path.stat().st_mtime if self.input_path.exists() else None
        if not force and self._last_mtime == current_mtime and self._bm25 is not None:
            return

        self._records = self._load_source_records()
        self._tokenized_records = [tokenize_text(build_search_document(record)) for record in self._records]
        self._bm25 = BM25Okapi(self._tokenized_records) if self._tokenized_records else None
        self._last_mtime = current_mtime

    def corpus_size(self):
        self.load()
        return len(self._records)

    def get_record_by_id(self, record_id):
        self.load()
        return next((record for record in self._records if record.get("id") == record_id), None)

    def search(self, query, limit=10):
        self.load()
        query_terms = tokenize_text(query)
        if not query_terms or self._bm25 is None:
            return []

        scores = self._bm25.get_scores(query_terms)
        scored_results = []

        for index, score in enumerate(scores):
            if score <= 0:
                continue
            record = self._records[index]
            tokens = set(self._tokenized_records[index])
            matched_terms = [term for term in dict.fromkeys(query_terms) if term in tokens]
            quality_boost = self._metadata_quality_boost(record)
            scored_results.append(
                {
                    **record,
                    "lexicalScore": round(float(score), 6),
                    "qualityBoost": quality_boost,
                    "score": round(float(score) + quality_boost, 6),
                    "matchedTerms": matched_terms,
                }
            )

        scored_results.sort(key=lambda item: item["score"], reverse=True)
        return scored_results[:limit]


local_lexical_search = LocalBM25SearchService()
