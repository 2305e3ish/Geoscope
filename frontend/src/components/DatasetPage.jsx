import { useLocation, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import MapBox from "./MapBox";
import "./DatasetPage.css";

const DEFAULT_CENTER = [20, 78];

const flattenStrings = (value) => {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap(flattenStrings);
  if (typeof value === "string") return [value];
  if (typeof value === "number" || typeof value === "boolean") return [String(value)];
  if (typeof value === "object") {
    if (value.href || value.url || value.URL) {
      return flattenStrings(value.href || value.url || value.URL);
    }
    return Object.values(value).flatMap(flattenStrings);
  }
  return [];
};

const uniqueStrings = (value) => Array.from(new Set(flattenStrings(value).map((entry) => entry.trim()).filter(Boolean)));

const formatDate = (value) => {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "2-digit" }).format(date);
};

const formatRange = (start, end) => {
  if (!start && !end) return "Unavailable";
  if (start && end) return `${formatDate(start)} to ${formatDate(end)}`;
  return formatDate(start || end);
};

const pickFootprint = (dataset) => {
  if (Array.isArray(dataset?.footprint_bbox) && dataset.footprint_bbox.length === 4) {
    return dataset.footprint_bbox;
  }

  const raw = dataset?.raw && typeof dataset.raw === "object" ? dataset.raw : dataset;
  const boxes = raw?.boxes;
  if (!boxes || !Array.isArray(boxes) || !boxes.length) return null;

  const firstBox = Array.isArray(boxes[0]) ? boxes[0][0] : boxes[0];
  if (typeof firstBox !== "string") return null;

  const parts = firstBox.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return null;
  return parts;
};

const extractUrls = (value) => {
  const urls = [];
  const visit = (entry) => {
    if (!entry) return;
    if (typeof entry === "string") {
      if (/^https?:\/\//i.test(entry)) urls.push(entry);
      return;
    }
    if (Array.isArray(entry)) {
      entry.forEach(visit);
      return;
    }
    if (typeof entry === "object") {
      if (entry.href) urls.push(entry.href);
      if (entry.url) urls.push(entry.url);
      if (entry.URL) urls.push(entry.URL);
      if (entry.links) visit(entry.links);
    }
  };

  visit(value);
  return Array.from(new Set(urls.filter(Boolean)));
};

const JsonTree = ({ value }) => {
  if (value === null || value === undefined) return <span className="dataset-empty">No data available.</span>;

  if (typeof value !== "object") {
    return <span className="dataset-json-value">{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    return (
      <div className="dataset-json-array">
        {value.map((item, index) => (
          <details key={index} className="dataset-json-node">
            <summary>Item {index + 1}</summary>
            <JsonTree value={item} />
          </details>
        ))}
      </div>
    );
  }

  return (
    <div className="dataset-json-object">
      {Object.entries(value).map(([key, entryValue]) => (
        <details key={key} className="dataset-json-node" open={typeof entryValue !== "object" || entryValue === null}>
          <summary>{key}</summary>
          <JsonTree value={entryValue} />
        </details>
      ))}
    </div>
  );
};

export default function DatasetPage() {
  const { id } = useParams();
  const location = useLocation();
  const [dataset, setDataset] = useState(location.state || null);
  const [loading, setLoading] = useState(!location.state);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [rawFilter, setRawFilter] = useState("");
  const [copied, setCopied] = useState(false);
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";

  useEffect(() => {
    let isActive = true;

    if (location.state) {
      setDataset(location.state);
      setLoading(false);
    }

    const fetchDataset = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/dataset/${id}`);
        if (!isActive) return;
        setDataset((current) => ({
          ...(current || {}),
          ...data,
          raw: data.raw || current?.raw || current || null,
        }));
      } catch (err) {
        if (!isActive) return;
        setError(err.message);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    if (!location.state || !location.state.raw || !location.state.footprint_bbox) {
      fetchDataset();
    }

    return () => {
      isActive = false;
    };
  }, [API_BASE, id, location.state]);

  const raw = useMemo(
    () => (dataset?.raw && typeof dataset.raw === "object" ? dataset.raw : (dataset && typeof dataset === "object" ? dataset : {})),
    [dataset]
  );
  const footprint = pickFootprint(dataset);
  const datasetCenter = useMemo(
    () => (dataset?.latitude && dataset?.longitude ? [dataset.latitude, dataset.longitude] : null),
    [dataset?.latitude, dataset?.longitude]
  );

  const title = dataset?.title || raw?.title || "Dataset Details";
  const summary = dataset?.summary || raw?.summary || "No summary available.";
  const dataCenter = dataset?.dataCenter || raw?.data_center || raw?.dataCenter || "Unknown";
  const sourceLink = dataset?.link || raw?.links?.find?.((entry) => entry?.href)?.href || null;

  const keywords = useMemo(() => uniqueStrings([raw?.keywords, raw?.science_keywords, raw?.theme_keywords, raw?.keyword]), [raw]);
  const platforms = useMemo(() => uniqueStrings([raw?.platform, raw?.platforms]), [raw]);
  const instruments = useMemo(() => uniqueStrings([raw?.instrument, raw?.instruments]), [raw]);
  const formats = useMemo(() => uniqueStrings([raw?.formats, raw?.data_formats, raw?.file_formats, raw?.format]), [raw]);
  const relatedUrls = useMemo(() => extractUrls([raw?.links, raw?.related_urls, raw?.relatedUrls, raw?.online_access_urls]), [raw]);

  const primitiveCount = Object.values(raw).filter((value) => value === null || ["string", "number", "boolean"].includes(typeof value)).length;
  const arrayCount = Object.values(raw).filter((value) => Array.isArray(value)).length;
  const objectCount = Object.values(raw).filter((value) => value && typeof value === "object" && !Array.isArray(value)).length;

  const rawText = JSON.stringify(raw, null, 2);
  const filteredRawText = rawFilter.trim()
    ? rawText
        .split("\n")
        .filter((line) => line.toLowerCase().includes(rawFilter.toLowerCase()))
        .join("\n")
    : rawText;

  const metrics = [
    { label: "Metadata fields", value: Object.keys(raw).length },
    { label: "Primitive values", value: primitiveCount },
    { label: "Arrays", value: arrayCount },
    { label: "Nested objects", value: objectCount },
  ];

  const resourceGroups = [
    { label: "Keywords", values: keywords },
    { label: "Platforms", values: platforms },
    { label: "Instruments", values: instruments },
    { label: "Formats", values: formats },
  ].filter((group) => group.values.length > 0);

  const quickFacts = [
    { label: "Provider", value: dataCenter },
    { label: "Version", value: dataset?.versionId || raw?.version_id || "Unavailable" },
    { label: "Updated", value: formatDate(dataset?.updated || raw?.updated) },
    { label: "Temporal range", value: formatRange(dataset?.timeStart || raw?.time_start, dataset?.timeEnd || raw?.time_end) },
    { label: "Spatial footprint", value: footprint ? "Bounding box available" : datasetCenter ? "Point location available" : "Unavailable" },
    { label: "Related links", value: String(relatedUrls.length) },
  ];

  const copyRawJson = async () => {
    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const downloadRawJson = () => {
    const blob = new Blob([rawText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(dataset?.id || id || "dataset").replace(/[^a-z0-9-_]+/gi, "_")}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="dataset-page dataset-page-loading">
        <div className="dataset-loading-card">Loading dataset explorer...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dataset-page dataset-page-loading">
        <div className="dataset-loading-card dataset-error-card">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="dataset-page">
      <aside className="dataset-sidebar">
        <div className="dataset-brand">GEOSCOPE.ai</div>
        <div className="dataset-hero">
          <p className="dataset-eyebrow">Interactive dataset explorer</p>
          <h1>{title}</h1>
          <p className="dataset-summary">{summary}</p>
        </div>

        <div className="dataset-actions">
          {sourceLink && (
            <a className="dataset-button dataset-button-primary" href={sourceLink} target="_blank" rel="noopener noreferrer">
              Open source dataset
            </a>
          )}
          <button className="dataset-button" type="button" onClick={copyRawJson}>
            {copied ? "Copied" : "Copy metadata JSON"}
          </button>
          <button className="dataset-button" type="button" onClick={downloadRawJson}>
            Download JSON
          </button>
        </div>

        <div className="dataset-tab-list">
          {[
            ["overview", "Overview"],
            ["spatial", "Spatial view"],
            ["metadata", "Metadata"],
            ["raw", "Raw explorer"],
          ].map(([tabKey, label]) => (
            <button
              key={tabKey}
              type="button"
              className={activeTab === tabKey ? "dataset-tab active" : "dataset-tab"}
              onClick={() => setActiveTab(tabKey)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="dataset-facts">
          {quickFacts.map((fact) => (
            <div className="dataset-fact" key={fact.label}>
              <span>{fact.label}</span>
              <strong>{fact.value}</strong>
            </div>
          ))}
        </div>
      </aside>

      <main className="dataset-main">
        <section className="dataset-panel dataset-panel-top">
          <div className="dataset-panel-header">
            <div>
              <p className="dataset-eyebrow">Dataset snapshot</p>
              <h2>Metadata profile</h2>
            </div>
            <div className="dataset-pill-row">
              <span className="dataset-pill">{dataCenter}</span>
              <span className="dataset-pill">{relatedUrls.length} links</span>
              <span className="dataset-pill">{footprint ? "Footprint ready" : "Location only"}</span>
            </div>
          </div>

          <div className="dataset-metrics">
            {metrics.map((metric) => (
              <div className="dataset-metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>

          <div className="dataset-bars" aria-label="Metadata complexity bars">
            {metrics.map((metric, index) => {
              const maxValue = Math.max(...metrics.map((item) => item.value), 1);
              const width = Math.max(12, Math.round((metric.value / maxValue) * 100));
              return (
                <div className="dataset-bar-row" key={metric.label}>
                  <div className="dataset-bar-label">
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                  <div className="dataset-bar-track">
                    <div className={`dataset-bar-fill dataset-bar-fill-${index + 1}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="dataset-panel dataset-tab-panel">
          {activeTab === "overview" && (
            <div className="dataset-overview-grid">
              <article className="dataset-card dataset-card-feature">
                <p className="dataset-eyebrow">What this dataset gives you</p>
                <h3>Readable overview</h3>
                <p>
                  This explorer highlights the most useful metadata, then lets you drill into the raw NASA collection payload without leaving the page.
                </p>
                <ul className="dataset-bullets">
                  <li>Search summary and source link</li>
                  <li>Spatial footprint preview</li>
                  <li>Structured metadata browser</li>
                </ul>
              </article>

              <article className="dataset-card dataset-card-mini">
                <p className="dataset-eyebrow">Coverage</p>
                <h3>{footprint ? "Mapped footprint" : "No box footprint"}</h3>
                <p>{datasetCenter ? "A point marker is available for this result." : "The collection did not return a simple point marker."}</p>
              </article>

              <article className="dataset-card dataset-card-mini">
                <p className="dataset-eyebrow">Related assets</p>
                <h3>{relatedUrls.length}</h3>
                <p>External dataset links, browse URLs, or access endpoints are listed in the metadata tab.</p>
              </article>
            </div>
          )}

          {activeTab === "spatial" && (
            <div className="dataset-spatial-layout">
              <div className="dataset-map-card">
                <MapBox bbox={footprint} center={datasetCenter || DEFAULT_CENTER} marker={datasetCenter ? { latlng: datasetCenter, popup: title } : null} />
              </div>
              <div className="dataset-card dataset-card-geo">
                <p className="dataset-eyebrow">Spatial intelligence</p>
                <h3>Coverage details</h3>
                <p>
                  {footprint
                    ? "The map highlights the geographic footprint returned by NASA CMR."
                    : "This dataset did not include a clear bounding box, so the explorer falls back to a point marker when available."}
                </p>
                <div className="dataset-mini-grid">
                  <div>
                    <span>Start</span>
                    <strong>{formatDate(dataset?.timeStart || raw?.time_start)}</strong>
                  </div>
                  <div>
                    <span>End</span>
                    <strong>{formatDate(dataset?.timeEnd || raw?.time_end)}</strong>
                  </div>
                  <div>
                    <span>Provider</span>
                    <strong>{dataCenter}</strong>
                  </div>
                  <div>
                    <span>Location mode</span>
                    <strong>{footprint ? "Area" : datasetCenter ? "Point" : "Unknown"}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "metadata" && (
            <div className="dataset-metadata-layout">
              {resourceGroups.map((group) => (
                <section className="dataset-card" key={group.label}>
                  <p className="dataset-eyebrow">{group.label}</p>
                  <h3>{group.values.length} items</h3>
                  <div className="dataset-chip-cloud">
                    {group.values.map((item) => (
                      <span className="dataset-chip" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </section>
              ))}

              <section className="dataset-card dataset-links-card">
                <p className="dataset-eyebrow">Related links</p>
                <h3>{relatedUrls.length} URLs</h3>
                <ul className="dataset-link-list">
                  {relatedUrls.length > 0 ? (
                    relatedUrls.map((url) => (
                      <li key={url}>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          {url}
                        </a>
                      </li>
                    ))
                  ) : (
                    <li className="dataset-empty">No external links were exposed by the collection response.</li>
                  )}
                </ul>
              </section>
            </div>
          )}

          {activeTab === "raw" && (
            <section className="dataset-card dataset-raw-card">
              <div className="dataset-raw-controls">
                <div>
                  <p className="dataset-eyebrow">Raw explorer</p>
                  <h3>Inspect the complete collection payload</h3>
                </div>
                <input
                  type="text"
                  value={rawFilter}
                  onChange={(event) => setRawFilter(event.target.value)}
                  placeholder="Filter keys or values"
                  className="dataset-input"
                />
              </div>
              <div className="dataset-raw-viewer">
                {filteredRawText ? <pre>{filteredRawText}</pre> : <div className="dataset-empty">No matching lines found.</div>}
              </div>
              <div className="dataset-tree">
                <JsonTree value={raw} />
              </div>
            </section>
          )}
        </section>
      </main>
    </div>
  );
}
