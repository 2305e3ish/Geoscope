import re

from config import NAMED_BBOX

YEAR_PATTERN = re.compile(r"\b(19\d{2}|20\d{2})\b")
TERM_PATTERN = re.compile(r"[a-z0-9]+")


def normalize_query_text(query):
    return " ".join((query or "").strip().split())


def build_search_phrase(query):
    normalized = normalize_query_text(query)
    without_years = YEAR_PATTERN.sub(" ", normalized)
    cleaned = re.sub(r"[^A-Za-z0-9\s-]", " ", without_years)
    cleaned = re.sub(r"[-_/]+", " ", cleaned)
    cleaned = normalize_query_text(cleaned)
    return cleaned or normalized


def informative_query_terms(query):
    terms = []
    seen = set()
    for term in TERM_PATTERN.findall(build_search_phrase(query).lower()):
        if len(term) <= 2:
            continue
        if term not in seen:
            seen.add(term)
            terms.append(term)
    return terms


def parse_query(query):
    normalized = normalize_query_text(query)
    lowered = normalized.lower()
    year_match = YEAR_PATTERN.search(lowered)
    year = year_match.group(1) if year_match else None
    region = next((name for name in NAMED_BBOX if name in lowered), None)
    search_text = build_search_phrase(normalized)
    return search_text, year, region


def build_temporal(year):
    if not year:
        return None
    return f"{year}-01-01T00:00:00Z,{year}-12-31T23:59:59Z"


def build_search_params(keyword, year, region, page_size=10):
    params = {"keyword": keyword, "page_size": page_size}
    temporal = build_temporal(year)
    if temporal:
        params["temporal"] = temporal
    if region:
        params["bounding_box"] = ",".join(map(str, NAMED_BBOX[region]))
    return params
