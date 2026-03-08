import { useNavigate } from "react-router-dom";
import type { Transcription } from "../../types";
import { SidebarItem } from "./SidebarItem";

type Tab = "transcriptions" | "workers";

interface SidebarProps {
  jobs: Transcription[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  currentJobId: string | undefined;
  onUploadClick: () => void;
}

const NAV_ITEMS: { key: Tab; label: string }[] = [
  { key: "transcriptions", label: "Transcriptions" },
  { key: "workers", label: "Workers" },
];

export function Sidebar({
  jobs,
  activeTab,
  onTabChange,
  currentJobId,
  onUploadClick,
}: SidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className="w-72 min-h-screen bg-slate-900 flex flex-col shrink-0">
      {/* App title */}
      <div className="px-5 py-4">
        <h1 className="text-white text-lg font-semibold">Transcriber</h1>
      </div>

      {/* Nav section */}
      <nav className="mt-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`
                w-full text-left px-5 py-2 text-sm cursor-pointer transition-colors duration-150
                ${
                  isActive
                    ? "text-white border-l-2 border-indigo-500 bg-slate-800"
                    : "text-slate-400 hover:text-slate-200 border-l-2 border-transparent"
                }
              `}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Job list section (only when Transcriptions tab active) */}
      {activeTab === "transcriptions" && (
        <div className="flex-1 overflow-y-auto mt-4 flex flex-col">
          <div className="px-5 mb-3">
            <button
              onClick={onUploadClick}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded px-3 py-1.5 transition-colors duration-150"
            >
              + Upload
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {jobs.map((job) => (
              <SidebarItem
                key={job.id}
                job={job}
                isActive={job.id === currentJobId}
                onClick={() => navigate(`/2/${job.id}`)}
              />
            ))}

            {jobs.length === 0 && (
              <p className="px-5 text-sm text-slate-500">No transcriptions yet</p>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
