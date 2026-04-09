# GeoScope

> Earth Data Intelligence with hybrid retrieval, local indexing, and grounded assistance over NASA CMR metadata.

## Repo Structure

```
backend/    # Flask API for NASA CMR
frontend/   # React + Vite app
README.md   # Project info (setup, run, deploy)
```

## Quick Start

1. Install backend dependencies

```bash
pip install -r backend/requirements.txt
```

2. Create `backend/.env`

```bash
Copy-Item backend\.env.example backend\.env
```

Fill in at least:

```env
GEMINI_API_KEY=your_key_here
CMR_CLIENT_ID=GeoScope
```

3. Ingest local metadata

```bash
python backend/scripts/ingest_cmr.py --page-size 100 --max-pages 2
```

4. Build the SQLite + BM25 + FAISS indexes

```bash
python backend/scripts/build_index.py --force
```

5. Run backend in a new terminal

```bash
cd backend
python app.py
```

Backend runs at `http://localhost:5001`

6. Run frontend in another terminal

```bash
cd frontend
npm install
npm run dev
```

Frontend Vite usually opens at `http://localhost:5173`

7. Open the website

- Home page: `http://localhost:5173`
- Search workspace: `http://localhost:5173/map`

## Implementation Roadmap

The detailed backend/frontend roadmap for the RAG + hybrid retrieval version of GeoScope lives in [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).

For a current, file-by-file guide to the codebase, see [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md).

## Frontend Environment

Create `frontend/.env` if needed:

```env
VITE_API_BASE=http://localhost:5001
```

## API Highlights

```text
GET  /api/search?q=antarctica&mode=auto
GET  /api/search/local?q=antarctica
GET  /api/search/hybrid?q=antarctica
GET  /api/dataset/<dataset_id>
GET  /api/datasets/<dataset_id>/similar?limit=5
GET  /api/suggestions?q=antarctica
POST /api/explain
POST /api/assistant
POST /api/compare
POST /api/admin/reindex
```

## Team Workflow
- Use feature branches: `feat/frontend-ui`, `feat/backend-api`, `feat/map-visualization`, `feat/integration`
- All merges via Pull Requests to `main`
- Auto-deploy: Render (backend), Vercel (frontend)

## Deployment
- Backend: Render (see `backend/render.yaml`)
- Frontend: Vercel (set `VITE_API_BASE` to backend URL)

---
## Our Contributors
- [@Mer315](https://github.com/Mer315) : Backend, API Integration, UI/UX
- [@ish64](https://github.com/2305e3ish) : API Integration, Github version control
- [@SnikithaD2](https://github.com/SnikithaD2) : Frontend, UI/UX, developed voice assistant
- [@Praneetha167](https://github.com/Praneetha167) : Frontend, developed chatbot

---
## Screenshots
- Landing page
![WhatsApp Image 2025-08-28 at 18 38 52_9ea97f44](https://github.com/user-attachments/assets/56bae783-e8d5-4069-8f01-22244f02428e)
- Map interface
![WhatsApp Image 2025-08-28 at 18 39 37_785e42d4](https://github.com/user-attachments/assets/2480dfeb-d2b7-4190-a346-3d4f4306310b)
- Searching and recommending
![WhatsApp Image 2025-08-28 at 18 41 10_6c88125f](https://github.com/user-attachments/assets/647b8ec1-ff35-4979-afa0-7058a88adac3)
![WhatsApp Image 2025-08-28 at 18 41 52_97391807](https://github.com/user-attachments/assets/d1564cdb-1cda-4c27-9109-2ff9596b9ae7)
- Voice agent
![WhatsApp Image 2025-08-28 at 18 46 18_6840fe48](https://github.com/user-attachments/assets/f14db128-45b8-4003-8f15-b22f9438ac5d)
![WhatsApp Image 2025-08-28 at 18 45 46_9ccb05ec](https://github.com/user-attachments/assets/69f5c349-fb28-4459-94de-1653db7f5751)
- Data visualisation and bias score (work in progress)
