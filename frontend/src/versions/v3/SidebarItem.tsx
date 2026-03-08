import { timeAgo } from "../../utils/time";
import type { Transcription, TranscriptionStatus } from "../../types";

const DOT_COLOR: Record<TranscriptionStatus, string> = {
  pending: "bg-indigo-300",
  processing: "bg-violet-400",
  completed: "bg-emerald-400",
  failed: "bg-rose-400",
};

interface SidebarItemProps {
  job: Transcription;
  isActive: boolean;
  onClick: () => void;
}

export function SidebarItem({ job, isActive, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-5 py-2.5 cursor-pointer transition-all flex items-center gap-3 ${
        isActive
          ? "bg-white/10 ring-1 ring-indigo-500/30"
          : "hover:bg-white/5"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_COLOR[job.status]}`}
      />
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm truncate ${
            isActive ? "text-white" : "text-slate-300"
          }`}
        >
          {job.source_filename}
        </p>
        <p className="text-xs text-slate-500">{timeAgo(job.created_at)}</p>
      </div>
    </button>
  );
}
