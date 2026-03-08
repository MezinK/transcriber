import { Routes, Route, Link } from "react-router-dom";
import { UploadArea } from "./UploadArea";
import { JobList } from "./JobList";
import { TranscriptView } from "./TranscriptView";

function Home() {
  return (
    <div className="space-y-8">
      <UploadArea onSuccess={() => { /* polling handles refresh */ }} />

      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Transcriptions
        </h2>
        <JobList />
      </div>
    </div>
  );
}

export function V4App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-6">
          <Link
            to="/4"
            className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-zinc-100 transition-colors hover:text-white"
          >
            {/* Waveform icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
              stroke="currentColor"
              className="h-5 w-5 text-emerald-500"
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
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Routes>
          <Route index element={<Home />} />
          <Route path=":id" element={<TranscriptView />} />
        </Routes>
      </main>
    </div>
  );
}
