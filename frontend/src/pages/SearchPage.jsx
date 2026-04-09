import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import { fetchSuggestions, searchDatasets } from "../api/client";
import AssistantPanel from "../components/AssistantPanel";
import FilterPanel from "../components/FilterPanel";
import QueryInterpretationCard from "../components/QueryInterpretationCard";
import ResultsList from "../components/ResultsList";
import SearchBar from "../components/SearchBar";

const customIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [40, 40],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function hasCoordinates(item) {
  return Number.isFinite(item?.latitude) && Number.isFinite(item?.longitude);
}

function MapViewportUpdater({ selected, defaultCenter, defaultZoom }) {
  const map = useMap();

  useEffect(() => {
    if (hasCoordinates(selected)) {
      map.setView([selected.latitude, selected.longitude], 6);
      return;
    }
    map.setView(defaultCenter, defaultZoom);
  }, [defaultCenter, defaultZoom, map, selected]);

  return null;
}

function readRecentSearches() {
  try {
    return JSON.parse(window.localStorage.getItem("geoscope-recent-searches") || "[]");
  } catch {
    return [];
  }
}

function buildStreetViewUrl(item) {
  if (!hasCoordinates(item)) {
    return null;
  }
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${item.latitude},${item.longitude}`;
}

function buildMapPreviewUrl(item) {
  if (!hasCoordinates(item)) {
    return null;
  }
  return `https://www.google.com/maps?q=${item.latitude},${item.longitude}&z=15&output=embed`;
}

export default function SearchPage() {
  const [showStreetView, setShowStreetView] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState(null);
  const [queryInfo, setQueryInfo] = useState(null);
  const [searchSource, setSearchSource] = useState(null);
  const [vectorBackend, setVectorBackend] = useState(null);
  const [fallbackReason, setFallbackReason] = useState(null);
  const [warning, setWarning] = useState(null);
  const [searchConfidence, setSearchConfidence] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState(() => readRecentSearches());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const defaultCenter = [20, 0];
  const defaultZoom = 2;

  const persistRecentSearch = (value) => {
    const next = [value, ...recentSearches.filter((item) => item !== value)].slice(0, 8);
    setRecentSearches(next);
    window.localStorage.setItem("geoscope-recent-searches", JSON.stringify(next));
  };

  const openDataset = (dataset) => {
    navigate(`/dataset/${dataset.id}`, { state: { dataset } });
  };

  const openStreetViewInNewTab = () => {
    const streetViewUrl = buildStreetViewUrl(selected);
    if (!streetViewUrl) {
      return;
    }
    window.open(streetViewUrl, "_blank", "noopener,noreferrer");
  };

  const loadSuggestions = async (queryText) => {
    try {
      const data = await fetchSuggestions(queryText, 5);
      setSuggestions(data?.results || []);
    } catch {
      setSuggestions([]);
    }
  };

  const handleSearch = async (event, nextQuery = search) => {
    if (event) {
      event.preventDefault();
    }
    if (!nextQuery.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setSelected(null);
    setSummary(null);
    setQueryInfo(null);
    setSearchSource(null);
    setVectorBackend(null);
    setFallbackReason(null);
    setWarning(null);
    setSearchConfidence(null);

    try {
      const data = await searchDatasets(nextQuery, "auto");
      setResults(data?.results || []);
      setSelected(data?.results?.[0] || null);
      setSummary(data?.summary || null);
      setQueryInfo(data?.query || null);
      setSearchSource(data?.source || null);
      setVectorBackend(data?.vectorBackend || null);
      setFallbackReason(data?.fallbackReason || null);
      setWarning(data?.warning || null);
      setSearchConfidence(data?.searchConfidence || null);
      setSearch(nextQuery);
      persistRecentSearch(nextQuery);
      loadSuggestions(nextQuery);
    } catch {
      setError("An error occurred. Please try a different query.");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      <div
        style={{
          width: "390px",
          background: "#111827",
          color: "#fff",
          padding: "1.5rem",
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <div style={{ marginBottom: "0.8rem" }}>
          <span
            style={{
              fontFamily: "'Russo One', sans-serif",
              fontSize: "1.9rem",
              color: "#fff",
              letterSpacing: "2px",
              display: "block",
            }}
          >
            GeoScope
          </span>
          <span style={{ color: "#93c5fd", fontSize: "0.9rem" }}>Earth Data Intelligence</span>
        </div>

        <SearchBar
          value={search}
          onChange={setSearch}
          onSubmit={handleSearch}
          onGoHome={() => navigate("/")}
          recentSearches={recentSearches}
          onRecentClick={(value) => handleSearch(null, value)}
        />

        <QueryInterpretationCard query={queryInfo} />
        <FilterPanel
          searchSource={searchSource}
          fallbackReason={fallbackReason}
          vectorBackend={vectorBackend}
          warning={warning}
          searchConfidence={searchConfidence}
          suggestions={suggestions}
          onSuggestionClick={(value) => handleSearch(null, value)}
        />

        <h2
          style={{
            fontSize: "1.3rem",
            marginBottom: "0.9rem",
            borderBottom: "1px solid #374151",
            paddingBottom: "0.6rem",
          }}
        >
          Discovery
        </h2>

        {loading && (
          <div
            style={{
              padding: "1rem",
              backgroundColor: "#1f2937",
              borderRadius: "8px",
              textAlign: "center",
              margin: "18px 0",
            }}
          >
            Loading...
          </div>
        )}
        {error && (
          <div
            style={{
              color: "#fca5a5",
              marginBottom: "12px",
              padding: "1rem",
              backgroundColor: "#1f2937",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {summary?.layman_summary_points?.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "0.6rem", color: "#cbd5e1" }}>
              Key Findings
            </h3>
            <ul style={{ listStyleType: "disc", paddingLeft: "20px", margin: 0 }}>
              {summary.layman_summary_points.map((point, index) => (
                <li key={index} style={{ marginBottom: "0.5rem" }}>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary?.satellite_data_points?.length > 0 && (
          <div style={{ marginTop: "1rem", borderTop: "1px solid #374151", paddingTop: "1rem" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "0.6rem", color: "#cbd5e1" }}>
              Satellite Data Points
            </h3>
            <ul style={{ listStyleType: "disc", paddingLeft: "20px", margin: 0 }}>
              {summary.satellite_data_points.map((point, index) => (
                <li key={index} style={{ marginBottom: "0.5rem" }}>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        <ResultsList
          results={results}
          selectedId={selected?.id}
          onSelect={setSelected}
          onOpenDataset={openDataset}
        />

        <AssistantPanel initialQuery={search} />
      </div>

      <div style={{ flex: 1, position: "relative" }}>
        <MapContainer center={defaultCenter} zoom={defaultZoom} style={{ height: "100%", width: "100%" }}>
          <MapViewportUpdater
            selected={selected}
            defaultCenter={defaultCenter}
            defaultZoom={defaultZoom}
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
          />
          <TileLayer
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution="Labels &copy; Esri"
          />
          {results.map((item) =>
            hasCoordinates(item) ? (
              <Marker
                key={item.id}
                position={[item.latitude, item.longitude]}
                icon={customIcon}
                eventHandlers={{ click: () => setSelected(item) }}
              >
                <Popup>
                  <h3 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>{item.title || item.id}</h3>
                  {(item.timeStart || item.date) && (
                    <p style={{ margin: 0, fontSize: "0.8rem" }}>
                      <strong>Date:</strong> {item.timeStart || item.date}
                    </p>
                  )}
                  <p style={{ margin: 0, fontSize: "0.8rem" }}>
                    <strong>Latitude:</strong> {item.latitude}
                    <br />
                    <strong>Longitude:</strong> {item.longitude}
                  </p>
                  {item.link && (
                    <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem" }}>
                      <a href={item.link} target="_blank" rel="noopener noreferrer">
                        More Info
                      </a>
                    </p>
                  )}
                  <button
                    type="button"
                    style={{
                      background: "#f8fafc",
                      marginTop: "0.5rem",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      cursor: "pointer",
                      color: "#0f172a",
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      openDataset(item);
                    }}
                  >
                    Open dataset
                  </button>
                  <button
                    type="button"
                    style={{
                      background: "#0f172a",
                      marginTop: "0.5rem",
                      marginLeft: "0.5rem",
                      border: "1px solid #334155",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      cursor: "pointer",
                      color: "#fff",
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setSelected(item);
                      setShowStreetView(true);
                    }}
                  >
                    Street View
                  </button>
                </Popup>
              </Marker>
            ) : null
          )}
        </MapContainer>

        {showStreetView && hasCoordinates(selected) && (
          <div
            style={{
              position: "absolute",
              top: "10%",
              left: "10%",
              width: "80%",
              height: "80%",
              background: "#111827",
              zIndex: 1000,
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 0 20px rgba(0,0,0,0.7)",
              color: "#fff",
            }}
          >
            <button
              style={{
                position: "absolute",
                top: 15,
                right: 15,
                zIndex: 1001,
                background: "#1f2937",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "8px 16px",
                cursor: "pointer",
              }}
              onClick={() => setShowStreetView(false)}
            >
              Close
            </button>
            <div style={{ padding: "1.5rem" }}>
              <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
                {selected.title || selected.id}
              </h2>
              <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem", color: "#cbd5e1" }}>
                Embedded Street View is unreliable in many browsers, so GeoScope opens the panorama in a
                new tab for a stable experience.
              </p>
              {(selected.timeStart || selected.date) && (
                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                  <strong>Date:</strong> {selected.timeStart || selected.date}
                </p>
              )}
              <p style={{ margin: 0, fontSize: "0.9rem" }}>
                <strong>Latitude:</strong> {selected.latitude}
                <br />
                <strong>Longitude:</strong> {selected.longitude}
              </p>
              <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={openStreetViewInNewTab}
                  style={{
                    padding: "0.7rem 1rem",
                    borderRadius: "8px",
                    border: "1px solid #38bdf8",
                    background: "#0ea5e9",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Open Street View
                </button>
                {selected.link && (
                  <a
                    href={selected.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "0.7rem 1rem",
                      borderRadius: "8px",
                      border: "1px solid #334155",
                      color: "#e2e8f0",
                      textDecoration: "none",
                    }}
                  >
                    Open provider page
                  </a>
                )}
              </div>
            </div>
            <iframe
              title="Map preview"
              width="100%"
              height="70%"
              frameBorder="0"
              style={{ border: 0 }}
              src={buildMapPreviewUrl(selected)}
              allowFullScreen
            />
          </div>
        )}
      </div>
    </div>
  );
}
