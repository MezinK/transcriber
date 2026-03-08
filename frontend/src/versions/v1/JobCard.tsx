import { Link } from "react-router-dom";
import type { Transcription, TranscriptionStatus } from "../../types";
import { STATUS_LABELS } from "../../utils/status";
import { timeAgo } from "../../utils/time";

const DOT_COLORS: Record<TranscriptionStatus, string> = {
  pending: "bg-[#6b6560]",
  processing: "bg-amber-500",
  completed: "bg-[#c43e1c]",
  failed: "bg-red-600",
};

const LABEL_COLORS: Record<TranscriptionStatus, string> = {
  pending: "text-[#6b6560]",
  processing: "text-amber-600",
  completed: "text-[#c43e1c]",
  failed: "text-red-600",
};

interface JobCardProps {
  job: Transcription;
  onDelete: (id: string) => void;
}

export function JobCard({ job, onDelete }: JobCardProps) {
  return (
    <div className="group relative flex items-center justify-between py-5 transition-colors duration-300 hover:bg-[#f5f3ed]">
      {/* Full-row click target */}
      <Link
        to={job.id}
        className="absolute inset-0 z-0"
        aria-label={`View ${job.file_name}`}
      />

      {/* Left: file name + status */}
      <div className="relative z-10 min-w-0 pl-2">
        <p className="truncate font-['Playfair_Display',serif] text-base font-medium text-[#1a1a1a]">
          {job.file_name}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${DOT_COLORS[job.status]}`}
          />
          <span
            className={`font-['DM_Sans',sans-serif] text-[10px] font-medium uppercase tracking-[0.15em] ${LABEL_COLORS[job.status]}`}
          >
            {STATUS_LABELS[job.status]}
          </span>
        </div>
      </div>

      {/* Right: time + delete */}
      <div className="relative z-10 flex items-center gap-4 pr-2">
        <span className="font-['JetBrains_Mono',monospace] text-[11px] text-[#6b6560]">
          {timeAgo(job.created_at)}
        </span>

        {/* Delete × button — appears on hover */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(job.id);
          }}
          className="relative z-20 flex h-6 w-6 items-center justify-center text-[#6b6560]/0 transition-all duration-300 hover:text-[#c43e1c] group-hover:text-[#6b6560] focus:text-[#6b6560]"
          aria-label={`Delete ${job.file_name}`}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          >
            <line x1="1" y1="1" x2="9" y2="9" />
            <line x1="9" y1="1" x2="1" y2="9" />
          </svg>
        </button>
      </div>
    </div>
  );
}
