import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Site from "./site/Site";
import { loadSite, mergeSite } from "./lib/api";
import { applyTheme } from "./lib/themes";

function App() {
  const [site, setSite] = useState(null);
  useEffect(() => { loadSite().then(s => { applyTheme(s.theme, null); setSite(s); }); }, []);
  if (!site) return <div className="grid min-h-screen place-items-center"><span className="display-title headline-fill text-5xl">...</span></div>;
  return <Site site={mergeSite(site)} />;
}

createRoot(document.getElementById("root")).render(<App />);
