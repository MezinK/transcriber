import { useState, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { UploadButton } from "./UploadButton";
import { JobList } from "./JobList";
import { WorkerList } from "./WorkerList";
import { TranscriptView } from "./TranscriptView";

type Tab = "transcriptions" | "workers";

function IndexPage({
  activeTab,
}: {
  activeTab: Tab;
}) {
  return (
    <>
      {activeTab === "transcriptions" ? (
        <JobList />
      ) : (
        <WorkerList />
      )}
    </>
  );
}

export function V5App() {
  const [activeTab, setActiveTab] = useState<Tab>("transcriptions");
  const navigate = useNavigate();
  const location = useLocation();

  const isDetailView =
    /^\/5\/[^/]+/.test(location.pathname) && location.pathname !== "/5/";

  const handleUploadSuccess = useCallback(() => {
    setActiveTab("transcriptions");
    if (location.pathname !== "/5") navigate("/5");
  }, [navigate, location.pathname]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (location.pathname !== "/5") navigate("/5");
  };

  return (
    <div
      className="min-h-screen text-gray-200"
      style={{ backgroundColor: "#030712" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Literata:ital,wght@0,400;0,500;1,400&display=swap');`}</style>

      <div className="max-w-xl mx-auto py-16 px-6">
        {/* Header */}
        {!isDetailView && (
          <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-8">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600 tracking-widest select-none">
                transcriber
              </span>
              <span className="text-gray-800 select-none">&middot;</span>
              <nav className="flex items-center gap-1 text-xs">
                <span
                  onClick={() => handleTabChange("transcriptions")}
                  className={`cursor-pointer transition-colors ${
                    activeTab === "transcriptions"
                      ? "text-cyan-400"
                      : "text-gray-600 hover:text-gray-400"
                  }`}
                >
                  transcriptions
                </span>
                <span className="text-gray-800 select-none mx-1">&middot;</span>
                <span
                  onClick={() => handleTabChange("workers")}
                  className={`cursor-pointer transition-colors ${
                    activeTab === "workers"
                      ? "text-cyan-400"
                      : "text-gray-600 hover:text-gray-400"
                  }`}
                >
                  workers
                </span>
              </nav>
            </div>
            <UploadButton onSuccess={handleUploadSuccess} />
          </div>
        )}

        {/* Routes */}
        <Routes>
          <Route
            index
            element={
              <IndexPage
                activeTab={activeTab}
              />
            }
          />
          <Route path=":id" element={<TranscriptView />} />
        </Routes>
      </div>
    </div>
  );
}
