import { Routes, Route, Link } from "react-router-dom";
import { UploadArea } from "./UploadArea";
import { JobList } from "./JobList";
import { TranscriptView } from "./TranscriptView";

function Home() {
  return (
    <div className="space-y-8">
      <UploadArea onSuccess={() => { /* polling handles refresh */ }} />
      <div className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Transcriptions
        </h2>
        <JobList />
      </div>
    </div>
  );
}

export function V1App() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-100">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-6">
          <Link
            to="/1"
            className="text-sm font-semibold tracking-tight text-slate-700 hover:text-slate-900 transition-colors"
          >
            Transcription
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-2xl px-6 py-8">
        <Routes>
          <Route index element={<Home />} />
          <Route path=":id" element={<TranscriptView />} />
        </Routes>
      </main>
    </div>
  );
}
