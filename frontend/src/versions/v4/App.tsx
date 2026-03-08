import { useState, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { UploadHero } from "./UploadHero";
import { JobGrid } from "./JobGrid";
import { TranscriptView } from "./TranscriptView";
import { WorkerRow } from "./WorkerRow";

type Tab = "transcriptions" | "workers";

function EmberShell() {
  const [activeTab, setActiveTab] = useState<Tab>("transcriptions");
  const navigate = useNavigate();
  const location = useLocation();

  const isDetailView = /^\/4\/[^/]+/.test(location.pathname) && location.pathname !== "/4/";

  const handleUploadSuccess = useCallback(() => {
    navigate("/4");
  }, [navigate]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    navigate("/4");
  };

  return (
    <div className="min-w-0 w-full max-w-5xl mx-auto py-10 px-6">
      {/* Brand */}
      <p className="text-xs text-stone-500 uppercase tracking-[0.2em] mb-8 select-none">
        Transcriber
      </p>

      {/* Navigation Tabs */}
      {!isDetailView && (
        <nav className="flex gap-1 mb-10 bg-stone-800/60 rounded-full p-1 w-fit">
          <button
            onClick={() => handleTabChange("transcriptions")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              activeTab === "transcriptions"
                ? "bg-stone-700/80 text-amber-500 shadow-sm"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Transcriptions
          </button>
          <button
            onClick={() => handleTabChange("workers")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              activeTab === "workers"
                ? "bg-stone-700/80 text-amber-500 shadow-sm"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Workers
          </button>
        </nav>
      )}

      {/* Content */}
      <Routes>
        <Route
          index
          element={
            activeTab === "transcriptions" ? (
              <div className="space-y-8">
                <UploadHero onSuccess={handleUploadSuccess} />
                <JobGrid />
              </div>
            ) : (
              <WorkerRow />
            )
          }
        />
        <Route path=":id" element={<TranscriptView />} />
      </Routes>
    </div>
  );
}

export function V4App() {
  return (
    <div
      className="min-h-screen text-stone-200"
      style={{
        backgroundColor: "#0c0a09",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
      <EmberShell />
    </div>
  );
}
