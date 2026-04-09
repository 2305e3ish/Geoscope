function Chip({ label }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.25rem 0.55rem",
        borderRadius: "999px",
        background: "#3f3f46",
        color: "#fafafa",
        fontSize: "0.75rem",
        marginRight: "0.45rem",
        marginBottom: "0.45rem",
      }}
    >
      {label}
    </span>
  );
}

export default function QueryInterpretationCard({ query }) {
  if (!query?.raw) {
    return null;
  }

  return (
    <section
      style={{
        marginBottom: "1rem",
        padding: "0.9rem",
        background: "#202024",
        borderRadius: "10px",
      }}
    >
      <div style={{ fontSize: "0.8rem", color: "#a1a1aa", marginBottom: "0.5rem" }}>
        Query interpretation
      </div>
      <div style={{ fontSize: "0.95rem", marginBottom: "0.6rem" }}>{query.raw}</div>
      <div>
        {query.keyword && <Chip label={`keyword: ${query.keyword}`} />}
        {query.year && <Chip label={`year: ${query.year}`} />}
        {query.region && <Chip label={`region: ${query.region}`} />}
      </div>
    </section>
  );
}
