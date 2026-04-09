import { useState } from "react";

import { askAssistant } from "../api/client";

export default function AssistantPanel({ initialQuery = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAsk = async () => {
    if (!query.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await askAssistant(query);
      setResponse(data);
    } catch {
      setError("Could not get a grounded assistant answer right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      style={{
        marginTop: "1.25rem",
        padding: "1rem",
        background: "#202024",
        borderRadius: "10px",
      }}
    >
      <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Research Assistant</h3>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask a grounded question about the results"
          style={{
            flex: 1,
            padding: "0.65rem 0.8rem",
            borderRadius: "8px",
            border: "1px solid #3f3f46",
            background: "#111827",
            color: "#fff",
          }}
        />
        <button
          type="button"
          onClick={handleAsk}
          disabled={loading}
          style={{
            padding: "0.65rem 0.9rem",
            borderRadius: "8px",
            border: "none",
            background: "#0891b2",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {loading ? "Asking..." : "Ask"}
        </button>
      </div>

      {error && <p>{error}</p>}
      {response?.answer && (
        <>
          <p style={{ whiteSpace: "pre-wrap", color: "#e4e4e7" }}>{response.answer}</p>
          {response.citations?.length > 0 && (
            <div style={{ marginTop: "0.75rem" }}>
              <div style={{ fontSize: "0.8rem", color: "#a1a1aa", marginBottom: "0.35rem" }}>
                Grounded datasets
              </div>
              {response.citations.map((citation) => (
                <div key={citation.id} style={{ fontSize: "0.82rem", marginBottom: "0.3rem" }}>
                  {citation.title} ({citation.id})
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
