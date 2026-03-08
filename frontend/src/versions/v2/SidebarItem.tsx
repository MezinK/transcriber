import { NavLink } from "react-router-dom";
import type { Transcription } from "../../types";
import { STATUS_LABELS } from "../../utils/status";
import { timeAgo } from "../../utils/time";

/** Sidebar status dot colours — tailored for dark background legibility. */
const DOT_COLOR: Record<Transcription["status"], string> = {
  pending: "bg-slate-500",
  processing: "bg-amber-400",
  completed: "bg-emerald-400",
  failed: "bg-red-400",
};

interface SidebarItemProps {
  job: Transcription;
  onDelete: (id: string) => void;
}

export function SidebarItem({ job, onDelete }: SidebarItemProps) {
  return (
    <NavLink
      to={`/2/${job.id}`}
      className={({ isActive }) =>
        `group relative flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors duration-100 ${
          isActive
            ? "bg-indigo-600/20 text-white"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`
      }
    >
      {/* Status dot */}
      <span className="relative mt-1.5 flex-shrink-0">
        <span
          className={`block h-2 w-2 rounded-full ${DOT_COLOR[job.status]}`}
        />
        {job.status === "processing" && (
          <span
            className={`absolute inset-0 h-2 w-2 animate-ping rounded-full ${DOT_COLOR[job.status]} opacity-75`}
          />
        )}
      </span>

      {/* Text content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-snug">
          {job.file_name}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
          <span>{STATUS_LABELS[job.status]}</span>
          <span className="text-slate-700">&middot;</span>
          <span>{timeAgo(job.created_at)}</span>
        </p>
      </div>

      {/* Delete button — appears on hover */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(job.id);
        }}
        className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded text-slate-600 opacity-0 transition-all hover:bg-slate-700 hover:text-slate-300 group-hover:opacity-100"
        aria-label={`Delete ${job.file_name}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3.5 w-3.5"
        >
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </NavLink>
  );
}
