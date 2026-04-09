# GeoScope Project Documentation

This document describes the current repository state. The older planning notes in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) are still useful for historical context, but this file reflects how the code works today.

## 1. What GeoScope Is

GeoScope is an Earth-data discovery app built around NASA CMR metadata. It combines:

- Live NASA CMR search
- A local ingested corpus stored as JSONL and SQLite
- Hybrid retrieval with BM25 and vector similarity
- Grounded Gemini-assisted explanations and research responses
- A React + Vite frontend with map, dataset, assistant, and comparison views

The core idea is simple: the app does not rely on a single search strategy. It can search NASA live, search locally, or merge both depending on corpus quality and query fit.

## 2. How The System Fits Together

1. A user searches from the frontend.
2. The frontend calls the Flask API in [backend/app.py](../backend/app.py).
3. The backend parses the query, checks the local corpus, and decides whether to use live CMR, local hybrid retrieval, or a merged result set.
4. Retrieved datasets are ranked using lexical, vector, metadata-quality, and filter-aware scoring.
5. Gemini is used for summaries, explanations, and grounded assistant answers when an API key is configured.
6. The frontend renders the result list, map markers, dataset detail page, similar-dataset suggestions, and assistant output.

The local corpus is optional at runtime, but most of the richer experience depends on it being ingested and indexed first.

## 3. Repository Map

| Path | Purpose |
| --- | --- |
| [README.md](../README.md) | Short project overview, quick start, screenshots, and deployment notes. |
| [docs/IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Historical roadmap and implementation notes. |
| [docs/PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) | Current detailed documentation. |
| [package.json](../package.json) | Legacy/shared npm manifest at the repo root. The active frontend app uses [frontend/package.json](../frontend/package.json). |
| [package-lock.json](../package-lock.json) | Lockfile for the legacy root npm manifest. |
| [backend/requirements.txt](../backend/requirements.txt) | Python dependencies for the Flask backend, retrieval pipeline, and Gemini integration. |
| [backend/.env.example](../backend/.env.example) | Sample backend environment file with the default local values. |
| [backend/render.yaml](../backend/render.yaml) | Render deployment config for the backend service. |
| [frontend/package.json](../frontend/package.json) | Active Vite/React app manifest and scripts. |
| [frontend/package-lock.json](../frontend/package-lock.json) | Lockfile for the active frontend npm manifest. |

Generated directories such as `node_modules`, `backend/data`, and `frontend/dist` are intentionally not committed.

## 4. Backend Documentation

### 4.1 Runtime And Configuration

| File | Role |
| --- | --- |
| [backend/app.py](../backend/app.py) | Flask entry point, API routes, search orchestration, fallback logic, and CORS setup. |
| [backend/config.py](../backend/config.py) | Environment loading, default paths, model names, hybrid weights, and named bounding boxes. |
| [backend/services/__init__.py](../backend/services/__init__.py) | Package marker for the backend services module. |
| [backend/render.yaml](../backend/render.yaml) | Render build/start commands and production env defaults. |

`backend/config.py` is the central place for runtime knobs. It defines:

- CMR endpoints and request headers
- Gemini settings and timeout behavior
- Local index paths
- Hybrid ranking weights
- Named regions used by the query parser

### 4.2 CMR And Metadata Handling

| File | Role |
| --- | --- |
| [backend/services/cmr_client.py](../backend/services/cmr_client.py) | NASA CMR HTTP client, collection normalization, coordinate extraction, and dataset lookup helpers. |
| [backend/services/query_parser.py](../backend/services/query_parser.py) | Natural-language parsing for year and named-region filters, plus search-parameter construction. |
| [backend/services/metadata_store.py](../backend/services/metadata_store.py) | Normalizes CMR metadata, writes JSONL snapshots, and rebuilds or loads SQLite records. |
| [backend/utils/geo.py](../backend/utils/geo.py) | Small geometry helpers used for bounding-box checks and coordinate validation. |

Important behavior:

- `cmr_client.py` sends `Client-Id`, `User-Agent`, and optional Earthdata bearer tokens to CMR.
- Collection coordinates are taken from boxes, polygons, or points when available.
- If a collection has no direct coordinates, the client tries a granule lookup for a representative location.
- `query_parser.py` removes years from search text, extracts named regions like `india` or `europe`, and converts them into CMR filters.
- `metadata_store.py` keeps the ingested corpus in both JSONL and SQLite so the search services can choose the best available source.

### 4.3 Retrieval And Ranking

| File | Role |
| --- | --- |
| [backend/services/lexical_search.py](../backend/services/lexical_search.py) | BM25-based lexical search over normalized records. |
| [backend/services/vector_search.py](../backend/services/vector_search.py) | FAISS-backed semantic search with sentence-transformers, plus TF-IDF+SVD fallback if embeddings fail. |
| [backend/services/ranker.py](../backend/services/ranker.py) | Combines lexical and vector results, applies metadata/filter scoring, and builds match reasons. |
| [backend/services/retriever.py](../backend/services/retriever.py) | High-level hybrid retrieval, local dataset lookup, and query suggestion generation. |
| [backend/services/hybrid_ranker.py](../backend/services/hybrid_ranker.py) | Thin compatibility wrapper around the hybrid retrieval path. |
| [backend/services/recommender.py](../backend/services/recommender.py) | Thin wrapper for similar-dataset recommendations. |

Key retrieval details:

- `lexical_search.py` weights fields differently when building search documents. Titles and short names count more than data-center names.
- `vector_search.py` persists FAISS, metadata, and optional encoder artifacts so the index can be reloaded quickly.
- `vector_search.py` falls back to TF-IDF and optional SVD if sentence-transformer embedding generation fails.
- `ranker.py` adds metadata quality and filter matches into the final score and records human-readable reasons.
- `retriever.py` merges lexical and vector result sets, and it also generates follow-up suggestions from science keywords and keywords.

The hybrid score is intentionally simple and explainable rather than opaque. It blends:

- BM25 relevance
- Vector similarity
- Metadata quality
- Year/region filter match

### 4.4 Gemini, Prompts, And Grounded Responses

| File | Role |
| --- | --- |
| [backend/services/gemini_service.py](../backend/services/gemini_service.py) | Direct Gemini REST calls, keyword extraction, dataset summaries, and fallback chat responses. |
| [backend/services/prompt_loader.py](../backend/services/prompt_loader.py) | Loads prompt templates from `backend/prompts`. |
| [backend/services/explainer.py](../backend/services/explainer.py) | Produces dataset explanations for a requested audience. |
| [backend/services/rag_service.py](../backend/services/rag_service.py) | Grounded assistant answers and dataset comparisons using retrieved local datasets. |
| [backend/prompts/research_assistant.txt](../backend/prompts/research_assistant.txt) | Prompt template for grounded assistant answers. |
| [backend/prompts/explain_dataset.txt](../backend/prompts/explain_dataset.txt) | Prompt template for dataset explanations. |
| [backend/prompts/similar_datasets.txt](../backend/prompts/similar_datasets.txt) | Prompt template for related-dataset explanations. Currently present but not wired into an active route. |

Important behavior:

- Gemini is optional. If `GEMINI_API_KEY` is missing, the backend returns deterministic fallbacks instead of failing startup.
- `explainer.py` and `rag_service.py` always ground their prompts in the retrieved local metadata.
- The assistant and comparison flows are intentionally citation-friendly and avoid inventing datasets or metadata.
- `similar_datasets.txt` is a useful template for future expansion, but the current similar-dataset endpoint uses vector similarity directly.

### 4.5 Scripts And Tests

| File | Role |
| --- | --- |
| [backend/scripts/ingest_cmr.py](../backend/scripts/ingest_cmr.py) | Downloads CMR collection pages, normalizes them, and writes the local JSONL corpus. |
| [backend/scripts/build_index.py](../backend/scripts/build_index.py) | Rebuilds SQLite and FAISS artifacts from the normalized corpus and refreshes the BM25 loader. |
| [backend/tests/test_api.py](../backend/tests/test_api.py) | Smoke tests for search and assistant endpoints. |
| [backend/tests/test_query_parser.py](../backend/tests/test_query_parser.py) | Unit tests for query parsing and search-parameter generation. |

Script workflow:

1. Run `ingest_cmr.py` to build `backend/data/collections.jsonl`.
2. Run `build_index.py` to populate SQLite and vector artifacts in `backend/data/indexes/`.
3. Start the backend or run the tests against the freshly indexed corpus.

### 4.6 API Reference

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health check and Gemini availability flag. |
| `GET` | `/api/search?q=...&mode=auto|live|hybrid` | Main search endpoint. `auto` can merge local and live results when local matches are weak. |
| `GET` | `/api/search/local?q=...` | BM25-only local search. |
| `GET` | `/api/search/hybrid?q=...` | Local lexical + vector hybrid search. |
| `GET` | `/api/dataset/<dataset_id>` | Dataset details from local corpus first, then live CMR fallback. |
| `GET` | `/api/datasets/<dataset_id>/similar?limit=...` | Vector-similarity recommendations for a local dataset. |
| `GET` | `/api/suggestions?q=...` | Follow-up query suggestions derived from retrieved datasets. |
| `POST` | `/api/explain` | Grounded dataset explanation for a local dataset. |
| `POST` | `/api/assistant` | Grounded assistant answer built from retrieved local datasets. |
| `POST` | `/api/compare` | Compare up to three local datasets. |
| `POST` | `/api/admin/reindex` | Rebuild local indexes from the JSONL corpus. |
| `GET` or `POST` | `/search` | Older Gemini keyword-extraction CMR search path kept for compatibility. |
| `POST` | `/chat` and `/api/chat` | Compatibility alias for the assistant answer flow. |

Common response metadata from `/api/search`:

- `source`
- `localCorpusSize`
- `vectorBackend`
- `fallbackReason`
- `warning`
- `searchConfidence`
- `summary`
- `results`

## 5. Data, Indexes, And Generated Artifacts

The local corpus lives under `backend/data/` by default. These files are generated and ignored by Git:

| Artifact | Created By | Used By |
| --- | --- | --- |
| `backend/data/collections.jsonl` | `backend/scripts/ingest_cmr.py` | `metadata_store.py`, BM25, and vector search loaders. |
| `backend/data/indexes/metadata.db` | `backend/scripts/build_index.py` or `metadata_store.rebuild_sqlite()` | Local dataset lookups and fast record loading. |
| `backend/data/indexes/vectors.faiss` | `backend/services/vector_search.py` | Vector search and similarity queries. |
| `backend/data/indexes/vectors_meta.json` | `backend/services/vector_search.py` | Metadata about the FAISS index and record order. |
| `backend/data/indexes/vectors_encoder.joblib` | `backend/services/vector_search.py` when using TF-IDF fallback | Re-encoding fallback queries. |
| `backend/data/indexes/index_manifest.json` | `backend/scripts/build_index.py` | Human-readable snapshot of the current index build. |

Recommended refresh order:

1. Re-ingest the corpus if the source CMR scope changed.
2. Rebuild the indexes.
3. Restart the backend so the cached loaders see the new artifacts.

## 6. Frontend Documentation

### 6.1 Runtime And Routes

| File | Role |
| --- | --- |
| [frontend/src/main.jsx](../frontend/src/main.jsx) | React root, `BrowserRouter`, and app bootstrap. |
| [frontend/src/App.jsx](../frontend/src/App.jsx) | Route shell for home, search, and dataset pages. |
| [frontend/src/api/client.js](../frontend/src/api/client.js) | Centralized backend API client used by the UI. |
| [frontend/src/index.css](../frontend/src/index.css) | Global Vite-era base styles. |
| [frontend/src/App.css](../frontend/src/App.css) | App-specific page styling for the current route shell. |

Routes currently exposed by the app:

- `/` -> Home page
- `/map` -> Search workspace
- `/dataset/:id` -> Dataset detail page

### 6.2 Active Pages And Components

| File | Role |
| --- | --- |
| [frontend/src/pages/HomePage.jsx](../frontend/src/pages/HomePage.jsx) | Landing page with a Spline background, animated typed subtitle, and a call-to-action button. |
| [frontend/src/pages/SearchPage.jsx](../frontend/src/pages/SearchPage.jsx) | Main discovery workspace with search, query interpretation, filters, results, map, street view, and assistant panel. |
| [frontend/src/pages/DatasetPage.jsx](../frontend/src/pages/DatasetPage.jsx) | Small wrapper that renders the dataset detail component. |
| [frontend/src/components/DatasetPage.jsx](../frontend/src/components/DatasetPage.jsx) | Full dataset detail view with explanation, similar datasets, and comparison controls. |
| [frontend/src/components/SearchBar.jsx](../frontend/src/components/SearchBar.jsx) | Search input and recent-search chips. |
| [frontend/src/components/FilterPanel.jsx](../frontend/src/components/FilterPanel.jsx) | Shows search confidence, source metadata, warnings, and follow-up suggestions. |
| [frontend/src/components/QueryInterpretationCard.jsx](../frontend/src/components/QueryInterpretationCard.jsx) | Displays how the backend interpreted the user query. |
| [frontend/src/components/ResultsList.jsx](../frontend/src/components/ResultsList.jsx) | Lists recommended datasets and highlights match reasons. |
| [frontend/src/components/MatchReasonBadge.jsx](../frontend/src/components/MatchReasonBadge.jsx) | Small badge used to label scoring reasons. |
| [frontend/src/components/AssistantPanel.jsx](../frontend/src/components/AssistantPanel.jsx) | Lets the user ask a grounded follow-up question. |
| [frontend/src/components/SimilarDatasetsPanel.jsx](../frontend/src/components/SimilarDatasetsPanel.jsx) | Displays vector-similar datasets and lets the user choose compare targets. |
| [frontend/src/components/DatasetComparePanel.jsx](../frontend/src/components/DatasetComparePanel.jsx) | Calls the compare endpoint for up to three datasets. |

Important frontend behavior:

- `SearchPage.jsx` stores recent searches in `localStorage` under `geoscope-recent-searches`.
- The map uses Leaflet with Esri imagery and labels.
- Only results with valid coordinates are shown as markers.
- The street-view experience opens a Google Maps panorama in a new tab because embedded street view is unreliable in many browsers.
- `DatasetPage.jsx` loads from route state first, then falls back to the backend dataset endpoint.
- `DatasetPage.jsx` requests both a grounded explanation and similar-dataset recommendations, and it shows scoped error messages if the dataset is not in the local corpus.

### 6.3 Legacy, Compatibility, And Experimental UI

| File | Status | Notes |
| --- | --- | --- |
| [frontend/src/components/MapPage.jsx](../frontend/src/components/MapPage.jsx) | Compatibility wrapper | Re-exports the current search page and retains the older map-page implementation in comments. |
| [frontend/src/components/ResultCard.jsx](../frontend/src/components/ResultCard.jsx) | Legacy | Old lightweight result card kept for reference. |
| [frontend/src/components/Header.jsx](../frontend/src/components/Header.jsx) | Legacy | Simple header component that is not wired into the current routes. |
| [frontend/src/components/MapBox.jsx](../frontend/src/components/MapBox.jsx) | Legacy | Standalone Leaflet bounding-box helper from the earlier UI. |
| [frontend/src/components/Background3D.jsx](../frontend/src/components/Background3D.jsx) | Legacy | Full-screen Spline background helper. |
| [frontend/src/components/SpaceParticles.jsx](../frontend/src/components/SpaceParticles.jsx) | Legacy | Full-screen Spline background/particle iframe helper. |
| [frontend/src/components/chatbot.jsx](../frontend/src/components/chatbot.jsx) | Legacy | Self-contained mock chatbot that uses local keyword matching, not the backend assistant API. |
| [frontend/src/components/chatbot.css](../frontend/src/components/chatbot.css) | Legacy | Styles for the mock chatbot. |
| [frontend/src/components/Header.css](../frontend/src/components/Header.css) | Legacy | Styles for the old header component. |
| [frontend/src/components/datavisualization.jsx](../frontend/src/components/datavisualization.jsx) | Experimental / incomplete | References `@/components/ui/*` and other modules that are not present in this repo snapshot, so it is not part of the active build. |
| [frontend/src/components/datavisualization.css](../frontend/src/components/datavisualization.css) | Experimental / incomplete | Companion styles for the experimental data-visualization shell. |
| [frontend/src/assets/react.svg](../frontend/src/assets/react.svg) | Starter asset | Default Vite/React logo asset, not part of the GeoScope product UI. |
| [frontend/public/vite.svg](../frontend/public/vite.svg) | Starter asset | Default Vite public asset. |
| [frontend/public/images/location.png](../frontend/public/images/location.png) | Unused static asset | Present in the repo snapshot, but not referenced by the active UI. |

### 6.4 Frontend API Surface

`frontend/src/api/client.js` exports the backend calls used by the app:

- `searchDatasets(query, mode)`
- `fetchDataset(datasetId)`
- `fetchDatasetExplanation(datasetId, audience)`
- `fetchSimilarDatasets(datasetId, limit)`
- `fetchSuggestions(query, limit)`
- `askAssistant(query)`
- `compareDatasets(datasetIds)`

All calls use `VITE_API_BASE` if set, otherwise they default to `http://localhost:5001`.

## 7. Environment Variables

### Backend

| Variable | Purpose | Default / Notes |
| --- | --- | --- |
| `PORT` | Backend listen port. | Defaults to `5001` in development. |
| `ALLOWED_ORIGINS` | CORS allow-list. | `*` enables all origins. |
| `USER_AGENT` | CMR request header. | Defaults to `GeoScope/1.0 (contact@example.com)`. |
| `CMR_CLIENT_ID` | CMR request header. | Defaults to `GeoScope`. |
| `EARTHDATA_TOKEN` | Optional bearer token for restricted Earthdata access. | Empty by default. |
| `GEMINI_API_KEY` | Enables Gemini-backed summaries and assistant responses. | If missing, Gemini is disabled. |
| `API_KEY` | Alternate Gemini key env name accepted by the code. | Used only if `GEMINI_API_KEY` is absent. |
| `GEMINI_MODEL` | Gemini model name. | Defaults to `gemini-2.5-flash`. |
| `GEMINI_TIMEOUT_SECONDS` | Gemini request timeout. | Defaults to `20`. |
| `EMBEDDING_MODEL` | Sentence-transformers model for vector search. | Defaults to `all-MiniLM-L6-v2`. |
| `VECTOR_INDEX_PATH` | FAISS index file path. | Defaults to `backend/data/indexes/vectors.faiss`. |
| `VECTOR_META_PATH` | Vector index metadata path. | Defaults to `backend/data/indexes/vectors_meta.json`. |
| `VECTOR_ENCODER_PATH` | TF-IDF fallback encoder path. | Defaults to `backend/data/indexes/vectors_encoder.joblib`. |
| `METADATA_DB_PATH` | SQLite metadata database path. | Defaults to `backend/data/indexes/metadata.db`. |
| `INDEX_MANIFEST_PATH` | Build manifest path. | Defaults to `backend/data/indexes/index_manifest.json`. |
| `RAG_TOP_K` | Number of datasets passed into grounded assistant flows. | Defaults to `5`. |
| `HYBRID_BM25_WEIGHT` | BM25 contribution to hybrid score. | Defaults to `0.45`. |
| `HYBRID_VECTOR_WEIGHT` | Vector contribution to hybrid score. | Defaults to `0.40`. |
| `HYBRID_METADATA_WEIGHT` | Metadata quality contribution. | Defaults to `0.10`. |
| `HYBRID_FILTER_WEIGHT` | Year/region filter contribution. | Defaults to `0.05`. |

### Frontend

| Variable | Purpose | Default / Notes |
| --- | --- | --- |
| `VITE_API_BASE` | Backend base URL for the React app. | Defaults to `http://localhost:5001`. |

## 8. Setup And Run

The active setup flow is:

1. Install Python dependencies with `pip install -r backend/requirements.txt`.
2. Install frontend dependencies inside `frontend/` with `npm install`.
3. Create `backend/.env` by copying `backend/.env.example` or by using the backend variables listed above.
4. Ingest data with `python backend/scripts/ingest_cmr.py --page-size 100 --max-pages 2`.
5. Build indexes with `python backend/scripts/build_index.py --force`.
6. Start the backend with `python backend/app.py` from the `backend/` directory.
7. Start the frontend with `npm run dev` from `frontend/`.

Useful verification commands:

- `python -m unittest backend/tests/test_query_parser.py`
- `python -m unittest backend/tests/test_api.py`

## 9. Deployment Notes

- Backend deployment is configured for Render through [backend/render.yaml](../backend/render.yaml).
- The current Render config installs Python requirements and starts `gunicorn app:app -b 0.0.0.0:$PORT`.
- Frontend deployment is intended for Vercel or another static hosting service, with `VITE_API_BASE` pointing at the backend URL.

## 10. Current Caveats

- The repo contains a few legacy UI files that are no longer wired into the active route tree.
- `frontend/src/components/datavisualization.jsx` appears incomplete in this snapshot because it references missing local modules.
- The root `package.json` exists, but the active app workflow is driven by `frontend/package.json`.
- Generated corpus and index artifacts are ignored by Git, so a fresh clone will need ingestion and indexing before local hybrid search works.
