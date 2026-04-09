import MatchReasonBadge from "./MatchReasonBadge";

export default function ResultsList({ results = [], selectedId, onSelect, onOpenDataset }) {
  if (!results.length) {
    return <p style={{ color: "#a1a1aa" }}>No datasets yet. Try a search query.</p>;
  }

  return (
    <div style={{ marginTop: "1rem", borderTop: "1px solid #3f3f46", paddingTop: "1rem" }}>
      <h3 style={{ fontSize: "1.05rem", marginBottom: "0.75rem", color: "#d4d4d8" }}>
        Recommended Datasets
      </h3>
      {results.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelect?.(item)}
          style={{
            background: selectedId === item.id ? "#3f3f46" : "#18181b",
            padding: "1rem",
            borderRadius: "10px",
            marginBottom: "0.9rem",
            cursor: "pointer",
            border: "1px solid #27272a",
          }}
        >
          <h4 style={{ margin: "0 0 0.45rem 0", fontSize: "1rem" }}>{item.title || item.id}</h4>
          <p style={{ fontSize: "0.88rem", color: "#d4d4d8", margin: "0 0 0.55rem 0" }}>
            {item.summary ? `${item.summary.substring(0, 130)}...` : "No summary available."}
          </p>
          {item.matchReasons?.length > 0 && (
            <div style={{ marginBottom: "0.45rem" }}>
              {item.matchReasons.map((reason) => (
                <MatchReasonBadge key={`${item.id}-${reason}`} text={reason} />
              ))}
            </div>
          )}
          {item.matchedTerms?.length > 0 && (
            <p style={{ fontSize: "0.8rem", color: "#93c5fd", margin: "0 0 0.6rem 0" }}>
              Matched terms: {item.matchedTerms.join(", ")}
            </p>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenDataset?.(item);
            }}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "0.45rem 0.8rem",
              cursor: "pointer",
            }}
          >
            Open dataset
          </button>
        </div>
      ))}
    </div>
  );
}
