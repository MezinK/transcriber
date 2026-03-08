import { useState, useCallback } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import { useTranscriptions } from "../../hooks/useTranscriptions";
import { Sidebar } from "./Sidebar";
import { UploadArea } from "./UploadArea";
import { TranscriptView } from "./TranscriptView";
import { WorkerList } from "./WorkerList";

type Tab = "transcriptions" | "workers";

/** Reads :id from the URL so we can highlight the active sidebar item. */
function TranscriptViewWithId({
  onIdChange,
}: {
  onIdChange: (id: string) => void;
}) {
  const { id } = useParams<{ id: string }>();
  // Notify parent of the current id on each render
  if (id) onIdChange(id);
  return <TranscriptView />;
}

export function V2App() {
  const [activeTab, setActiveTab] = useState<Tab>("transcriptions");
  const [currentJobId, setCurrentJobId] = useState<string | undefined>();
  const { jobs, refresh } = useTranscriptions();
  const navigate = useNavigate();

  const handleTabChange = useCallback(
    (tab: Tab) => {
      setActiveTab(tab);
      if (tab === "workers") {
        navigate("/2/workers");
      } else {
        navigate("/2");
      }
      setCurrentJobId(undefined);
    },
    [navigate],
  );

  const handleUploadClick = useCallback(() => {
    navigate("/2");
    setCurrentJobId(undefined);
  }, [navigate]);

  const handleUploadSuccess = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleIdChange = useCallback((id: string) => {
    setCurrentJobId(id);
  }, []);

  return (
    <div
      className="flex h-screen overflow-hidden bg-white"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap');`}</style>

      <Sidebar
        jobs={jobs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        currentJobId={currentJobId}
        onUploadClick={handleUploadClick}
      />

      <main className="flex-1 overflow-y-auto flex flex-col">
        <Routes>
          <Route
            index
            element={<UploadArea onSuccess={handleUploadSuccess} />}
          />
          <Route
            path=":id"
            element={<TranscriptViewWithId onIdChange={handleIdChange} />}
          />
          <Route path="workers" element={<WorkerList />} />
        </Routes>
      </main>
    </div>
  );
}
