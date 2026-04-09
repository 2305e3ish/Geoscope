# GeoScope Implementation Plan

## Implementation Status Snapshot

Last updated: 2026-04-07

This document is now partly historical. The codebase has moved past the original baseline described below.

### Overall Status

- Core MVP is implemented.
- Hybrid retrieval is implemented with BM25, sentence-transformers, and FAISS.
- Local metadata ingestion and index-building are implemented.
- Grounded explanation, assistant, similar-dataset, compare, and suggestion APIs are implemented.
- Frontend search, dataset details, assistant, comparison, suggestions, and metadata-quality views are implemented.

### Implemented Backend Files

- `backend/config.py`
- `backend/services/cmr_client.py`
- `backend/services/query_parser.py`
- `backend/services/metadata_store.py`
- `backend/services/lexical_search.py`
- `backend/services/vector_search.py`
- `backend/services/retriever.py`
- `backend/services/ranker.py`
- `backend/services/rag_service.py`
- `backend/services/recommender.py`
- `backend/services/explainer.py`
- `backend/services/gemini_service.py`
- `backend/utils/geo.py`
- `backend/scripts/ingest_cmr.py`
- `backend/scripts/build_index.py`

### Implemented API Surface

- `GET /api/health`
- `GET /api/search`
- `GET /api/search/local`
- `GET /api/search/hybrid`
- `GET /api/dataset/<dataset_id>`
- `GET /api/datasets/<dataset_id>/similar`
- `GET /api/suggestions`
- `POST /api/explain`
- `POST /api/assistant`
- `POST /api/compare`
- `POST /api/admin/reindex`

### Implemented Frontend Structure

- `frontend/src/api/client.js`
- `frontend/src/pages/HomePage.jsx`
- `frontend/src/pages/SearchPage.jsx`
- `frontend/src/pages/DatasetPage.jsx`
- `frontend/src/components/SearchBar.jsx`
- `frontend/src/components/FilterPanel.jsx`
- `frontend/src/components/ResultsList.jsx`
- `frontend/src/components/AssistantPanel.jsx`
- `frontend/src/components/DatasetComparePanel.jsx`
- `frontend/src/components/SimilarDatasetsPanel.jsx`
- `frontend/src/components/QueryInterpretationCard.jsx`
- `frontend/src/components/MatchReasonBadge.jsx`

### Remaining Work

- Final deployment verification on the actual hosting target
- Optional prompt-file expansion and more tests
- Optional removal of older compatibility files that are no longer routed directly

### Important Naming Notes

- The original draft mentioned `normalizer.py`; the current code uses `backend/services/metadata_store.py`.
- The original draft mentioned `bm25_index.py` and `vector_index.py`; the current code uses `backend/services/lexical_search.py` and `backend/services/vector_search.py`.
- The original draft described a “vector-style TF-IDF” baseline; the current code has moved to sentence-transformers plus FAISS.

### Gemini Runtime Note

- The direct Gemini API path is valid and responds with the configured API key.
- Backend generation now uses a direct REST call with a hard timeout and fallback behavior.
- If a deployment environment blocks outbound Gemini traffic, explanations and assistant answers fall back cleanly instead of hanging.

### How To Run

1. Install backend dependencies.
2. Install frontend dependencies.
3. Create `backend/.env` from `backend/.env.example`.
4. Ensure `frontend/.env` contains `VITE_API_BASE=http://localhost:5001`.
5. Ingest metadata and build indexes.
6. Start the backend on port `5001`.
7. Start the frontend and open the Vite URL, usually `http://localhost:5173`.

### Historical Draft

The sections below are the original planning draft. They remain useful for project rationale, but the implementation status above is the source of truth for the current repository.

## Product Goal
GeoScope should evolve from a direct NASA API search demo into a reusable Earth-data intelligence platform with:

- Reliable dataset retrieval
- Hybrid ranking over incomplete metadata
- Grounded RAG explanations and recommendations
- A frontend that supports discovery, learning, and research workflows

## Current Repo Baseline

### Backend
- Flask API in `backend/app.py`
- Live CMR search only
- Gemini-assisted keyword extraction and summaries
- No local metadata index yet
- No retrieval/ranking pipeline yet

### Frontend
- React + Vite app in `frontend/`
- Search + map UI
- Dataset detail route
- No comparison, recommendation, or grounded assistant workflow yet

## Environment Variables

### Backend
- `PORT`
- `ALLOWED_ORIGINS`
- `USER_AGENT`
- `CMR_CLIENT_ID`
- `EARTHDATA_TOKEN`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`

### Frontend
- `VITE_API_BASE`

## External Services and Keys

### Required now
- Google Gemini API key for summaries and grounded assistant responses
- CMR client identifier for request headers

### Optional now
- Earthdata Login bearer token for authenticated or restricted datasets

### Not required
- `api.nasa.gov` API key is not used for public CMR metadata search

## Phase Plan

### Phase 1: Stabilize the Current App
Goal:
- Make the existing Flask + React flow correct and production-safe

Backend tasks:
- Send `Client-Id` and `User-Agent` headers to CMR
- Support optional Earthdata bearer token
- Rename Gemini env handling to `GEMINI_API_KEY`
- Stop backend startup from failing when Gemini is not configured
- Apply year and region filters to actual CMR search results
- Add `GET /api/dataset/<id>`
- Remove fake map coordinates

Frontend tasks:
- Use route state for dataset detail page when available
- Fallback to backend dataset detail endpoint
- Fix zero-coordinate handling on the map
- Add a working street-view action from map results

Files:
- `backend/app.py`
- `backend/.env.example`
- `backend/render.yaml`
- `frontend/src/components/MapPage.jsx`
- `frontend/src/components/DatasetPage.jsx`

### Phase 2: Refactor Backend into Services
Goal:
- Break the monolithic backend into reusable modules

Planned files:
- `backend/config.py`
- `backend/services/cmr_client.py`
- `backend/services/query_parser.py`
- `backend/services/normalizer.py`
- `backend/services/retriever.py`
- `backend/services/ranker.py`
- `backend/services/rag_service.py`
- `backend/services/recommender.py`
- `backend/utils/geo.py`

Outputs:
- Cleaner backend structure
- Easier testing
- Easier experimentation with ranking and RAG

### Phase 3: Local Metadata Ingestion
Goal:
- Build a local corpus instead of searching only through live pass-through calls

Tasks:
- Pull metadata from NASA CMR
- Normalize metadata fields
- Store metadata locally in SQLite or JSONL
- Track:
  - title
  - summary
  - keywords
  - science keywords
  - spatial metadata
  - temporal metadata
  - instruments
  - platforms
  - concept ids
  - links

Planned files:
- `backend/scripts/ingest_cmr.py`
- `backend/data/collections.jsonl`
- `backend/data/metadata.db`

Current status:
- `backend/scripts/ingest_cmr.py` added
- `backend/services/metadata_store.py` added
- `backend/data/` initialized for local metadata snapshots

### Phase 4: Hybrid Retrieval
Goal:
- Replace raw API ordering with retrieval optimized for weak metadata

Retrieval components:
- BM25 or lexical search
- Embedding similarity search
- Metadata-aware match scoring

Suggested stack:
- `rank-bm25` or `whoosh`
- `sentence-transformers`
- `faiss-cpu`
- `numpy`

Scoring idea:
- lexical score
- semantic score
- filter match score
- metadata completeness score

Planned files:
- `backend/services/bm25_index.py`
- `backend/services/vector_index.py`
- `backend/services/hybrid_ranker.py`

Current status:
- A lexical baseline is now available through `backend/services/lexical_search.py`
- Local metadata search is exposed at `GET /api/search/local`
- Results include `score`, `lexicalScore`, `qualityBoost`, and `matchedTerms`
- A vector-style TF-IDF retrieval baseline is available through `backend/services/vector_search.py`
- Hybrid ranking is available through `backend/services/hybrid_ranker.py`
- Hybrid local search is exposed at `GET /api/search/hybrid`

### Phase 5: Grounded RAG
Goal:
- Use RAG only after retrieval, not as the search engine itself

RAG uses:
- Explain a dataset
- Explain why a result matched
- Suggest related datasets
- Answer grounded research questions from retrieved results

RAG guardrails:
- never invent dataset ids
- only answer from retrieved datasets
- return cited dataset titles or ids with the answer

Planned files:
- `backend/services/rag_service.py`
- `backend/prompts/explain_dataset.txt`
- `backend/prompts/research_assistant.txt`
- `backend/prompts/similar_datasets.txt`

### Phase 6: Frontend Experience Upgrade
Goal:
- Turn the UI into a usable Earth-data discovery workspace

Core pages:
- Home page
- Search page
- Dataset details page
- Compare datasets page
- Assistant panel

Planned frontend files:
- `frontend/src/api/client.js`
- `frontend/src/pages/SearchPage.jsx`
- `frontend/src/pages/DatasetPage.jsx`
- `frontend/src/components/SearchBar.jsx`
- `frontend/src/components/FilterPanel.jsx`
- `frontend/src/components/ResultsList.jsx`
- `frontend/src/components/SimilarDatasetsPanel.jsx`
- `frontend/src/components/DatasetComparePanel.jsx`
- `frontend/src/components/AssistantPanel.jsx`
- `frontend/src/components/QueryInterpretationCard.jsx`

## Feature Roadmap

### Core Features
- Natural-language search over NASA Earth datasets
- Region and year-aware filtering
- Dataset detail page
- Map + list exploration
- Similar dataset recommendations
- Grounded dataset summaries

### Research Assistant Features
- Research question to dataset mapping
- Why-this-result explanations
- Compare datasets by coverage and source
- Related dataset suggestions
- Grounded assistant answers using retrieved datasets

### Education Features
- Beginner-friendly dataset explanation mode
- Suggested datasets by topic
- Learning-oriented summaries
- Preview of coverage and use cases

## API Roadmap

### Implemented or Started
- `GET /api/health`
- `GET /api/search`
- `GET /api/dataset/<id>`
- `POST /api/chat`

### Next API Endpoints
- `GET /api/datasets/<id>/similar`
- `POST /api/explain`
- `POST /api/assistant`
- `POST /api/compare`
- `GET /api/suggestions`

Current status:
- `GET /api/datasets/<id>/similar` is available using local vector similarity
- `POST /api/explain` is available using cached metadata plus Gemini or a safe fallback

## Requirements to Add Later

### Backend
- `sentence-transformers`
- `faiss-cpu`
- `rank-bm25`
- `numpy`
- `scikit-learn`

### Frontend
- optional `react-markdown`
- optional `zustand`

## Evaluation Plan
- Compare CMR raw retrieval vs hybrid retrieval
- Track precision at k
- Track MRR
- Measure grounded answer usefulness manually
- Test incomplete metadata cases
- Test natural-language query robustness

## Immediate Next Steps
1. Refactor `backend/app.py` into service modules.
2. Add local ingestion script for CMR metadata.
3. Build a lexical baseline index.
4. Add vector retrieval.
5. Implement hybrid ranking.
6. Add grounded explanation and similar-dataset endpoints.

## Local Ingestion Usage

Example:

```bash
python backend/scripts/ingest_cmr.py --page-size 100 --max-pages 2
```

Filtered example:

```bash
python backend/scripts/ingest_cmr.py --keyword flood --provider CDDIS --page-size 50 --max-pages 1
```

## Local Lexical Search Usage

After ingesting metadata into `backend/data/collections.jsonl`, query the local lexical baseline:

```bash
GET /api/search/local?q=flood+india&limit=10
```

Example response fields:
- `source`
- `corpusSize`
- `results[].score`
- `results[].lexicalScore`
- `results[].qualityBoost`
- `results[].matchedTerms`

## Hybrid Search Usage

Once metadata has been ingested, query the hybrid local baseline:

```text
GET /api/search/hybrid?q=antarctica&limit=10
```

Example response fields:
- `source`
- `corpusSize`
- `vectorCorpusSize`
- `results[].score`
- `results[].lexicalScore`
- `results[].vectorScore`
- `results[].hybridBreakdown`
- `results[].retrievalSources`

## Similar Dataset Usage

```text
GET /api/datasets/<dataset_id>/similar?limit=5
```

Returns:
- the source dataset from the local corpus
- locally similar datasets
- `vectorScore`
- `sharedTerms`

## Grounded Explanation Usage

```text
POST /api/explain
{
  "datasetId": "C1214305813-AU_AADC",
  "audience": "student"
}
```

Returns:
- the cached dataset metadata
- grounded explanation text
- explanation source: `gemini` or `fallback`
