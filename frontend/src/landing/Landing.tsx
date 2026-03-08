import { Link } from "react-router-dom";

const VERSIONS = [
  { path: "/1", name: "Minimal Slate", desc: "Notion-inspired, clean and spacious" },
  { path: "/2", name: "Sidebar Dashboard", desc: "Slack-inspired, sidebar navigation" },
  { path: "/3", name: "Warm Rounded", desc: "Stripe-inspired, soft and polished" },
  { path: "/4", name: "Dark Mode", desc: "Arc-inspired, modern and dark" },
  { path: "/5", name: "Document", desc: "Google Docs-inspired, reading-first" },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Transcription App</h1>
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
