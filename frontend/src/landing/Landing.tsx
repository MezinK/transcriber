import { Link } from "react-router-dom";

const VERSIONS = [
  {
    path: "/1",
    name: "Editorial Ink",
    desc: "High-contrast serif typography with dramatic editorial layout",
    accent: "#1a1a1a",
    bg: "bg-[#faf9f6]",
    border: "border-[#1a1a1a]",
    hover: "hover:bg-[#1a1a1a] hover:text-[#faf9f6]",
    font: "font-['Playfair_Display',serif]",
    number: "01",
  },
  {
    path: "/2",
    name: "Midnight Command",
    desc: "Premium dark command center with luminous accents",
    accent: "#818cf8",
    bg: "bg-[#0c0c1d]",
    border: "border-indigo-500/30",
    hover: "hover:bg-indigo-500/10 hover:border-indigo-400/60",
    font: "font-['Sora',sans-serif]",
    number: "02",
  },
  {
    path: "/3",
    name: "Warm Craft",
    desc: "Textured warmth with artisanal character and organic forms",
    accent: "#b45309",
    bg: "bg-[#fdf6ee]",
    border: "border-amber-800/20",
    hover: "hover:bg-amber-900/5 hover:border-amber-700/40",
    font: "font-['Fraunces',serif]",
    number: "03",
  },
  {
    path: "/4",
    name: "Neon Glass",
    desc: "Glassmorphism with vivid gradients on deep dark surfaces",
    accent: "#06b6d4",
    bg: "bg-[#0a0a0f]",
    border: "border-cyan-400/20",
    hover: "hover:bg-cyan-400/5 hover:border-cyan-400/50",
    font: "font-['Outfit',sans-serif]",
    number: "04",
  },
  {
    path: "/5",
    name: "Swiss Typo",
    desc: "International typographic style with grid discipline and bold hierarchy",
    accent: "#dc2626",
    bg: "bg-white",
    border: "border-neutral-900",
    hover: "hover:bg-neutral-900 hover:text-white",
    font: "font-['DM_Sans',sans-serif]",
    number: "05",
  },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-[#0e0e12] text-white relative overflow-hidden">
      {/* Grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Subtle gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/8 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/6 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-20">
        {/* Header */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-6">
            {/* Audio waveform icon */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-white/60">
              <rect x="2" y="12" width="3" height="8" rx="1.5" fill="currentColor" opacity="0.5" />
              <rect x="8" y="8" width="3" height="16" rx="1.5" fill="currentColor" opacity="0.7" />
              <rect x="14" y="4" width="3" height="24" rx="1.5" fill="currentColor" />
              <rect x="20" y="9" width="3" height="14" rx="1.5" fill="currentColor" opacity="0.7" />
              <rect x="26" y="11" width="3" height="10" rx="1.5" fill="currentColor" opacity="0.5" />
            </svg>
            <span className="text-sm font-['JetBrains_Mono',monospace] text-white/40 tracking-widest uppercase">
              Transcribe
            </span>
          </div>
          <h1 className="font-['Instrument_Serif',serif] text-5xl md:text-6xl leading-[1.1] text-white/90 mb-4">
            Five ways to see<br />
            <span className="italic text-white/50">your words.</span>
          </h1>
          <p className="text-lg text-white/30 font-['DM_Sans',sans-serif] max-w-md">
            Upload audio or video. Get transcriptions. Same engine, five distinct interfaces.
          </p>
        </div>

        {/* Version links */}
        <div className="space-y-3">
          {VERSIONS.map((v) => (
            <Link
              key={v.path}
              to={v.path}
              className="group flex items-center gap-6 py-5 px-6 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
            >
              <span className="font-['JetBrains_Mono',monospace] text-sm text-white/20 group-hover:text-white/50 transition-colors tabular-nums">
                {v.number}
              </span>
              <div className="flex-1 min-w-0">
                <div className={`text-lg text-white/80 group-hover:text-white transition-colors ${v.font}`}>
                  {v.name}
                </div>
                <div className="text-sm text-white/25 group-hover:text-white/40 transition-colors font-['DM_Sans',sans-serif] mt-0.5">
                  {v.desc}
                </div>
              </div>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                className="text-white/10 group-hover:text-white/40 group-hover:translate-x-1 transition-all duration-300 shrink-0"
              >
                <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-white/[0.06]">
          <p className="text-xs text-white/15 font-['JetBrains_Mono',monospace] tracking-wide">
            Powered by Faster Whisper
          </p>
        </div>
      </div>
    </div>
  );
}
