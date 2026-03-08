import type { Transcription } from "../../types";
import { STATUS_DOT } from "../../utils/status";
import { timeAgo } from "../../utils/time";

interface SidebarItemProps {
  job: Transcription;
  isActive: boolean;
  onClick: () => void;
}

export function SidebarItem({ job, isActive, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full px-5 py-2.5 cursor-pointer flex items-center gap-3 text-left
        transition-colors duration-150
        ${isActive ? "bg-slate-800" : "hover:bg-slate-800/50"}
      `}
    >
      <span
        className={`shrink-0 w-1.5 h-1.5 rounded-full ${STATUS_DOT[job.status]}`}
      />
      <span
        className={`text-sm truncate flex-1 ${isActive ? "text-white" : "text-slate-300"}`}
      >
        {job.source_filename}
      </span>
      <span className="text-xs text-slate-500 shrink-0">
        {timeAgo(job.created_at)}
      </span>
    </button>
  );
}
