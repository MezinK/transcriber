import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

function Placeholder({ version }: { version: number }) {
  return <div className="p-8 text-lg text-gray-600">Version {version} — coming soon</div>;
}

function Landing() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Transcription App</h1>
        <p className="text-gray-500 mb-8">Choose a version to get started.</p>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((v) => (
            <a
              key={v}
              href={`/${v}`}
              className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              Version {v}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        {[1, 2, 3, 4, 5].map((v) => (
          <Route key={v} path={`/${v}/*`} element={<Placeholder version={v} />} />
        ))}
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
