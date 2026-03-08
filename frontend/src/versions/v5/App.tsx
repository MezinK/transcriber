import { useState, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { UploadButton } from "./UploadButton";
import { JobList } from "./JobList";
import { WorkerList } from "./WorkerList";
import { TranscriptView } from "./TranscriptView";

type Tab = "transcriptions" | "workers";

function IndexPage() {
  const [activeTab, setActiveTab] = useState<Tab>("transcriptions");
  const navigate = useNavigate();
  const location = useLocation();

  const handleUploadSuccess = useCallback(() => {
    if (location.pathname !== "/5") {
      navigate("/5");
    }
  }, [navigate, location.pathname]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-0">
        <span className="text-xs text-gray-400 uppercase tracking-widest select-none">
          transcriber
        </span>

        <nav className="flex items-center gap-1 text-sm">
          <button
            onClick={() => setActiveTab("transcriptions")}
            className={`cursor-pointer transition-colors ${
              activeTab === "transcriptions"
                ? "text-gray-700 font-medium"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Transcriptions
          </button>
          <span className="text-gray-300">&middot;</span>
          <button
            onClick={() => setActiveTab("workers")}
            className={`cursor-pointer transition-colors ${
              activeTab === "workers"
                ? "text-gray-700 font-medium"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Workers
          </button>
        </nav>

        <UploadButton onSuccess={handleUploadSuccess} />
      </div>

      <div className="border-b border-gray-100 mb-8 mt-4" />

      {activeTab === "transcriptions" ? <JobList /> : <WorkerList />}
    </>
  );
}

export function V5App() {
  return (
    <div className="min-h-screen bg-white">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400&display=swap');`}</style>
      <div className="max-w-2xl mx-auto py-12 px-6">
        <Routes>
          <Route index element={<IndexPage />} />
          <Route path=":id" element={<TranscriptView />} />
        </Routes>
      </div>
    </div>
  );
}
