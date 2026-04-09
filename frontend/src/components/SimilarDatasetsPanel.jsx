export default function SimilarDatasetsPanel({
  datasets = [],
  loading,
  error,
  selectedIds = [],
  onToggleSelect,
}) {
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
      <h2 style={{ marginTop: 0, color: "#f8fafc" }}>Similar Datasets</h2>
      {loading && <p style={{ color: "#cbd5e1" }}>Finding related datasets...</p>}
      {error && <p style={{ color: "#fca5a5" }}>{error}</p>}
      {!loading && !error && datasets.length === 0 && <p style={{ color: "#cbd5e1" }}>No similar datasets available yet.</p>}
      {!loading && !error && datasets.length > 0 && (
        <div style={{ display: "grid", gap: "1rem" }}>
          {datasets.map((item) => (
            <div
              key={item.id}
              style={{
                padding: "1rem",
                borderRadius: "10px",
                background: "#111827",
                border: "1px solid #334155",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <h3 style={{ marginTop: 0, color: "#f8fafc" }}>{item.title}</h3>
                {onToggleSelect && (
                  <label style={{ whiteSpace: "nowrap", color: "#dbeafe" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => onToggleSelect(item.id)}
                    />{" "}
                    Compare
                  </label>
                )}
              </div>
              <p style={{ marginBottom: "0.5rem", color: "#cbd5e1" }}>{item.summary || "No summary available."}</p>
              <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem", color: "#94a3b8" }}>
                Similarity score: {item.vectorScore}
              </p>
              {item.sharedTerms?.length > 0 && (
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#94a3b8" }}>
                  Shared terms: {item.sharedTerms.join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
