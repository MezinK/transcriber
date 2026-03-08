import { Routes, Route, Link } from "react-router-dom";
import { UploadButton } from "./UploadButton";
import { JobList } from "./JobList";
import { TranscriptView } from "./TranscriptView";

function Home() {
  return (
    <div>
      <JobList />
    </div>
  );
}

export function V5App() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Minimal header */}
        <header className="mb-10 flex items-center justify-between">
          <Link
            to="/5"
            className="text-base font-medium text-gray-900 hover:text-gray-600 transition-colors"
          >
            Transcription
          </Link>
          <UploadButton />
        </header>

        {/* Routes */}
        <main>
          <Routes>
            <Route index element={<Home />} />
            <Route path=":id" element={<TranscriptView />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
