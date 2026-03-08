import { Routes, Route, Link } from "react-router-dom";
import { UploadArea } from "./UploadArea";
import { JobList } from "./JobList";
import { TranscriptView } from "./TranscriptView";

function Home() {
  return (
    <div className="relative">
      {/* Editorial masthead area */}
      <div className="mb-16 pt-4">
        <UploadArea onSuccess={() => {}} />
      </div>

      {/* Transcriptions section */}
      <div>
        <div className="mb-8 flex items-baseline gap-6">
          <h2 className="font-['Playfair_Display',serif] text-2xl font-semibold tracking-tight text-[#1a1a1a]">
            Transcriptions
          </h2>
          <div className="h-px flex-1 bg-[#e8e4de]" />
        </div>
        <JobList />
      </div>
    </div>
  );
}

export function V1App() {
  return (
    <div className="relative min-h-screen bg-[#faf9f6]">
      {/* Subtle paper grain texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Header */}
      <header className="border-b border-[#e8e4de]">
        <div className="mx-auto flex h-16 max-w-4xl items-baseline px-8 pt-5">
          <Link
            to="/1"
            className="font-['Playfair_Display',serif] text-xl font-bold tracking-tight text-[#1a1a1a] transition-colors duration-300 hover:text-[#c43e1c]"
          >
            Transcriber
          </Link>
          <span className="ml-3 font-['DM_Sans',sans-serif] text-[10px] font-medium uppercase tracking-[0.2em] text-[#6b6560]">
            Editorial
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-4xl px-8 py-12">
        <Routes>
          <Route index element={<Home />} />
          <Route path=":id" element={<TranscriptView />} />
        </Routes>
      </main>

      {/* Footer rule */}
      <div className="mx-auto max-w-4xl px-8">
        <div className="h-px bg-[#e8e4de]" />
      </div>
    </div>
  );
}
