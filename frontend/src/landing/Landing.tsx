import { Link } from "react-router-dom";

const VERSIONS = [
  { path: "/1", name: "Obsidian", desc: "Arc-inspired, emerald accents, stacked rows" },
  { path: "/2", name: "Void", desc: "Terminal aesthetic, neon green, data tables" },
  { path: "/3", name: "Indigo Night", desc: "Glass-morphism, sidebar layout, indigo glow" },
  { path: "/4", name: "Ember", desc: "Warm dark luxury, amber accents, card grid" },
  { path: "/5", name: "Abyss", desc: "Ultra-minimal, cyan accent, reading-focused" },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-semibold text-zinc-100 mb-1">Transcription App</h1>
        <p className="text-zinc-500 mb-8">Choose a variant.</p>
        <div className="space-y-3">
          {VERSIONS.map((v) => (
            <Link
              key={v.path}
              to={v.path}
              className="block p-4 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all"
            >
              <div className="font-medium text-zinc-100">{v.name}</div>
              <div className="text-sm text-zinc-500">{v.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
