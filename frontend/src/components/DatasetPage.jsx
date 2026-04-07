import { useLocation, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export default function DatasetPage() {
  const { id } = useParams();
  const location = useLocation();
  const [dataset, setDataset] = useState(location.state || null);
  const [loading, setLoading] = useState(!location.state);
  const [error, setError] = useState(null);
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";

  useEffect(() => {
    if (location.state && location.state.id === id) {
      setDataset(location.state);
      setLoading(false);
      return;
    }

    const fetchDataset = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/dataset/${id}`);
        setDataset(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDataset();
  }, [API_BASE, id, location.state]);

  if (loading) return <div>Loading dataset...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>{dataset?.title || "Dataset Details"}</h1>
      <p>{dataset?.summary || "No summary available."}</p>
      {dataset?.link && (
        <a href={dataset.link} target="_blank" rel="noopener noreferrer">
          View Dataset
        </a>
      )}
    </div>
  );
}
