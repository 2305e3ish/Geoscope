import json
import sqlite3
from pathlib import Path

from config import DATA_DIR, DEFAULT_COLLECTIONS_PATH, INDEX_DIR, METADATA_DB_PATH


def ensure_data_directories():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    INDEX_DIR.mkdir(parents=True, exist_ok=True)


def _flatten_text_values(value):
    values = []

    if value is None:
        return values

    if isinstance(value, str):
        text = value.strip()
        if text:
            values.append(text)
        return values

    if isinstance(value, dict):
        preferred_keys = (
            "short_name",
            "shortName",
            "long_name",
            "longName",
            "value",
            "name",
            "term",
            "title",
            "keyword",
            "uuid",
        )
        for key in preferred_keys:
            if key in value:
                values.extend(_flatten_text_values(value.get(key)))

        if not values:
            for nested_value in value.values():
                values.extend(_flatten_text_values(nested_value))
        return values

    if isinstance(value, (list, tuple, set)):
        for item in value:
            values.extend(_flatten_text_values(item))
        return values

    return values


def _unique_preserve_order(values):
    seen = set()
    unique = []
    for value in values:
        if value not in seen:
            seen.add(value)
            unique.append(value)
    return unique


def _normalize_science_keywords(entry):
    science_keywords = []
    for keyword in entry.get("science_keywords") or []:
        if isinstance(keyword, dict):
            parts = [
                keyword.get("category"),
                keyword.get("topic"),
                keyword.get("term"),
                keyword.get("variable_level_1"),
                keyword.get("variable_level_2"),
                keyword.get("variable_level_3"),
                keyword.get("detailed_variable"),
            ]
            phrase = " > ".join(part.strip() for part in parts if isinstance(part, str) and part.strip())
            if phrase:
                science_keywords.append(phrase)
        else:
            science_keywords.extend(_flatten_text_values(keyword))
    return _unique_preserve_order(science_keywords)


def normalize_collection_metadata(entry, dataset_preview):
    keywords = _unique_preserve_order(
        _flatten_text_values(entry.get("keywords"))
        + _flatten_text_values(entry.get("platforms"))
        + _flatten_text_values(entry.get("instruments"))
    )
    science_keywords = _normalize_science_keywords(entry)
    spatial_keywords = _unique_preserve_order(_flatten_text_values(entry.get("spatial_keywords")))
    projects = _unique_preserve_order(_flatten_text_values(entry.get("projects")))
    related_urls = []
    for link in entry.get("links") or []:
        href = link.get("href") if isinstance(link, dict) else None
        if href:
            related_urls.append(href)

    return {
        "id": dataset_preview.get("id"),
        "title": dataset_preview.get("title"),
        "summary": dataset_preview.get("summary"),
        "shortName": dataset_preview.get("shortName"),
        "version": dataset_preview.get("version"),
        "dataCenter": dataset_preview.get("dataCenter"),
        "timeStart": dataset_preview.get("timeStart"),
        "timeEnd": dataset_preview.get("timeEnd"),
        "latitude": dataset_preview.get("latitude"),
        "longitude": dataset_preview.get("longitude"),
        "link": dataset_preview.get("link"),
        "boxes": dataset_preview.get("boxes") or [],
        "platforms": _unique_preserve_order(_flatten_text_values(dataset_preview.get("platforms"))),
        "instruments": _unique_preserve_order(_flatten_text_values(dataset_preview.get("instruments"))),
        "keywords": keywords,
        "scienceKeywords": science_keywords,
        "spatialKeywords": spatial_keywords,
        "projects": projects,
        "relatedUrls": _unique_preserve_order(related_urls),
        "metadataQuality": {
            "hasSummary": bool(dataset_preview.get("summary") and dataset_preview.get("summary") != "No summary available."),
            "hasSpatial": dataset_preview.get("latitude") is not None and dataset_preview.get("longitude") is not None,
            "keywordCount": len(keywords),
            "scienceKeywordCount": len(science_keywords),
        },
    }


def write_jsonl(records, output_path=DEFAULT_COLLECTIONS_PATH, append=False):
    ensure_data_directories()
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    mode = "a" if append else "w"
    with path.open(mode, encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=True) + "\n")


def load_jsonl(input_path=DEFAULT_COLLECTIONS_PATH):
    path = Path(input_path)
    if not path.exists():
        return []

    records = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def rebuild_sqlite(records, db_path=METADATA_DB_PATH):
    ensure_data_directories()
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(path) as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS datasets (
                id TEXT PRIMARY KEY,
                title TEXT,
                data_center TEXT,
                time_start TEXT,
                time_end TEXT,
                payload TEXT NOT NULL
            )
            """
        )
        cursor.execute("DELETE FROM datasets")
        rows = [
            (
                record.get("id"),
                record.get("title"),
                record.get("dataCenter"),
                record.get("timeStart"),
                record.get("timeEnd"),
                json.dumps(record, ensure_ascii=True),
            )
            for record in records
            if record.get("id")
        ]
        cursor.executemany(
            """
            INSERT OR REPLACE INTO datasets (id, title, data_center, time_start, time_end, payload)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
        connection.commit()

    return path


def load_records_from_sqlite(db_path=METADATA_DB_PATH):
    path = Path(db_path)
    if not path.exists():
        return []

    try:
        with sqlite3.connect(path) as connection:
            cursor = connection.cursor()
            cursor.execute("SELECT payload FROM datasets ORDER BY title COLLATE NOCASE ASC")
            return [json.loads(row[0]) for row in cursor.fetchall()]
    except sqlite3.Error:
        return []


def load_record_from_sqlite(record_id, db_path=METADATA_DB_PATH):
    path = Path(db_path)
    if not path.exists():
        return None

    try:
        with sqlite3.connect(path) as connection:
            cursor = connection.cursor()
            cursor.execute("SELECT payload FROM datasets WHERE id = ?", (record_id,))
            row = cursor.fetchone()
            if row is None:
                return None
            return json.loads(row[0])
    except sqlite3.Error:
        return None
