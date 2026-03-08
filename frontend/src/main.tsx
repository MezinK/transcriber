import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "./landing/Landing";
import "./index.css";

// Placeholders — replaced one at a time in tasks 5-9
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
        {[1, 2, 3, 4, 5].map((v) => (
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
