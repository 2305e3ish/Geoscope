import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
INDEX_DIR = DATA_DIR / "indexes"
DEFAULT_COLLECTIONS_PATH = DATA_DIR / "collections.jsonl"


def _path_from_env(name, default_path):
    raw_value = os.getenv(name, "").strip()
    if raw_value:
        return Path(raw_value)
    return Path(default_path)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").strip()

CMR_BASE = "https://cmr.earthdata.nasa.gov/search/collections.json"
CMR_GRANULES = "https://cmr.earthdata.nasa.gov/search/granules.json"

USER_AGENT = os.getenv("USER_AGENT", "GeoScope/1.0 (contact@example.com)")
CMR_CLIENT_ID = os.getenv("CMR_CLIENT_ID", "GeoScope")
EARTHDATA_TOKEN = os.getenv("EARTHDATA_TOKEN", "").strip()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("API_KEY")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_ENABLED = bool(GEMINI_API_KEY)
GEMINI_TIMEOUT_SECONDS = max(int(os.getenv("GEMINI_TIMEOUT_SECONDS", "20")), 1)

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2").strip()
VECTOR_INDEX_PATH = _path_from_env("VECTOR_INDEX_PATH", INDEX_DIR / "vectors.faiss")
VECTOR_META_PATH = _path_from_env("VECTOR_META_PATH", INDEX_DIR / "vectors_meta.json")
VECTOR_ENCODER_PATH = _path_from_env("VECTOR_ENCODER_PATH", INDEX_DIR / "vectors_encoder.joblib")
METADATA_DB_PATH = _path_from_env("METADATA_DB_PATH", INDEX_DIR / "metadata.db")
INDEX_MANIFEST_PATH = _path_from_env("INDEX_MANIFEST_PATH", INDEX_DIR / "index_manifest.json")

RAG_TOP_K = max(int(os.getenv("RAG_TOP_K", "5")), 1)
HYBRID_BM25_WEIGHT = float(os.getenv("HYBRID_BM25_WEIGHT", "0.45"))
HYBRID_VECTOR_WEIGHT = float(os.getenv("HYBRID_VECTOR_WEIGHT", "0.40"))
HYBRID_METADATA_WEIGHT = float(os.getenv("HYBRID_METADATA_WEIGHT", "0.10"))
HYBRID_FILTER_WEIGHT = float(os.getenv("HYBRID_FILTER_WEIGHT", "0.05"))

NAMED_BBOX = {
    "india": [68, 6, 97, 36],
    "global": [-180, -90, 180, 90],
    "california": [-125, 32, -113, 43],
    "europe": [-11, 34, 31, 72],
    "indonesia": [95, -11, 141, 6],
}
