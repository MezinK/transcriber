import { Routes, Route, Link } from "react-router-dom";
import { UploadArea } from "./UploadArea";
import { JobList } from "./JobList";
import { TranscriptView } from "./TranscriptView";

/* ---------- Background Orbs + Noise Overlay ---------- */
function Atmosphere() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Near-black base */}
      <div className="absolute inset-0 bg-[#0a0a0f]" />

      {/* Cyan orb — top-left */}
      <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-cyan-500/[0.07] blur-[160px]" />

      {/* Violet orb — bottom-right */}
      <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-500/[0.06] blur-[140px]" />

      {/* Subtle center fill */}
      <div className="absolute left-1/2 top-1/2 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.02] blur-[120px]" />

      {/* SVG noise texture */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.03]">
        <filter id="v4noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#v4noise)" />
      </svg>
    </div>
  );
}

/* ---------- Header Logo Icon (hexagonal scanner) ---------- */
function LogoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2Z"
        stroke="url(#logoGrad)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 8V16M9 10L12 8L15 10M9 14L12 16L15 14"
        stroke="url(#logoGrad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="logoGrad" x1="3" y1="2" x2="21" y2="22">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Home() {
  return (
    <div className="space-y-10">
      <UploadArea onSuccess={() => {}} />

      <div className="space-y-4">
        <h2 className="font-['Outfit',sans-serif] text-xs font-medium uppercase tracking-[0.2em] text-[#5a5a70]">
          Transcriptions
        </h2>
        <JobList />
      </div>
    </div>
  );
}

export function V4App() {
  return (
    <div className="relative min-h-screen font-['DM_Sans',sans-serif] text-[#f0f0f5]">
      <Atmosphere />

      {/* Header — floating glass bar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-6">
          <Link
            to="/4"
            className="group flex items-center gap-2.5 font-['Outfit',sans-serif] text-sm font-medium tracking-tight text-[#f0f0f5] transition-colors duration-300 hover:text-cyan-400"
          >
            <LogoIcon />
            <span>Transcription</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Routes>
          <Route index element={<Home />} />
          <Route path=":id" element={<TranscriptView />} />
        </Routes>
      </main>
    </div>
  );
}
