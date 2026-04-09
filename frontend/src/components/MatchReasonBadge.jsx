export default function MatchReasonBadge({ text }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.25rem 0.55rem",
        borderRadius: "999px",
        background: "#16324f",
        color: "#c7e3ff",
        fontSize: "0.75rem",
        marginRight: "0.4rem",
        marginBottom: "0.4rem",
      }}
    >
      {text}
    </span>
  );
}
