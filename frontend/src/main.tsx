import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

// Placeholder — will be replaced with real components
function Placeholder({ version }: { version: number }) {
  return <div className="p-8 text-lg">Version {version} — coming soon</div>;
}

function Landing() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Transcription App</h1>
      <ul className="space-y-2">
        {[1, 2, 3, 4, 5].map((v) => (
          <li key={v}>
            <a href={`/${v}`} className="text-blue-600 underline">
              Version {v}
            </a>
          </li>
        ))}
      </ul>
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
