import { Routes, Route, Link } from "react-router-dom";
import { UploadCard } from "./UploadCard";
import { JobGrid } from "./JobGrid";
import { TranscriptView } from "./TranscriptView";

function Home() {
  return (
    <div className="space-y-12">
      <UploadCard onSuccess={() => { /* polling handles refresh */ }} />

      <div className="space-y-5">
        {/* Section header with decorative lines */}
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-[#e8ddd0]" />
          <h2 className="font-['DM_Sans',sans-serif] text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8c7a6b]/60">
            Your Transcriptions
          </h2>
          <div className="h-px flex-1 bg-[#e8ddd0]" />
        </div>
        <JobGrid />
      </div>
    </div>
  );
}

export function V3App() {
  return (
    <div
      className="min-h-screen bg-[#fdf6ee]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
      }}
    >
      {/* Header */}
      <header className="border-b border-[#e8ddd0]/60 bg-[#fffcf7]/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-6">
          <Link
            to="/3"
            className="flex items-center gap-3 transition-colors duration-200 hover:opacity-80"
          >
            {/* Warm quill / waveform mark */}
            <svg
              viewBox="0 0 28 28"
              fill="none"
              className="h-6 w-6"
            >
              {/* Organic waveform bars in warm amber */}
              <rect x="3" y="10" width="2.5" height="8" rx="1.25" fill="#b45309" opacity="0.5" />
              <rect x="8" y="6" width="2.5" height="16" rx="1.25" fill="#b45309" opacity="0.7" />
              <rect x="13" y="3" width="2.5" height="22" rx="1.25" fill="#b45309" />
              <rect x="18" y="7" width="2.5" height="14" rx="1.25" fill="#b45309" opacity="0.7" />
              <rect x="23" y="11" width="2.5" height="6" rx="1.25" fill="#b45309" opacity="0.5" />
            </svg>
            <span className="font-['Fraunces',serif] text-lg font-normal text-[#33261c]">
              Transcriber
            </span>
          </Link>
        </div>
      </header>

      {/* Keyframe animation for breathe effect */}
      <style>{`
        @keyframes breathe {
          0%, 100% { box-shadow: 0 4px 30px rgba(51,38,28,0.06); }
          50% { box-shadow: 0 4px 30px rgba(51,38,28,0.10); }
        }
      `}</style>

      {/* Main content */}
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Routes>
          <Route index element={<Home />} />
          <Route path=":id" element={<TranscriptView />} />
        </Routes>
      </main>

      {/* Footer ornament */}
      <footer className="pb-10 pt-4">
        <div className="mx-auto flex max-w-3xl items-center justify-center">
          <svg viewBox="0 0 60 12" fill="none" className="h-3 w-[60px] text-[#e8ddd0]">
            <circle cx="30" cy="6" r="2" fill="currentColor" />
            <line x1="6" y1="6" x2="24" y2="6" stroke="currentColor" strokeWidth="1" />
            <line x1="36" y1="6" x2="54" y2="6" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
      </footer>
    </div>
  );
}
