from config import (
    HYBRID_BM25_WEIGHT,
    HYBRID_FILTER_WEIGHT,
    HYBRID_METADATA_WEIGHT,
    HYBRID_VECTOR_WEIGHT,
    NAMED_BBOX,
)
from utils.geo import point_in_bbox


def metadata_quality_score(record):
    quality = record.get("metadataQuality") or {}
    score = 0.0
    if quality.get("hasSummary"):
        score += 0.3
    if quality.get("hasSpatial"):
        score += 0.25
    score += min((quality.get("keywordCount") or 0) * 0.03, 0.2)
    score += min((quality.get("scienceKeywordCount") or 0) * 0.04, 0.25)
    return min(score, 1.0)


def filter_match_score(record, year=None, region=None):
    score = 0.0
    matched_filters = []

    if year:
        time_start = record.get("timeStart") or ""
        time_end = record.get("timeEnd") or ""
        if time_start.startswith(str(year)) or time_end.startswith(str(year)):
            score += 0.5
            matched_filters.append("year")

    if region and region in NAMED_BBOX:
        bbox = NAMED_BBOX[region]
        if point_in_bbox(record.get("latitude"), record.get("longitude"), bbox):
            score += 0.5
            matched_filters.append("region")

    return min(score, 1.0), matched_filters


def _normalize(value, max_value):
    if max_value <= 0:
        return 0.0
    return value / max_value


def combine_ranked_results(lexical_results, vector_results, year=None, region=None):
    lexical_weight = HYBRID_BM25_WEIGHT
    vector_weight = HYBRID_VECTOR_WEIGHT
    metadata_weight = HYBRID_METADATA_WEIGHT
    filter_weight = HYBRID_FILTER_WEIGHT

    max_lexical = max((result.get("lexicalScore", 0.0) for result in lexical_results), default=0.0)
    max_vector = max((result.get("vectorScore", 0.0) for result in vector_results), default=0.0)

    merged = {}

    for result in lexical_results:
        merged[result["id"]] = {
            **result,
            "vectorScore": 0.0,
            "retrievalSources": ["bm25"],
        }

    for result in vector_results:
        existing = merged.get(result["id"])
        if existing is None:
            merged[result["id"]] = {
                **result,
                "lexicalScore": 0.0,
                "retrievalSources": ["vector"],
            }
            continue

        existing["vectorScore"] = result.get("vectorScore", 0.0)
        existing["retrievalSources"] = sorted(set(existing["retrievalSources"] + ["vector"]))
        existing["matchedTerms"] = sorted(
            set(existing.get("matchedTerms", []) + result.get("matchedTerms", []))
        )

    ranked = []
    for result in merged.values():
        lexical_component = _normalize(result.get("lexicalScore", 0.0), max_lexical)
        vector_component = _normalize(result.get("vectorScore", 0.0), max_vector)
        metadata_component = metadata_quality_score(result)
        filter_component, matched_filters = filter_match_score(result, year=year, region=region)

        score = (
            lexical_weight * lexical_component
            + vector_weight * vector_component
            + metadata_weight * metadata_component
            + filter_weight * filter_component
        )

        match_reasons = []
        if result.get("matchedTerms"):
            match_reasons.append(
                "Matched terms: " + ", ".join(result.get("matchedTerms", [])[:5])
            )
        if matched_filters:
            match_reasons.append("Matched filters: " + ", ".join(matched_filters))
        if metadata_component >= 0.7:
            match_reasons.append("Strong metadata coverage")

        result["metadataQualityScore"] = round(metadata_component, 6)
        result["matchedFilters"] = matched_filters
        result["matchReasons"] = match_reasons
        result["hybridBreakdown"] = {
            "bm25": round(lexical_component, 6),
            "vector": round(vector_component, 6),
            "metadata": round(metadata_component, 6),
            "filters": round(filter_component, 6),
        }
        result["score"] = round(score, 6)
        ranked.append(result)

    ranked.sort(key=lambda item: item["score"], reverse=True)
    return ranked
