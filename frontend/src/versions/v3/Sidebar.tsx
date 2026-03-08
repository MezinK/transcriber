import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarItem } from "./SidebarItem";
import { useUpload } from "../../hooks/useUpload";
import type { Transcription } from "../../types";

type NavSection = "transcriptions" | "workers";

interface SidebarProps {
  jobs: Transcription[];
  activeNav: NavSection;
  onNavChange: (nav: NavSection) => void;
  onUploadSuccess: () => void;
  currentJobId?: string;
}

export function Sidebar({
  jobs,
  activeNav,
  onNavChange,
  onUploadSuccess,
  currentJobId,
}: SidebarProps) {
  const navigate = useNavigate();
  const { upload, uploading, progress } = useUpload(onUploadSuccess);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload(file);
      e.target.value = "";
    },
    [upload],
  );

  const navItems: { key: NavSection; label: string }[] = [
    { key: "transcriptions", label: "Transcriptions" },
    { key: "workers", label: "Workers" },
  ];

  return (
    <aside className="w-64 min-h-screen bg-white/5 backdrop-blur-md border-r border-white/10 flex flex-col shrink-0">
      <div className="px-5 py-5">
        <h1 className="text-white text-lg font-semibold">Transcriber</h1>
      </div>

      <nav>
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => {
              onNavChange(item.key);
              if (item.key === "workers") navigate("/3/workers");
              else navigate("/3");
            }}
            className={`w-full text-left px-5 py-2.5 text-sm cursor-pointer transition-all ${
              activeNav === item.key
                ? "bg-white/10 border-l-2 border-indigo-400 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {activeNav === "transcriptions" && (
        <>
          <div className="mx-5 my-3">
            <label
              className={`block text-center bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                uploading ? "opacity-60 pointer-events-none" : ""
              }`}
            >
              {uploading && progress
                ? `Uploading ${progress.percent}%`
                : "Upload"}
              <input
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto space-y-0.5">
            {jobs.map((job) => (
              <SidebarItem
                key={job.id}
                job={job}
                isActive={job.id === currentJobId}
                onClick={() => navigate(`/3/${job.id}`)}
              />
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
