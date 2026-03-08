import { useState, useCallback } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import { useTranscriptions } from "../../hooks/useTranscriptions";
import { Sidebar } from "./Sidebar";
import { UploadArea } from "./UploadArea";
import { TranscriptView } from "./TranscriptView";
import { WorkerList } from "./WorkerList";

type NavSection = "transcriptions" | "workers";

function ContentWithSidebar() {
  const { jobs, refresh } = useTranscriptions();
  const [activeNav, setActiveNav] = useState<NavSection>("transcriptions");
  const navigate = useNavigate();
  const params = useParams<{ "*": string }>();
  const wildcard = params["*"] ?? "";
  const currentJobId = wildcard && wildcard !== "workers" ? wildcard : undefined;

  const handleUploadSuccess = useCallback(() => {
    refresh();
    navigate("/3");
  }, [refresh, navigate]);

  const handleDeleted = useCallback(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        jobs={jobs}
        activeNav={activeNav}
        onNavChange={setActiveNav}
        onUploadSuccess={handleUploadSuccess}
        currentJobId={currentJobId}
      />

      <main className="flex-1 p-8">
        <Routes>
          <Route
            index
            element={<UploadArea onSuccess={handleUploadSuccess} />}
          />
          <Route
            path="workers"
            element={<WorkerList />}
          />
          <Route
            path=":id"
            element={<TranscriptView onDeleted={handleDeleted} />}
          />
        </Routes>
      </main>
    </div>
  );
}

export function V3App() {
  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "#0a0f1e",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');`}</style>
      <ContentWithSidebar />
    </div>
  );
}
