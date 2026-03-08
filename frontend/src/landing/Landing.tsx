import { Link } from "react-router-dom";

const VERSIONS = [
  { path: "/1", name: "Clean Neutral", desc: "Minimal and spacious" },
  { path: "/2", name: "Sidebar Nav", desc: "Dashboard with sidebar navigation" },
  { path: "/3", name: "Warm Professional", desc: "Polished with soft accents" },
  { path: "/4", name: "Modern Dark", desc: "Dark theme, easy on the eyes" },
  { path: "/5", name: "Document-Focused", desc: "Reading-first, like a doc editor" },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Transcription App
        </h1>
        <p className="text-gray-500 mb-8">Choose a version to get started.</p>
        <div className="space-y-3">
          {VERSIONS.map((v) => (
            <Link
              key={v.path}
              to={v.path}
              className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="font-medium text-gray-900">{v.name}</div>
              <div className="text-sm text-gray-500">{v.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
