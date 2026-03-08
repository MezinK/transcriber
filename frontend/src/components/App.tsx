import { useState, useCallback, useRef } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { JobGrid } from "./JobGrid";
import { WorkerStatusIcon } from "./WorkerStatus";
import { TranscriptView } from "./TranscriptView";
import { useUpload } from "../hooks/useUpload";

function IndexPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadSuccess = useCallback(() => {
    if (location.pathname !== "/") {
      navigate("/");
    }
  }, [navigate, location.pathname]);

  const { upload, uploading, progress, error } = useUpload(handleUploadSuccess);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) upload(file);
    },
    [upload],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only trigger when leaving the actual container, not children
    if (e.currentTarget === e.target) {
      setDragOver(false);
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload(file);
      e.target.value = "";
    },
    [upload],
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className="relative min-h-[60vh]"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Upload progress bar */}
      {uploading && progress && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-zinc-500">
              Uploading… {progress.percent}%
            </span>
          </div>
          <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload error */}
      {error && (
        <div className="mb-4">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      <JobGrid onPickFile={openFilePicker} />

      {/* Full-page drag overlay */}
      {dragOver && (
        <div className="fixed inset-0 z-40 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-emerald-500/50 rounded-2xl px-12 py-10 text-center">
            <p className="text-emerald-400 text-sm font-medium">
              Drop file to transcribe
            </p>
          </div>
        </div>
      )}
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
