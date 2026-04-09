from services.retriever import get_local_dataset
from services.vector_search import local_vector_search


def get_similar_datasets(dataset_id, limit=5):
    dataset = get_local_dataset(dataset_id)
    if dataset is None:
        return None, []

    similar = local_vector_search.similar_to(dataset_id, limit=limit)
    return dataset, similar
