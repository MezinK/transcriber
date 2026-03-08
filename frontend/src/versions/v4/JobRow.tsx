import { Link } from "react-router-dom";
import type { Transcription, TranscriptionStatus } from "../../types";
import { STATUS_LABELS } from "../../utils/status";
import { timeAgo } from "../../utils/time";

interface JobRowProps {
  job: Transcription;
  onDelete: (id: string) => void;
}

/* ---------- Status dot color (the glowing indicator) ---------- */
const DOT_COLOR: Record<TranscriptionStatus, string> = {
  pending: "bg-[#5a5a70]",
  processing: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]",
  completed: "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]",
  failed: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]",
};

/* ---------- Status text color ---------- */
const STATUS_TEXT: Record<TranscriptionStatus, string> = {
  pending: "text-[#5a5a70]",
  processing: "text-amber-400",
  completed: "text-cyan-400",
  failed: "text-red-400",
};

/* ---------- Left border accent ---------- */
const LEFT_BORDER: Record<TranscriptionStatus, string> = {
  pending: "border-l-[#5a5a70]/30",
  processing: "border-l-amber-500/60",
  completed: "border-l-cyan-400/60",
  failed: "border-l-red-500/40",
};

export function JobRow({ job, onDelete }: JobRowProps) {
  return (
    <Link
      to={job.id}
      className={`
        group relative flex items-center gap-4 overflow-hidden rounded-2xl
        border-l-2 border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl
        px-5 py-4
        shadow-[0_4px_20px_rgba(0,0,0,0.2)]
        transition-all duration-300
        hover:border-white/[0.1] hover:bg-white/[0.05]
        hover:shadow-[0_0_30px_rgba(6,182,212,0.06),0_8px_32px_rgba(0,0,0,0.25)]
        ${LEFT_BORDER[job.status]}
      `}
    >
      {/* Processing glow overlay */}
      {job.status === "processing" && (
        <div className="pointer-events-none absolute inset-0 animate-pulse bg-amber-500/[0.02]" />
      )}

      {/* Status dot */}
      <div className="flex-shrink-0">
        <div
          className={`
            h-2 w-2 rounded-full transition-all duration-300
            ${DOT_COLOR[job.status]}
            ${job.status === "processing" ? "animate-pulse" : ""}
          `}
        />
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-['Outfit',sans-serif] text-sm font-normal text-[#f0f0f5] transition-colors duration-300 group-hover:text-white">
          {job.file_name}
        </p>
        <div className="mt-1 flex items-center gap-3">
          <span className={`font-['DM_Sans',sans-serif] text-xs font-medium ${STATUS_TEXT[job.status]}`}>
            {STATUS_LABELS[job.status]}
          </span>
        </div>
      </div>

      {/* Timestamp */}
      <span className="flex-shrink-0 font-['JetBrains_Mono',monospace] text-xs text-[#5a5a70] transition-colors duration-300 group-hover:text-[#5a5a70]/80">
        {timeAgo(job.created_at)}
      </span>

      {/* Delete button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(job.id);
        }}
        className="flex-shrink-0 p-1 text-[#5a5a70]/40 opacity-0 transition-all duration-300 hover:text-cyan-400 group-hover:opacity-100"
        aria-label="Delete transcription"
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
    </Link>
  );
}
