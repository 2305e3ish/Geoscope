import { useLocation, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import {
  fetchDataset as getDataset,
  fetchDatasetExplanation,
  fetchSimilarDatasets as getSimilarDatasets,
} from "../api/client";
import DatasetComparePanel from "./DatasetComparePanel";
import SimilarDatasetsPanel from "./SimilarDatasetsPanel";

export default function DatasetPage() {
  const { id } = useParams();
  const location = useLocation();
  const initialDataset = location.state?.dataset || location.state || null;
  const [dataset, setDataset] = useState(initialDataset);
  const [loading, setLoading] = useState(!initialDataset);
  const [error, setError] = useState(null);
  const [audience, setAudience] = useState("general");
  const [explanation, setExplanation] = useState(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationError, setExplanationError] = useState(null);
  const [similarDatasets, setSimilarDatasets] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState(null);
  const [compareIds, setCompareIds] = useState(() => (id ? [id] : []));

  useEffect(() => {
    if (initialDataset?.id === id) {
      setDataset(initialDataset);
      setLoading(false);
      return;
    }

    const loadDataset = async () => {
      try {
        const data = await getDataset(id);
        setDataset(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadDataset();
  }, [id, initialDataset]);

  useEffect(() => {
    const loadExplanation = async () => {
      if (!id) return;

      setExplanationLoading(true);
      setExplanationError(null);
      try {
        const data = await fetchDatasetExplanation(id, audience);
        setExplanation(data);
      } catch (err) {
        if (err?.response?.status === 404) {
          setExplanation(null);
          setExplanationError("Explanation is only available for datasets in the local GeoScope corpus.");
        } else {
          setExplanationError("Could not generate a grounded explanation right now.");
        }
      } finally {
        setExplanationLoading(false);
      }
    };

    loadExplanation();
  }, [audience, id]);

  useEffect(() => {
    const loadSimilarDatasets = async () => {
      if (!id) return;

      setSimilarLoading(true);
      setSimilarError(null);
      try {
        const data = await getSimilarDatasets(id, 5);
        setSimilarDatasets(data?.results || []);
      } catch (err) {
        if (err?.response?.status === 404) {
          setSimilarDatasets([]);
          setSimilarError("Similar-dataset recommendations are only available for locally ingested datasets.");
        } else {
          setSimilarError("Could not load similar datasets right now.");
        }
      } finally {
        setSimilarLoading(false);
      }
    };

    loadSimilarDatasets();
  }, [id]);

  useEffect(() => {
    setCompareIds((previous) => {
      const next = previous.filter(Boolean);
      if (id && !next.includes(id)) {
        return [id, ...next].slice(0, 3);
      }
      return next.slice(0, 3);
    });
  }, [id]);

  const toggleCompareId = (datasetId) => {
    setCompareIds((previous) => {
      if (previous.includes(datasetId)) {
        return previous.filter((item) => item !== datasetId);
      }
      return [...previous, datasetId].slice(0, 3);
    });
  };

  const metadataQuality = explanation?.dataset?.metadataQuality || dataset?.metadataQuality;

  if (loading) return <div style={{ padding: "2rem", color: "#e5eefc", background: "#08111f", minHeight: "100vh" }}>Loading dataset...</div>;
  if (error) return <div style={{ padding: "2rem", color: "#fca5a5", background: "#08111f", minHeight: "100vh" }}>Error: {error}</div>;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #08111f 0%, #0f172a 100%)",
        color: "#e5eefc",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <section
          style={{
            padding: "1.5rem",
            borderRadius: "16px",
            background: "rgba(15, 23, 42, 0.88)",
            border: "1px solid rgba(148, 163, 184, 0.22)",
            boxShadow: "0 24px 60px rgba(2, 6, 23, 0.35)",
          }}
        >
          <h1 style={{ marginTop: 0, marginBottom: "1rem", color: "#f8fafc" }}>
            {dataset?.title || "Dataset Details"}
          </h1>
          <p style={{ marginTop: 0, color: "#cbd5e1", lineHeight: 1.7 }}>
            {dataset?.summary || "No summary available."}
          </p>
          {dataset?.dataCenter && (
            <p style={{ color: "#dbeafe" }}>
              <strong>Data Center:</strong> {dataset.dataCenter}
            </p>
          )}
          {dataset?.timeStart && (
            <p style={{ color: "#dbeafe" }}>
              <strong>Coverage:</strong> {dataset.timeStart}
              {dataset?.timeEnd ? ` to ${dataset.timeEnd}` : ""}
            </p>
          )}
          {metadataQuality && (
            <p style={{ color: "#dbeafe" }}>
              <strong>Metadata quality:</strong>{" "}
              Summary {metadataQuality.hasSummary ? "yes" : "no"} | Spatial {metadataQuality.hasSpatial ? "yes" : "no"} | Keywords{" "}
              {metadataQuality.keywordCount || 0} | Science keywords {metadataQuality.scienceKeywordCount || 0}
            </p>
          )}
          {dataset?.link && (
            <a
              href={dataset.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                marginTop: "0.75rem",
                color: "#7dd3fc",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              View Dataset
            </a>
          )}
        </section>

        <section
          style={{
            marginTop: "2rem",
            padding: "1.25rem",
            borderRadius: "12px",
            background: "rgba(15, 23, 42, 0.82)",
            border: "1px solid rgba(148, 163, 184, 0.22)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ margin: 0, color: "#f8fafc" }}>Grounded Explanation</h2>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#dbeafe" }}>
              Audience
              <select
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                style={{
                  background: "#0f172a",
                  color: "#e2e8f0",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  padding: "0.45rem 0.6rem",
                }}
              >
                <option value="general">General</option>
                <option value="student">Student</option>
                <option value="researcher">Researcher</option>
              </select>
            </label>
          </div>

          {explanationLoading && <p style={{ color: "#cbd5e1" }}>Generating explanation...</p>}
          {explanationError && <p style={{ color: "#fca5a5" }}>{explanationError}</p>}
          {!explanationLoading && !explanationError && explanation?.explanation && (
            <>
              <p style={{ whiteSpace: "pre-wrap", color: "#dbeafe", lineHeight: 1.7 }}>
                {explanation.explanation}
              </p>
              <p style={{ fontSize: "0.9rem", color: "#94a3b8" }}>
                Source: {explanation.source}
              </p>
            </>
          )}
        </section>

        <SimilarDatasetsPanel
          datasets={similarDatasets}
          loading={similarLoading}
          error={similarError}
          selectedIds={compareIds}
          onToggleSelect={toggleCompareId}
        />

        <DatasetComparePanel datasetIds={compareIds} />
      </div>
    </div>
  );
}
