export default function SearchBar({
  value,
  onChange,
  onSubmit,
  onGoHome,
  recentSearches = [],
  onRecentClick,
}) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <form
        onSubmit={onSubmit}
        style={{ display: "flex", alignItems: "center", width: "100%", marginBottom: "0.9rem" }}
      >
        <button
          type="button"
          onClick={onGoHome}
          style={{
            cursor: "pointer",
            marginRight: "0.5rem",
            fontSize: "1.2rem",
            color: "#fff",
            background: "transparent",
            border: "none",
          }}
          title="Go Back"
        >
          &larr;
        </button>
        <input
          type="text"
          placeholder="Search Earth data..."
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={{
            width: "100%",
            padding: "0.7rem 1rem",
            borderRadius: "8px",
            border: "1px solid #3f3f46",
            fontSize: "1rem",
            background: "#27272a",
            color: "#fff",
          }}
        />
      </form>

      {recentSearches.length > 0 && (
        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
          {recentSearches.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onRecentClick(item)}
              style={{
                border: "1px solid #3f3f46",
                background: "#18181b",
                color: "#d4d4d8",
                borderRadius: "999px",
                padding: "0.35rem 0.7rem",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
