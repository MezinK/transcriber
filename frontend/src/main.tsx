import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "./landing/Landing";
import { V1App } from "./versions/v1/App.tsx";
import "./index.css";

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
        {[2, 3, 4, 5].map((v) => (
          <Route key={v} path={`/${v}/*`} element={<Placeholder version={v} />} />
        ))}
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
