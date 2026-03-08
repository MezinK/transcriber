import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "./landing/Landing";
import { V1App } from "./versions/v1/App";
import { V2App } from "./versions/v2/App";
import { V3App } from "./versions/v3/App";
import "./index.css";

function Placeholder({ version }: { version: number }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <p className="text-zinc-500">Version {version} — coming soon</p>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/1/*" element={<V1App />} />
        <Route path="/2/*" element={<V2App />} />
        <Route path="/3/*" element={<V3App />} />
        {[4, 5].map((v) => (
          <Route key={v} path={`/${v}/*`} element={<Placeholder version={v} />} />
        ))}
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
