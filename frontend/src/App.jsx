import { Routes, Route } from "react-router-dom";
import "./App.css";
import DatasetPage from "./pages/DatasetPage";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/map" element={<SearchPage />} />
      <Route path="/dataset/:id" element={<DatasetPage />} />
    </Routes>
  );
}

// import SpaceParticles from "./components/SpaceParticles";
// import Header from "./components/Header";

// import { useState } from "react";
// import axios from "axios";
// import MapBox from "./components/MapBox";
// import ResultCard from "./components/ResultCard";
// import Chatbot from "./components/chatbot";
// import "./components/chatbot.css";

// export default function App() {
//   const [q, setQ] = useState("");
//   const [resp, setResp] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [recentSearches, setRecentSearches] = useState([]);
//   const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";

//   const search = async (e) => {
//     e.preventDefault();
//     if (!q) return;
//     setLoading(true); setError(null);
//     setRecentSearches((prev) => [q, ...prev.filter((item) => item !== q)].slice(0, 8));
//     try {
//       const { data } = await axios.get(`${API_BASE}/api/search`, { params: { q } });
//       setResp(data);
//     } catch (err) { setError(err.message) } finally { setLoading(false); }
//   };

//   return (
//     <div style={{
//       minHeight: "100vh",
//       width: "100vw",
//       background: "radial-gradient(ellipse at 60% 10%, #23243a 60%, #0a0a1a 100%)",
//       color: "#fff",
//       fontFamily: "system-ui, Avenir, Helvetica, Arial, sans-serif",
//       display: "flex",
//       flexDirection: "column",
//       alignItems: "center",
//       justifyContent: "flex-start",
//       padding: "0 0 60px 0",
//       position: "relative",
//       overflow: "hidden"
//     }}>
//   <Header recentSearches={recentSearches} />
//       <SpaceParticles />
//       {/* Header */}
//       <header style={{
//         width: "100%",
//         padding: "2.5rem 0 1.5rem 0",
//         textAlign: "center",
//         letterSpacing: 1,
//         background: "transparent"
//       }}>
//         <h1 style={{ fontWeight: 900, fontSize: "2.8rem", margin: 0, color: "#fff", textShadow: "0 2px 32px #000a" }}>GeoScope: EarthData Finder</h1>
//         <div style={{ fontSize: 18, color: "#bdbde6", marginTop: 8 }}>Discover NASA datasets for any Earth event, instantly.</div>
//       </header>

//       {/* Search Section */}
//       <section style={{
//         background: "rgba(24, 24, 40, 0.85)",
//         borderRadius: 24,
//         boxShadow: "0 8px 40px #000a",
//         padding: "2.5rem 2.5rem 2rem 2.5rem",
//         maxWidth: 540,
//         width: "100%",
//         margin: "0 auto 2.5rem auto",
//         display: "flex",
//         flexDirection: "column",
//         alignItems: "center",
//         backdropFilter: "blur(12px)",
//         border: "1.5px solid rgba(255,255,255,0.08)"
//       }}>
//         <form onSubmit={search} style={{ display: "flex", gap: 12, width: "100%", marginBottom: 24 }}>
//           <input value={q} onChange={e => setQ(e.target.value)}
//             placeholder='Try: "floods in India 2019"'
//             style={{
//               flex: 1,
//               padding: 18,
//               borderRadius: 12,
//               border: "none",
//               background: "rgba(30,30,50,0.95)",
//               color: "#fff",
//               fontSize: 18,
//               boxShadow: "0 2px 12px #0002",
//               outline: "none"
//             }} />
//           <button style={{
//             padding: "8px 14px",
//             background: "linear-gradient(90deg,#6f6fff,#3a3a7a)",
//             color: "#fff",
//             border: "none",
//             borderRadius: 10,
//             fontWeight: 700,
//             fontSize: 16,
//             cursor: "pointer",
//             boxShadow: "0 2px 12px #0002"
//           }}>Search</button>
//         </form>
//         {loading && <div style={{margin: '24px 0'}}>
//           <div className="spinner" style={{
//             border: "4px solid #444",
//             borderTop: "4px solid #6f6fff",
//             borderRadius: "50%",
//             width: 36,
//             height: 36,
//             animation: "spin 1s linear infinite",
//             margin: "0 auto"
//           }} />
//           <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
//         </div>}
//         {error && <div style={{ color: "#ff6b6b", margin: 0, marginBottom: 12, fontWeight: 600, textAlign: 'center' }}>{error}</div>}
//         {resp?.query && <>
//           <h3 style={{ color: "#fff", marginTop: 24 }}>Interpreted Query</h3>
//           <pre style={{ background: "#181828", color: "#fff", borderRadius: 8, padding: 12 }}>{JSON.stringify(resp.query, null, 2)}</pre>
//         </>}
//         {resp?.query?.params_sent?.bounding_box &&
//           <MapBox bbox={resp.query.params_sent.bounding_box.split(",").map(Number)} />}
//         {resp?.results?.length > 0 && <>
//           <h3 style={{ color: "#fff", marginTop: 24 }}>Results</h3>
//           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16, width: "100%" }}>
//             {resp.results.map(r => <ResultCard key={r.id} item={r} />)}
//           </div>
//         </>}
//       </section>

//       {/* Chatbot Section */}
//       <section style={{ width: "100%", maxWidth: 600, margin: "0 auto" }}>
//         <Chatbot />
//       </section>

//       {/* Footer */}
//       <footer style={{
//         width: "100%",
//         textAlign: "center",
//         color: "#bdbde6",
//         fontSize: 15,
//         marginTop: 40,
//         padding: "2rem 0 0.5rem 0",
//         borderTop: "1px solid #23243a",
//         letterSpacing: 1
//       }}>
//         <span>Powered by NASA APIs | GeoScope &copy; 2025</span>
//       </footer>
//     </div>
//   );
// }

