import { useState, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { UploadArea } from "./UploadArea";
import { JobList } from "./JobList";
import { WorkerList } from "./WorkerList";
import { TranscriptView } from "./TranscriptView";

type Tab = "transcriptions" | "workers";

function IndexPage() {
  const [activeTab, setActiveTab] = useState<Tab>("transcriptions");
  const navigate = useNavigate();
  const location = useLocation();

  const handleUploadSuccess = useCallback(() => {
    if (location.pathname !== "/") {
      navigate("/");
    }
  }, [navigate, location.pathname]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "transcriptions", label: "Transcriptions" },
    { key: "workers", label: "Workers" },
  ];

  return (
    <>
      <div className="rounded-lg bg-zinc-800 p-1 inline-flex mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
              activeTab === tab.key
                ? "bg-zinc-700 text-zinc-100 ring-1 ring-zinc-600"
                : "text-zinc-400 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "transcriptions" ? (
        <div className="space-y-6">
          <UploadArea onSuccess={handleUploadSuccess} />
          <JobList />
        </div>
      ) : (
        <WorkerList />
      )}
    </>
  );
}

export function App() {
  return (
    <div
      className="min-h-screen bg-zinc-950 text-zinc-200"
      style={{ fontFamily: "'Geist Sans', 'IBM Plex Sans', sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');`}</style>
      <div className="max-w-3xl mx-auto py-10 px-6">
        <h1 className="text-sm text-zinc-500 uppercase tracking-wider mb-6">
          Transcriber
        </h1>

        <Routes>
          <Route index element={<IndexPage />} />
          <Route path=":id" element={<TranscriptView />} />
        </Routes>
      </div>
    </div>
  );
}
