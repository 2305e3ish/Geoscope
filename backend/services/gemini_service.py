import json
import re

import requests

from config import (
    GEMINI_API_KEY,
    GEMINI_ENABLED,
    GEMINI_MODEL_NAME,
    GEMINI_TIMEOUT_SECONDS,
)

if not GEMINI_ENABLED:
    print("Gemini is disabled. Set GEMINI_API_KEY to enable summaries and assistant responses.")


class GeminiTextResponse:
    def __init__(self, text):
        self.text = text


def get_gemini_model():
    if not GEMINI_ENABLED:
        return None
    return {"model": GEMINI_MODEL_NAME}


def generate_with_timeout(model, prompt, generation_config=None):
    if model is None:
        return None

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt,
                    }
                ]
            }
        ]
    }
    if generation_config:
        payload["generationConfig"] = generation_config

    response = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model['model']}:generateContent",
        params={"key": GEMINI_API_KEY},
        json=payload,
        timeout=GEMINI_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    data = response.json()
    text = ""
    for candidate in data.get("candidates", []):
        content = candidate.get("content") or {}
        for part in content.get("parts", []):
            part_text = part.get("text")
            if part_text:
                text += part_text

    return GeminiTextResponse(text)


def extract_keywords_gemini(user_query):
    model = get_gemini_model()
    if model is None:
        return user_query

    prompt = (
        "Extract the most relevant keywords for a NASA Earth science data search from the "
        f"following user request: '{user_query}'. Return only a short comma-separated list "
        "with 2 to 5 keywords."
    )
    try:
        response = generate_with_timeout(model, prompt)
        return response.text.strip() or user_query
    except Exception as exc:
        print(f"Gemini keyword extraction failed: {exc}")
        return user_query


def summarize_data_gemini(datasets):
    if not datasets:
        return None

    model = get_gemini_model()
    if model is None:
        return None

    dataset_text = "".join(
        f"Title: {dataset.get('title')}\nSummary: {dataset.get('summary')}\n\n"
        for dataset in datasets[:5]
    )
    prompt = f"""
    Summarize these NASA datasets:
    {dataset_text}

    Respond in JSON with:
    {{
      "layman_summary_points": ["point1", "point2"],
      "satellite_data_points": ["point1", "point2"]
    }}
    """
    try:
        response = generate_with_timeout(
            model,
            prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        cleaned = re.search(r"\{.*\}", response.text.strip(), re.DOTALL)
        if cleaned:
            return json.loads(cleaned.group(0))
    except Exception as exc:
        print(f"Gemini summarization failed: {exc}")

    return {
        "layman_summary_points": ["Summary unavailable."],
        "satellite_data_points": [],
    }


def fallback_chat_answer(user_query, datasets):
    if not datasets:
        return "I could not find matching datasets for that query."

    top_titles = ", ".join(dataset["title"] for dataset in datasets[:3])
    return (
        f"I found {len(datasets)} relevant datasets for '{user_query}'. "
        f"Top matches include: {top_titles}."
    )


def answer_with_datasets(user_query, datasets):
    model = get_gemini_model()
    if model is None:
        return fallback_chat_answer(user_query, datasets)

    context = "\n".join(
        f"{dataset['title']}: {dataset['summary']}" for dataset in datasets[:5]
    )
    prompt = (
        f"User asked: '{user_query}'.\n"
        "Use only the following NASA dataset context in your answer.\n"
        f"{context}\n"
        "Answer concisely, mention uncertainty when needed, and do not invent datasets."
    )
    try:
        response = generate_with_timeout(model, prompt)
        return response.text.strip()
    except Exception as exc:
        print(f"Gemini chat failed: {exc}")
        return fallback_chat_answer(user_query, datasets)
