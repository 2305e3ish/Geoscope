
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";

const customIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [40, 40],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

function MapPage() {
  const [showStreetView, setShowStreetView] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";

  const defaultCenter = [20, 0];
  const defaultZoom = 2;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setSelected(null);
    setSummary(null);
    try {
      const { data } = await axios.get(`${API_BASE}/api/search`, { params: { q: search } });
      setResults(data?.results || []);
      setSummary(data?.summary || null);
      setSelected((data?.results && data.results.length > 0) ? data.results[0] : null);
    } catch {
      setError("An error occurred. Please try a different query.");
      setResults([]);
      setSelected(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      {/* Left panel */}
      <div style={{
        width: "350px",
        background: "#1a1a1a",
        color: "#fff",
        padding: "2rem",
        boxSizing: "border-box",
        overflowY: "auto",
        position: "relative"
      }}>
        {/* Logo line */}
        <div style={{ marginBottom: "1rem" }}>
          <span
            style={{
              fontFamily: "'Russo One', sans-serif",
              fontSize: "2rem",
              color: "#fff",
              letterSpacing: "2px",
              display: "block"
            }}
          >
            GEOSCOPE.ai
          </span>
        </div>
        {/* Search bar line with back arrow */}
        <form onSubmit={handleSearch} style={{ display: "flex", alignItems: "center", width: "80%", marginBottom: "2rem" }}>
          <span
            style={{
              cursor: "pointer",
              marginRight: "0.5rem",
              fontSize: "1.5rem",
              color: "#fff",
              display: "flex",
              alignItems: "center"
            }}
            onClick={() => navigate("/")}
            title="Go Back"
          >
            ←
          </span>
          <input
            type="text"
            placeholder="Search disaster info..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "none",
              fontSize: "1rem",
              background: "#333",
              color: "#ffffffff"
            }}
          />
        </form>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>Disaster Information</h2>
        {loading && <div style={{padding: '1rem', backgroundColor: '#333', borderRadius: '6px', textAlign: 'center', margin: '18px 0'}}>Loading...</div>}
        {error && <div style={{ color: '#ff6b6b', marginBottom: '12px', padding: '1rem', backgroundColor: '#333', borderRadius: '6px', textAlign: 'center' }}>{error}</div>}
        
        {/* Layman's Summary Points (Bulleted) */}
        {summary?.layman_summary_points && summary.layman_summary_points.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: '#aaa' }}>Key Findings</h3>
            <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
              {summary.layman_summary_points.map((point, i) => (
                <li key={i} style={{ marginBottom: '0.5rem' }}>{point}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Satellite Data Points (Bulleted) */}
        {summary?.satellite_data_points && summary.satellite_data_points.length > 0 && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid #444', paddingTop: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: '#aaa' }}>Satellite Data Points</h3>
            <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
              {summary.satellite_data_points.map((point, i) => (
                <li key={i} style={{ marginBottom: '0.5rem' }}>{point}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Datasets in Clickable Boxes */}
        {results.length > 0 && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid #444', paddingTop: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: '#aaa' }}>Recommended Datasets</h3>
            {results.map((r, i) => (
              <div
                key={r.id || i}
                onClick={() => navigate(`/dataset/${r.id}`, { state: r })}
                style={{ 
                  background: selected?.id === r.id ? '#444' : '#222', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  marginBottom: '1rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease-in-out'
                }}
              >
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>{r.title || r.id}</h4>
                <p style={{ fontSize: '0.9rem', color: '#ccc', margin: 0 }}>
                  {r.summary ? r.summary.substring(0, 100) + '...' : 'No summary available.'}
                </p>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/dataset/${r.id}`, { state: r });
                  }}
                  style={{
                    marginTop: '0.9rem',
                    background: 'linear-gradient(135deg, #00bcd4, #22c55e)',
                    border: 'none',
                    color: '#06111f',
                    borderRadius: '999px',
                    padding: '0.65rem 1rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Open full dataset
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Map panel */}
      <div style={{ flex: 1, position: "relative" }}>
        <MapContainer
          center={selected && selected.latitude && selected.longitude ? [selected.latitude, selected.longitude] : defaultCenter}
          zoom={selected && selected.latitude && selected.longitude ? 6 : defaultZoom}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
          />
          <TileLayer
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution="Labels © Esri"
          />
          {results.map((r, i) => (
            (r.latitude && r.longitude) ? (
              <Marker key={r.id || i} position={[r.latitude, r.longitude]} icon={customIcon} eventHandlers={{ click: () => setSelected(r) }}>
                <Popup>
                  <h3 style={{ marginBottom: "0.5rem", fontSize: '1rem' }}>{r.title || r.name || r.id}</h3>
                {(r.timeStart || r.date) && <p style={{margin: '0', fontSize: '0.8rem'}}><strong>Date:</strong> {r.timeStart || r.date}</p>}
                  {r.latitude && <p style={{margin: '0', fontSize: '0.8rem'}}><strong>Latitude:</strong> {r.latitude}<br /><strong>Longitude:</strong> {r.longitude}</p>}
                  {r.link && <p style={{margin: '0.5rem 0 0 0', fontSize: '0.9rem'}}><a href={r.link} target="_blank" rel="noopener noreferrer">More Info</a></p>}
                  <button
                    style={{background:"#e8e7e7", marginTop:"0.5rem", border:"1px solid #ccc", borderRadius:"4px", padding:"6px 12px", cursor:"pointer", color:"#222"}}
                    onClick={() => navigate(`/dataset/${r.id}`, { state: r })}
                  >
                    Open Visualization
                  </button>
                </Popup>
              </Marker>
            ) : null
          ))}
        </MapContainer>
        {showStreetView && selected && selected.latitude && selected.longitude && (
          <div style={{
            position: "absolute",
            top: "10%",
            left: "10%",
            width: "80%",
            height: "80%",
            background: "#1a1a1a",
            zIndex: 1000,
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 0 20px rgba(0,0,0,0.7)",
            color: "#fff"
          }}>
            <button
              style={{
                position: "absolute",
                top: 15,
                right: 15,
                zIndex: 1001,
                background: "#333",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "8px 16px",
                cursor: "pointer",
                transition: 'background 0.2s ease-in-out'
              }}
              onClick={() => setShowStreetView(false)}
            >
              Close
            </button>
            <div style={{ padding: "1.5rem" }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{selected.title || selected.name || selected.id}</h2>
                {(selected.timeStart || selected.date) && <p style={{margin: '0', fontSize: '0.9rem'}}><strong>Date:</strong> {selected.timeStart || selected.date}</p>}
              {selected.latitude && <p style={{margin: '0', fontSize: '0.9rem'}}><strong>Latitude:</strong> {selected.latitude}<br /><strong>Longitude:</strong> {selected.longitude}</p>}
            </div>
            <iframe
              title="Google Street View"
              width="100%"
              height="70%"
              frameBorder="0"
              style={{ border: 0 }}
              src={`https://maps.google.com/maps?q=&layer=c&cbll=${selected.latitude},${selected.longitude}&cbp=11,10.15,,0,-6.35`}
              allowFullScreen
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default MapPage;
