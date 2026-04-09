import argparse
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config import DEFAULT_COLLECTIONS_PATH, INDEX_MANIFEST_PATH
from services.lexical_search import local_lexical_search
from services.metadata_store import load_jsonl, rebuild_sqlite
from services.vector_search import local_vector_search


def parse_args():
    parser = argparse.ArgumentParser(
        description="Build GeoScope local metadata indexes from the normalized JSONL corpus."
    )
    parser.add_argument(
        "--input",
        default=str(DEFAULT_COLLECTIONS_PATH),
        help="Path to the normalized JSONL metadata corpus.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force rebuilding SQLite and vector artifacts even if cached.",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    records = load_jsonl(args.input)
    if not records:
        raise SystemExit(f"No records found in {args.input}. Run ingest_cmr.py first.")

    local_lexical_search.input_path = Path(args.input)
    local_vector_search.input_path = Path(args.input)
    sqlite_path = rebuild_sqlite(records)
    local_lexical_search.load(force=True)
    vector_info = local_vector_search.build(force=args.force)

    manifest = {
        "recordCount": len(records),
        "sqlitePath": str(sqlite_path),
        "vectorIndexPath": vector_info.get("indexPath"),
        "vectorBackend": vector_info.get("backend"),
        "vectorDimension": vector_info.get("dimension"),
    }
    INDEX_MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    INDEX_MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
