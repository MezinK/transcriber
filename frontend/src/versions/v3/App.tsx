import { Routes, Route, Link } from "react-router-dom";
import { UploadCard } from "./UploadCard";
import { JobGrid } from "./JobGrid";
import { TranscriptView } from "./TranscriptView";

function Home() {
  return (
    <div className="space-y-10">
      <UploadCard onSuccess={() => { /* polling handles refresh */ }} />

      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          Recent Transcriptions
        </h2>
        <JobGrid />
      </div>
    </div>
  );
}

export function V3App() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200/60 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-6">
          <Link
            to="/3"
            className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-stone-700 transition-colors hover:text-blue-600"
          >
            {/* Waveform icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
              stroke="currentColor"
              className="h-5 w-5 text-blue-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 12h.75m3-3v6m3-7.5v9m3-6v3m3-7.5v12m3-9v6m.75-3h.75"
              />
            </svg>
            Transcription
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Routes>
          <Route index element={<Home />} />
          <Route path=":id" element={<TranscriptView />} />
        </Routes>
      </main>
    </div>
  );
}
