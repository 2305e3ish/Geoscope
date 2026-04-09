export default function FilterPanel({
  searchSource,
  fallbackReason,
  vectorBackend,
  warning,
  searchConfidence,
  suggestions = [],
  onSuggestionClick,
}) {
  const hasMeta = searchSource || fallbackReason || vectorBackend || warning || searchConfidence;
  if (!hasMeta && suggestions.length === 0) {
    return null;
  }

  return (
    <section
      style={{
        marginBottom: "1rem",
        padding: "0.85rem",
        background: "#202024",
        borderRadius: "10px",
      }}
    >
      {hasMeta && (
        <div style={{ fontSize: "0.9rem", marginBottom: suggestions.length > 0 ? "0.75rem" : 0 }}>
          {searchSource && (
            <div>
              <strong>Search source:</strong> {searchSource}
            </div>
          )}
          {searchConfidence && (
            <div>
              <strong>Confidence:</strong> {searchConfidence}
            </div>
          )}
          {vectorBackend && (
            <div>
              <strong>Vector backend:</strong> {vectorBackend}
            </div>
          )}
          {fallbackReason && (
            <div>
              <strong>Fallback:</strong> {fallbackReason}
            </div>
          )}
          {warning && (
            <div style={{ marginTop: "0.45rem", color: "#fbbf24" }}>
              <strong>Note:</strong> {warning}
            </div>
          )}
        </div>
      )}

      {suggestions.length > 0 && (
        <div>
          <div style={{ fontSize: "0.85rem", marginBottom: "0.45rem", color: "#a1a1aa" }}>
            Follow-up suggestions
          </div>
          <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.text}
                type="button"
                onClick={() => onSuggestionClick?.(suggestion.text)}
                style={{
                  border: "1px solid #334155",
                  background: "#0f172a",
                  color: "#bfdbfe",
                  borderRadius: "999px",
                  padding: "0.35rem 0.7rem",
                  cursor: "pointer",
                  fontSize: "0.78rem",
                }}
              >
                {suggestion.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
