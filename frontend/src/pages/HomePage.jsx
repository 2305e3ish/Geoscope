import { useNavigate } from "react-router-dom";
import { ReactTyped } from "react-typed";

import "../App.css";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: -1,
        }}
      >
        <iframe
          src="https://my.spline.design/earthwallpaper-W7GbLN5wWGUUV5lqirBHTPIk/"
          frameBorder="0"
          width="100%"
          height="100%"
        ></iframe>
      </div>
      <div className="overlay">
        <ReactTyped
          className="subtitle"
          strings={[
            "Explore Earth data with grounded AI.",
            "Discover NASA datasets with hybrid search.",
            "Use GeoScope for research, learning, and comparison.",
          ]}
          typeSpeed={40}
          backSpeed={30}
          loop
        />
        <button className="button" onClick={() => navigate("/map")}>
          <span className="button_lg">
            <span className="button_sl"></span>
            <span className="button_text">Explore Now</span>
          </span>
        </button>
      </div>
    </>
  );
}
