import { useState, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { UploadBar } from "./UploadBar";
import { JobTable } from "./JobTable";
import { WorkerTable } from "./WorkerTable";
import { TranscriptView } from "./TranscriptView";

type Tab = "transcriptions" | "workers";

function IndexPage() {
  const [activeTab, setActiveTab] = useState<Tab>("transcriptions");
  const navigate = useNavigate();
  const location = useLocation();

  const handleUploadSuccess = useCallback(() => {
    if (location.pathname !== "/2") {
      navigate("/2");
    }
  }, [navigate, location.pathname]);

  return (
    <>
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab("transcriptions")}
          className={`text-xs uppercase tracking-wider pb-1 transition-colors ${
            activeTab === "transcriptions"
              ? "text-green-400 border-b-2 border-green-400"
              : "text-neutral-500 hover:text-green-400/70"
          }`}
        >
          [TRANSCRIPTIONS]
        </button>
        <button
          onClick={() => setActiveTab("workers")}
          className={`text-xs uppercase tracking-wider pb-1 transition-colors ${
            activeTab === "workers"
              ? "text-green-400 border-b-2 border-green-400"
              : "text-neutral-500 hover:text-green-400/70"
          }`}
        >
          [WORKERS]
        </button>
      </div>

      {activeTab === "transcriptions" ? (
        <div className="space-y-6">
          <UploadBar onSuccess={handleUploadSuccess} />
          <JobTable />
        </div>
      ) : (
        <WorkerTable />
      )}
    </>
  );
}

export function V2App() {
  return (
    <div
      className="min-h-screen bg-black text-green-400"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        .v2-blink {
          animation: v2-blink-kf 1s step-end infinite;
        }
        .v2-blink-dot {
          animation: v2-blink-kf 1s step-end infinite;
        }
        @keyframes v2-blink-kf {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
      <div className="max-w-5xl mx-auto py-8 px-6">
        <h1 className="text-xl font-bold text-green-400 mb-6">
          &gt; transcriber<span className="v2-blink">_</span>
        </h1>

        <Routes>
          <Route index element={<IndexPage />} />
          <Route path=":id" element={<TranscriptView />} />
        </Routes>
      </div>
    </div>
  );
}
