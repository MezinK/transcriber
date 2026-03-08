import { useState, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { UploadCard } from "./UploadCard";
import { JobGrid } from "./JobGrid";
import { WorkerGrid } from "./WorkerGrid";
import { TranscriptView } from "./TranscriptView";

type Tab = "transcriptions" | "workers";

function IndexPage() {
  const [activeTab, setActiveTab] = useState<Tab>("transcriptions");
  const navigate = useNavigate();
  const location = useLocation();

  const handleUploadSuccess = useCallback(() => {
    if (location.pathname !== "/3") {
      navigate("/3");
    }
  }, [navigate, location.pathname]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "transcriptions", label: "Transcriptions" },
    { key: "workers", label: "Workers" },
  ];

  return (
    <>
      <div className="flex gap-2 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-blue-500 text-white"
                : "bg-white text-stone-500 border border-stone-200 hover:border-stone-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "transcriptions" ? (
        <div className="space-y-6">
          <UploadCard onSuccess={handleUploadSuccess} />
          <JobGrid />
        </div>
      ) : (
        <WorkerGrid />
      )}
    </>
  );
}

export function V3App() {
  return (
    <div
      className="min-h-screen bg-stone-50"
      style={{ fontFamily: "'Instrument Sans', sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap');`}</style>
      <div className="max-w-5xl mx-auto py-10 px-6">
        <h1 className="text-sm uppercase tracking-wider text-stone-400 mb-6">
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
