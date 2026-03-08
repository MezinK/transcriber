import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "./landing/Landing";
import { V1App } from "./versions/v1/App";
import { V2App } from "./versions/v2/App";
import "./index.css";

// Placeholders — replaced one at a time in tasks 7-9
function Placeholder({ version }: { version: number }) {
  return (
    <div className="p-8 text-lg text-gray-600">
      Version {version} — coming soon
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
        {[3, 4, 5].map((v) => (
          <Route
            key={v}
            path={`/${v}/*`}
            element={<Placeholder version={v} />}
          />
        ))}
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
