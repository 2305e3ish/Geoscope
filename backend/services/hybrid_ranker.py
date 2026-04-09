from services.retriever import hybrid_retrieve


def hybrid_search(query, limit=10, year=None, region=None):
    return hybrid_retrieve(query, year=year, region=region, limit=limit)
