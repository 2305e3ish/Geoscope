from config import RAG_TOP_K
from services.gemini_service import generate_with_timeout, get_gemini_model
from services.prompt_loader import render_prompt
from services.retriever import get_local_dataset, hybrid_retrieve


def _citations_for_datasets(datasets):
    return [
        {
            "id": dataset.get("id"),
            "title": dataset.get("title"),
            "score": dataset.get("score"),
        }
        for dataset in datasets
    ]


def _dataset_context(datasets):
    blocks = []
    for dataset in datasets:
        blocks.append(
            "\n".join(
                [
                    f"ID: {dataset.get('id')}",
                    f"Title: {dataset.get('title')}",
                    f"Summary: {dataset.get('summary')}",
                    f"Data center: {dataset.get('dataCenter')}",
                    f"Time start: {dataset.get('timeStart')}",
                    f"Time end: {dataset.get('timeEnd')}",
                    f"Science keywords: {', '.join(dataset.get('scienceKeywords') or [])}",
                    f"Platforms: {', '.join(dataset.get('platforms') or [])}",
                    f"Instruments: {', '.join(dataset.get('instruments') or [])}",
                    f"Match reasons: {'; '.join(dataset.get('matchReasons') or [])}",
                ]
            )
        )
    return "\n\n".join(blocks)


def _fallback_assistant_answer(user_query, datasets):
    if not datasets:
        return "I could not find grounded datasets in the local GeoScope corpus for that question."

    first = datasets[0]
    answer_lines = [
        f"I found {len(datasets)} grounded datasets for '{user_query}'.",
        f"The strongest match is {first.get('title')} ({first.get('id')}).",
    ]

    if first.get("summary"):
        answer_lines.append(first.get("summary"))

    if len(datasets) > 1:
        answer_lines.append(
            "Other useful options include "
            + ", ".join(dataset.get("title") for dataset in datasets[1:3])
            + "."
        )

    answer_lines.append("These results are grounded only in the retrieved GeoScope metadata.")
    return " ".join(answer_lines)


def assistant_answer(user_query, year=None, region=None, top_k=RAG_TOP_K):
    datasets = hybrid_retrieve(user_query, year=year, region=region, limit=top_k)
    citations = _citations_for_datasets(datasets)

    if not datasets:
        return {
            "answer": _fallback_assistant_answer(user_query, datasets),
            "datasets": [],
            "citations": [],
            "source": "local_hybrid_rag",
            "usedDatasetCount": 0,
        }

    model = get_gemini_model()
    if model is None:
        answer = _fallback_assistant_answer(user_query, datasets)
        answer_source = "fallback"
    else:
        prompt = render_prompt(
            "research_assistant.txt",
            user_query=user_query,
            dataset_context=_dataset_context(datasets),
        )
        try:
            response = generate_with_timeout(model, prompt)
            answer = response.text.strip()
            answer_source = "gemini"
        except Exception as exc:
            print(f"Gemini assistant generation failed: {exc}")
            answer = _fallback_assistant_answer(user_query, datasets)
            answer_source = "fallback"

    return {
        "answer": answer,
        "datasets": datasets,
        "citations": citations,
        "source": "local_hybrid_rag",
        "generationSource": answer_source,
        "usedDatasetCount": len(datasets),
    }


def compare_datasets(dataset_ids):
    datasets = [get_local_dataset(dataset_id) for dataset_id in dataset_ids]
    datasets = [dataset for dataset in datasets if dataset is not None]
    if len(datasets) < 2:
        return None

    model = get_gemini_model()
    if model is None:
        comparison = "\n".join(
            [
                f"- {dataset.get('title')} ({dataset.get('id')}): "
                f"{dataset.get('timeStart') or 'unknown start'} to {dataset.get('timeEnd') or 'unknown end'}, "
                f"data center {dataset.get('dataCenter') or 'unknown'}."
                for dataset in datasets
            ]
        )
        return {
            "comparison": comparison,
            "datasets": datasets,
            "source": "fallback",
        }

    prompt = (
        "Compare the following Earth science datasets using only the metadata provided. "
        "Focus on coverage, likely use cases, and any obvious limitations from the metadata. "
        "Do not invent facts.\n\n"
        f"{_dataset_context(datasets)}"
    )
    try:
        response = generate_with_timeout(model, prompt)
        comparison = response.text.strip()
        source = "gemini"
    except Exception as exc:
        print(f"Gemini comparison generation failed: {exc}")
        comparison = "\n".join(
            [
                f"- {dataset.get('title')} ({dataset.get('id')}): "
                f"{dataset.get('timeStart') or 'unknown start'} to {dataset.get('timeEnd') or 'unknown end'}, "
                f"data center {dataset.get('dataCenter') or 'unknown'}."
                for dataset in datasets
            ]
        )
        source = "fallback"

    return {
        "comparison": comparison,
        "datasets": datasets,
        "source": source,
    }
