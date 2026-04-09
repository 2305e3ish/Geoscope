import argparse
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config import DEFAULT_COLLECTIONS_PATH
from services.cmr_client import collection_to_dataset, fetch_collection_entries_page
from services.metadata_store import normalize_collection_metadata, write_jsonl


def parse_args():
    parser = argparse.ArgumentParser(
        description="Ingest NASA CMR collection metadata into a local JSONL store."
    )
    parser.add_argument("--keyword", default=None, help="Optional keyword filter for CMR search.")
    parser.add_argument("--provider", default=None, help="Optional provider filter.")
    parser.add_argument(
        "--updated-since",
        dest="updated_since",
        default=None,
        help="Optional CMR updated_since value.",
    )
    parser.add_argument(
        "--page-size",
        dest="page_size",
        type=int,
        default=100,
        help="Number of records per page. CMR max is 2000.",
    )
    parser.add_argument(
        "--max-pages",
        dest="max_pages",
        type=int,
        default=1,
        help="Maximum number of CMR pages to ingest.",
    )
    parser.add_argument(
        "--output",
        default=str(DEFAULT_COLLECTIONS_PATH),
        help="Output JSONL file path.",
    )
    parser.add_argument(
        "--append",
        action="store_true",
        help="Append to the output file instead of overwriting it.",
    )
    return parser.parse_args()


def ingest(args):
    normalized_records = []
    total_raw_records = 0

    for page_num in range(1, args.max_pages + 1):
        entries = fetch_collection_entries_page(
            page_num=page_num,
            page_size=args.page_size,
            keywords=args.keyword,
            provider=args.provider,
            updated_since=args.updated_since,
        )
        if not entries:
            print(f"No more records returned at page {page_num}.")
            break

        for entry in entries:
            preview = collection_to_dataset(entry)
            normalized_records.append(normalize_collection_metadata(entry, preview))

        total_raw_records += len(entries)
        print(f"Ingested page {page_num}: {len(entries)} records")

    write_jsonl(normalized_records, output_path=args.output, append=args.append)
    print(f"Saved {len(normalized_records)} normalized records to {args.output}")
    print(f"Total raw CMR records processed: {total_raw_records}")


if __name__ == "__main__":
    ingest(parse_args())
