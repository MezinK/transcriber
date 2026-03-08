import { useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { UploadArea } from "./UploadArea";
import { JobList } from "./JobList";
import { WorkerStatusIcon } from "./WorkerStatus";
import { TranscriptView } from "./TranscriptView";

function IndexPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleUploadSuccess = useCallback(() => {
    if (location.pathname !== "/") {
      navigate("/");
    }
  }, [navigate, location.pathname]);

  return (
    <div className="space-y-6">
      <UploadArea onSuccess={handleUploadSuccess} />
      <JobList />
    </div>
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-sm text-zinc-500 uppercase tracking-wider">
            Transcriber
          </h1>
          <WorkerStatusIcon />
        </div>

        <Routes>
          <Route index element={<IndexPage />} />
          <Route path=":id" element={<TranscriptView />} />
        </Routes>
      </div>
    </div>
  );
}
