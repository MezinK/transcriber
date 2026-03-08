import { Routes, Route, Link } from "react-router-dom";
import { UploadButton } from "./UploadButton";
import { JobList } from "./JobList";
import { TranscriptView } from "./TranscriptView";

function Home() {
  return (
    <div>
      <UploadButton />
      <div className="mt-16">
        <JobList />
      </div>
    </div>
  );
}

export function V5App() {
  return (
    <div className="min-h-screen bg-white font-['DM_Sans',sans-serif]">
      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* Header — Swiss grid: label left, content right */}
        <header className="flex items-baseline gap-8">
          <div className="w-32 shrink-0">
            <Link
              to="/5"
              className="font-['JetBrains_Mono',monospace] text-[10px] uppercase tracking-[0.2em] text-[#888888] transition-colors duration-200 hover:text-[#111111]"
            >
              Index
            </Link>
          </div>
          <div className="flex-1">
            <Link
              to="/5"
              className="text-xl font-black text-[#111111] no-underline transition-colors duration-200 hover:text-[#dc2626]"
            >
              Transcriber
            </Link>
          </div>
        </header>

        {/* Red structural accent line */}
        <div className="mt-6 h-1 bg-[#dc2626]" />

        {/* Content */}
        <main className="mt-12">
          <Routes>
            <Route index element={<Home />} />
            <Route path=":id" element={<TranscriptView />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
