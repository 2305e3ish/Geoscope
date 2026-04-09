from services.gemini_service import generate_with_timeout, get_gemini_model
from services.prompt_loader import render_prompt
from services.retriever import get_local_dataset


def fallback_explanation(dataset, audience="general"):
    title = dataset.get("title") or "This dataset"
    summary = dataset.get("summary") or "No summary is available."
    time_start = dataset.get("timeStart")
    time_end = dataset.get("timeEnd")
    data_center = dataset.get("dataCenter") or "Unknown"

    coverage = ""
    if time_start and time_end:
        coverage = f" It covers the period from {time_start} to {time_end}."
    elif time_start:
        coverage = f" It starts at {time_start}."

    audience_line = {
        "student": "This explanation is tuned for a student audience.",
        "researcher": "This explanation is tuned for a research audience.",
    }.get(audience, "This explanation is tuned for a general audience.")

    return (
        f"{title} comes from {data_center}. {summary}{coverage} "
        f"{audience_line}"
    )


def explain_dataset(dataset_id, audience="general"):
    dataset = get_local_dataset(dataset_id)
    if dataset is None:
        return None

    model = get_gemini_model()
    if model is None:
        return {
            "dataset": dataset,
            "audience": audience,
            "explanation": fallback_explanation(dataset, audience=audience),
            "source": "fallback",
        }

    prompt = render_prompt(
        "explain_dataset.txt",
        audience=audience,
        title=dataset.get("title") or "",
        summary=dataset.get("summary") or "",
        data_center=dataset.get("dataCenter") or "",
        time_start=dataset.get("timeStart") or "",
        time_end=dataset.get("timeEnd") or "",
        platforms=", ".join(dataset.get("platforms") or []),
        instruments=", ".join(dataset.get("instruments") or []),
        science_keywords=", ".join(dataset.get("scienceKeywords") or []),
    )

    try:
        response = generate_with_timeout(model, prompt)
        explanation = response.text.strip()
        source = "gemini"
    except Exception as exc:
        print(f"Gemini dataset explanation failed: {exc}")
        explanation = fallback_explanation(dataset, audience=audience)
        source = "fallback"

    return {
        "dataset": dataset,
        "audience": audience,
        "explanation": explanation,
        "source": source,
    }
