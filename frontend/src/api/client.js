import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";

const api = axios.create({
  baseURL: API_BASE,
});

export async function searchDatasets(query, mode = "auto") {
  const { data } = await api.get("/api/search", { params: { q: query, mode } });
  return data;
}

export async function fetchDataset(datasetId) {
  const { data } = await api.get(`/api/dataset/${datasetId}`);
  return data;
}

export async function fetchDatasetExplanation(datasetId, audience) {
  const { data } = await api.post("/api/explain", { datasetId, audience });
  return data;
}

export async function fetchSimilarDatasets(datasetId, limit = 5) {
  const { data } = await api.get(`/api/datasets/${datasetId}/similar`, {
    params: { limit },
  });
  return data;
}

export async function fetchSuggestions(query, limit = 5) {
  const { data } = await api.get("/api/suggestions", {
    params: { q: query, limit },
  });
  return data;
}

export async function askAssistant(query) {
  const { data } = await api.post("/api/assistant", { query });
  return data;
}

export async function compareDatasets(datasetIds) {
  const { data } = await api.post("/api/compare", { datasetIds });
  return data;
}
