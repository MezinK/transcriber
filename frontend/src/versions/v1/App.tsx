import { useState, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { UploadArea } from "./UploadArea.tsx";
import { JobList } from "./JobList.tsx";
import { WorkerList } from "./WorkerList.tsx";
import { TranscriptView } from "./TranscriptView.tsx";

type Tab = "transcriptions" | "workers";

function IndexPage() {
  const [activeTab, setActiveTab] = useState<Tab>("transcriptions");
  const navigate = useNavigate();
  const location = useLocation();

  const handleUploadSuccess = useCallback(() => {
    // Navigate to index to see the new job in the list
    if (location.pathname !== "/1") {
      navigate("/1");
    }
  }, [navigate, location.pathname]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "transcriptions", label: "Transcriptions" },
    { key: "workers", label: "Workers" },
  ];

  return (
    <>
      <nav className="flex gap-6 mb-10">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              pb-2 text-sm font-medium transition-colors duration-200
              ${
                activeTab === tab.key
                  ? "text-slate-800 border-b-2 border-slate-800"
                  : "text-slate-400 hover:text-slate-600"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "transcriptions" ? (
        <div className="space-y-8">
          <UploadArea onSuccess={handleUploadSuccess} />
          <JobList />
        </div>
      ) : (
        <WorkerList />
      )}
    </>
  );
}

export function V1App() {
  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');`}</style>
      <div className="max-w-4xl mx-auto py-12 px-6">
        <h1 className="text-xs uppercase tracking-widest text-slate-400 mb-8">
          Transcriptions
        </h1>

        <Routes>
          <Route index element={<IndexPage />} />
          <Route path=":id" element={<TranscriptView />} />
        </Routes>
      </div>
    </div>
  );
}
