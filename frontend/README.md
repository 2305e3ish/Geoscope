# GeoScope Frontend

React + Vite frontend for GeoScope.

For the full repository guide, including backend services, data flow, and deployment details, see [../docs/PROJECT_DOCUMENTATION.md](../docs/PROJECT_DOCUMENTATION.md).

## Features

- Hybrid dataset search UI
- Query interpretation and suggestions
- Map + list result exploration
- Grounded assistant panel
- Dataset explanation, similarity, and compare views

## Environment

Create `frontend/.env` if needed:

```bash
VITE_API_BASE=http://localhost:5001
```

## Run

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

Useful routes:

- `/` for the landing page
- `/map` for the search workspace

## Build

```bash
npm run build
```
