import os
from flask import Flask, jsonify, request
from flask_cors import CORS

from config import ALLOWED_ORIGINS, GEMINI_ENABLED
from services.cmr_client import fetch_dataset_by_id, search_nasa_cmr
from services.gemini_service import (
    extract_keywords_gemini,
    summarize_data_gemini,
)
from services.hybrid_ranker import hybrid_search
from services.lexical_search import local_lexical_search
from services.metadata_store import load_jsonl, rebuild_sqlite
from services.query_parser import build_search_params, informative_query_terms, parse_query
from services.rag_service import assistant_answer, compare_datasets
from services.recommender import get_similar_datasets
from services.retriever import get_local_dataset, suggest_queries
from services.vector_search import local_vector_search
from services.explainer import explain_dataset

app = Flask(__name__)

if ALLOWED_ORIGINS in {"", "*"}:
    CORS(app)
else:
    origins = [origin.strip() for origin in ALLOWED_ORIGINS.split(",") if origin.strip()]
    CORS(app, resources={r"/api/*": {"origins": origins}})


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "geminiEnabled": GEMINI_ENABLED})


def run_live_search(query_params):
    return search_nasa_cmr(
        keywords=query_params.get("keyword"),
        page_size=query_params.get("page_size", 10),
        temporal=query_params.get("temporal"),
        bounding_box=query_params.get("bounding_box"),
    )


def run_local_search(query, year=None, region=None, limit=10):
    return hybrid_search(query, year=year, region=region, limit=limit)


def merge_search_results(live_results, local_results, limit=10):
    local_by_id = {
        result.get("id"): result for result in local_results if result.get("id")
    }
    merged = []
    seen = set()

    for live_result in live_results:
        result_id = live_result.get("id")
        local_result = local_by_id.get(result_id)
        if local_result is not None:
            merged_result = {
                **live_result,
                "score": local_result.get("score"),
                "lexicalScore": local_result.get("lexicalScore"),
                "vectorScore": local_result.get("vectorScore"),
                "metadataQualityScore": local_result.get("metadataQualityScore"),
                "matchedTerms": local_result.get("matchedTerms", []),
                "matchedFilters": local_result.get("matchedFilters", []),
                "matchReasons": local_result.get("matchReasons", []),
                "hybridBreakdown": local_result.get("hybridBreakdown"),
                "retrievalSources": ["live_cmr", *local_result.get("retrievalSources", [])],
            }
        else:
            merged_result = {**live_result, "retrievalSources": ["live_cmr"]}
        merged.append(merged_result)
        if result_id:
            seen.add(result_id)
        if len(merged) >= limit:
            return merged

    for local_result in local_results:
        result_id = local_result.get("id")
        if result_id in seen:
            continue
        merged.append(
            {
                **local_result,
                "retrievalSources": sorted(
                    set(["local_hybrid", *local_result.get("retrievalSources", [])])
                ),
            }
        )
        if len(merged) >= limit:
            break

    return merged


def should_fallback_to_live(query, results):
    if not results:
        return True, "no_local_results"

    query_terms = informative_query_terms(query)
    if not query_terms:
        return False, None

    top_result = results[0]
    matched_terms = {str(term).lower() for term in (top_result.get("matchedTerms") or [])}
    matched_count = len(matched_terms.intersection(query_terms))
    coverage = matched_count / len(query_terms)
    top_score = float(top_result.get("score") or 0.0)

    if matched_count == 0:
        return True, "weak_local_match"
    if coverage < 0.4 and top_score < 0.8:
        return True, "weak_local_match"
    return False, None


@app.get("/api/search")
def search():
    query = request.args.get("q", "").strip()
    mode = request.args.get("mode", "auto").strip().lower()
    if mode not in {"auto", "live", "hybrid"}:
        return jsonify({"error": "mode must be one of: auto, live, hybrid"}), 400

    if not query:
        return jsonify({"error": "missing q"}), 400

    search_text, year, region = parse_query(query)
    params = build_search_params(search_text, year, region, page_size=10)
    local_corpus_size = local_lexical_search.corpus_size()
    source = "live_cmr"
    fallback_reason = None
    warning = None
    search_confidence = "high"

    if mode == "live":
        results = run_live_search(params)
    elif local_corpus_size > 0:
        results = run_local_search(search_text, year=year, region=region, limit=params.get("page_size", 10))
        source = "local_hybrid"

        if mode == "auto":
            should_fallback, fallback_reason = should_fallback_to_live(search_text, results)
            if should_fallback:
                try:
                    live_results = search_nasa_cmr(
                        keywords=params.get("keyword"),
                        page_size=params.get("page_size", 10),
                        temporal=params.get("temporal"),
                        bounding_box=params.get("bounding_box"),
                        timeout=8,
                    )
                    if live_results:
                        results = merge_search_results(
                            live_results,
                            results,
                            limit=params.get("page_size", 10),
                        )
                        source = "merged_live_local"
                        warning = "Local matches were weak, so GeoScope merged in live CMR results."
                        search_confidence = "medium"
                    else:
                        source = "local_hybrid_fallback"
                        warning = "Live CMR returned no results, so GeoScope is showing best-effort matches from the local index."
                        search_confidence = "low"
                        fallback_reason = f"{fallback_reason}_live_empty"
                except Exception:
                    source = "local_hybrid_fallback"
                    warning = "Live CMR was unavailable, so GeoScope is showing best-effort matches from the local index."
                    search_confidence = "low"
                    fallback_reason = f"{fallback_reason}_live_unavailable"
            else:
                search_confidence = "high"
    else:
        results = run_live_search(params)
        source = "live_cmr_fallback"
        fallback_reason = "empty_local_corpus"

    summary = summarize_data_gemini(results)

    return jsonify(
        {
            "query": {
                "raw": query,
                "keyword": search_text,
                "year": year,
                "region": region,
                "params_sent": params,
                "mode": mode,
            },
            "source": source,
            "localCorpusSize": local_corpus_size,
            "vectorBackend": (
                local_vector_search.get_backend()
                if source.startswith("local") or source == "merged_live_local"
                else None
            ),
            "fallbackReason": fallback_reason,
            "warning": warning,
            "searchConfidence": search_confidence,
            "results": results,
            "summary": summary,
        }
    )


@app.get("/api/search/local")
def local_search():
    query = request.args.get("q", "").strip()
    limit = min(max(request.args.get("limit", default=10, type=int), 1), 50)

    if not query:
        return jsonify({"error": "missing q"}), 400

    results = local_lexical_search.search(query, limit=limit)
    return jsonify(
        {
            "query": query,
            "limit": limit,
            "source": "local_lexical",
            "corpusSize": local_lexical_search.corpus_size(),
            "results": results,
        }
    )


@app.get("/api/search/hybrid")
def local_hybrid_search():
    query = request.args.get("q", "").strip()
    limit = min(max(request.args.get("limit", default=10, type=int), 1), 50)
    search_text, year, region = parse_query(query)

    if not query:
        return jsonify({"error": "missing q"}), 400

    results = hybrid_search(search_text, year=year, region=region, limit=limit)
    return jsonify(
        {
            "query": query,
            "searchText": search_text,
            "limit": limit,
            "source": "local_hybrid",
            "corpusSize": local_lexical_search.corpus_size(),
            "vectorCorpusSize": local_vector_search.corpus_size(),
            "vectorBackend": local_vector_search.get_backend(),
            "results": results,
        }
    )


@app.get("/api/dataset/<dataset_id>")
def dataset_details(dataset_id):
    dataset = get_local_dataset(dataset_id)
    source = "local_corpus"
    if dataset is None:
        dataset = fetch_dataset_by_id(dataset_id)
        source = "live_cmr"
    if dataset is None:
        return jsonify({"error": "Dataset not found"}), 404
    return jsonify({**dataset, "source": source})


@app.get("/api/datasets/<dataset_id>/similar")
def similar_datasets(dataset_id):
    limit = min(max(request.args.get("limit", default=5, type=int), 1), 20)
    dataset, results = get_similar_datasets(dataset_id, limit=limit)
    if dataset is None:
        return jsonify({"error": "Dataset not found in local corpus"}), 404

    return jsonify(
        {
            "dataset": dataset,
            "limit": limit,
            "source": "local_vector_similarity",
            "results": results,
        }
    )


@app.post("/api/explain")
def explain():
    payload = request.get_json(silent=True) or {}
    dataset_id = (payload.get("datasetId") or "").strip()
    audience = (payload.get("audience") or "general").strip().lower()

    if not dataset_id:
        return jsonify({"error": "datasetId is required"}), 400

    explanation = explain_dataset(dataset_id, audience=audience)
    if explanation is None:
        return jsonify({"error": "Dataset not found in local corpus"}), 404

    return jsonify(explanation)


@app.get("/api/suggestions")
def suggestions():
    query = request.args.get("q", "").strip()
    limit = min(max(request.args.get("limit", default=5, type=int), 1), 10)
    if not query:
        return jsonify({"error": "missing q"}), 400

    return jsonify(
        {
            "query": query,
            "results": suggest_queries(query, limit=limit),
        }
    )


@app.post("/api/assistant")
def assistant():
    payload = request.get_json(silent=True) or {}
    user_query = (payload.get("query") or "").strip()
    if not user_query:
        return jsonify({"error": "Query is required."}), 400

    _, year, region = parse_query(user_query)
    response = assistant_answer(user_query, year=year, region=region)
    return jsonify(
        {
            **response,
            "query": {
                "raw": user_query,
                "year": year,
                "region": region,
            },
        }
    )


@app.post("/api/compare")
def compare():
    payload = request.get_json(silent=True) or {}
    dataset_ids = payload.get("datasetIds") or []
    dataset_ids = [str(dataset_id).strip() for dataset_id in dataset_ids if str(dataset_id).strip()]
    if len(dataset_ids) < 2:
        return jsonify({"error": "Provide at least two datasetIds."}), 400

    comparison = compare_datasets(dataset_ids[:3])
    if comparison is None:
        return jsonify({"error": "Could not load enough datasets from the local corpus."}), 404
    return jsonify(comparison)


@app.post("/api/admin/reindex")
def admin_reindex():
    records = load_jsonl()
    if not records:
        return jsonify({"error": "No local metadata corpus found. Run ingestion first."}), 400

    rebuild_sqlite(records)
    build_info = local_vector_search.build(force=True)
    local_lexical_search.load(force=True)
    return jsonify(
        {
            "status": "ok",
            "records": len(records),
            "vector": build_info,
        }
    )


@app.route("/search", methods=["GET", "POST"])
def gemini_search():
    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        user_query = payload.get("query", "").strip()
    else:
        user_query = request.args.get("query", "").strip()

    if not user_query:
        return jsonify({"error": "Query is required."}), 400

    try:
        keywords = extract_keywords_gemini(user_query)
        datasets = search_nasa_cmr(keywords=keywords)
        return jsonify(
            {
                "originalQuery": user_query,
                "extractedKeywords": keywords,
                "datasets": datasets,
            }
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/chat", methods=["POST"])
@app.route("/api/chat", methods=["POST"])
def chat_assistant():
    payload = request.get_json(silent=True) or {}
    user_query = payload.get("query", "").strip()
    if not user_query:
        return jsonify({"error": "Query is required."}), 400

    _, year, region = parse_query(user_query)
    response = assistant_answer(user_query, year=year, region=region)
    return jsonify(response)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5001)), debug=True)
