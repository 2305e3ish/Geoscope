from services.lexical_search import local_lexical_search
from services.ranker import combine_ranked_results
from services.vector_search import local_vector_search


def get_local_dataset(dataset_id):
    record = local_vector_search.get_record_by_id(dataset_id)
    if record is not None:
        return record
    return local_lexical_search.get_record_by_id(dataset_id)


def hybrid_retrieve(query, year=None, region=None, limit=10):
    lexical_limit = max(limit * 4, 25)
    vector_limit = max(limit * 4, 25)

    lexical_results = local_lexical_search.search(query, limit=lexical_limit)
    vector_results = local_vector_search.search(query, limit=vector_limit)
    combined = combine_ranked_results(
        lexical_results,
        vector_results,
        year=year,
        region=region,
    )
    return combined[:limit]


def similar_datasets(dataset_id, limit=5):
    dataset = get_local_dataset(dataset_id)
    if dataset is None:
        return None, []
    return dataset, local_vector_search.similar_to(dataset_id, limit=limit)


def suggest_queries(query, limit=5):
    results = hybrid_retrieve(query, limit=max(limit * 2, 8))
    if not results:
        return []

    seen = set()
    suggestions = []
    lowered_query = query.lower()

    for result in results:
        for candidate in (result.get("scienceKeywords") or []) + (result.get("keywords") or []):
            normalized = candidate.strip()
            if not normalized:
                continue
            if normalized.lower() in {"not provided", "laboratory", "field surveys", "field investigation"}:
                continue
            if normalized.lower() in lowered_query:
                continue
            if normalized.lower() in seen:
                continue
            seen.add(normalized.lower())
            suggestions.append(
                {
                    "text": f"{query} {normalized}",
                    "reason": f"Suggested from {result.get('title') or result.get('id')}",
                }
            )
            if len(suggestions) >= limit:
                return suggestions

    return suggestions
