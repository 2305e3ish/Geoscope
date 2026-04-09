import { useState } from "react";

import { compareDatasets } from "../api/client";

export default function DatasetComparePanel({ datasetIds = [] }) {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCompare = async () => {
    if (datasetIds.length < 2) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await compareDatasets(datasetIds);
      setComparison(data);
    } catch {
      setError("Could not compare those datasets right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      style={{
        marginTop: "2rem",
        padding: "1.25rem",
        borderRadius: "12px",
        background: "rgba(15, 23, 42, 0.82)",
        border: "1px solid rgba(148, 163, 184, 0.22)",
        color: "#e5eefc",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, color: "#f8fafc" }}>Dataset Compare</h2>
          <p style={{ margin: "0.4rem 0 0 0", color: "#94a3b8" }}>
            Select up to 3 local datasets to compare.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCompare}
          disabled={datasetIds.length < 2 || loading}
          style={{
            padding: "0.65rem 0.95rem",
            borderRadius: "8px",
            border: "none",
            background: datasetIds.length < 2 ? "#94a3b8" : "#0f766e",
            color: "#fff",
            cursor: datasetIds.length < 2 ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Comparing..." : "Compare selected"}
        </button>
      </div>

      {datasetIds.length > 0 && (
        <p style={{ fontSize: "0.9rem", color: "#94a3b8" }}>Selected: {datasetIds.join(", ")}</p>
      )}
      {error && <p style={{ color: "#fca5a5" }}>{error}</p>}
      {comparison?.comparison && (
        <p style={{ whiteSpace: "pre-wrap", color: "#dbeafe", lineHeight: 1.7 }}>{comparison.comparison}</p>
      )}
    </section>
  );
}
