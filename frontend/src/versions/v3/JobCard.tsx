import { Link } from "react-router-dom";
import type { Transcription, TranscriptionStatus } from "../../types";
import { STATUS_LABELS } from "../../utils/status";
import { timeAgo } from "../../utils/time";

interface JobCardProps {
  job: Transcription;
  onDelete: (id: string) => void;
}

const STATUS_PILL: Record<TranscriptionStatus, string> = {
  pending: "bg-[#33261c]/[0.06] text-[#8c7a6b]",
  processing: "bg-[#b45309]/10 text-[#b45309]",
  completed: "bg-[#15803d]/10 text-[#15803d]",
  failed: "bg-[#b91c1c]/10 text-[#b91c1c]",
};

export function JobCard({ job, onDelete }: JobCardProps) {
  return (
    <Link
      to={job.id}
      className="group relative flex flex-col justify-between rounded-2xl border border-[#e8ddd0] bg-[#fffcf7] p-5 shadow-[0_2px_16px_rgba(51,38,28,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(51,38,28,0.08)] hover:border-[#b45309]/30"
    >
      {/* Top row: file name + delete */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-['Fraunces',serif] text-[15px] font-normal text-[#33261c]">
            {job.file_name}
          </p>
        </div>

        {/* Delete button -- appears on hover */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(job.id);
          }}
          className="flex-shrink-0 rounded-lg p-1.5 text-[#e8ddd0] opacity-0 transition-all duration-200 hover:bg-[#b91c1c]/5 hover:text-[#b91c1c] group-hover:opacity-100"
          aria-label="Delete transcription"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      {/* Bottom row: status pill + time */}
      <div className="mt-4 flex items-center gap-3">
        {/* Status pill */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-['DM_Sans',sans-serif] text-xs font-medium ${STATUS_PILL[job.status]}`}
        >
          {job.status === "processing" && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#b45309] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#b45309]" />
            </span>
          )}
          {STATUS_LABELS[job.status]}
        </span>

        {/* Spacer */}
        <span className="flex-1" />

        {/* Time ago */}
        <span className="font-['JetBrains_Mono',monospace] text-[11px] text-[#8c7a6b]/70">
          {timeAgo(job.created_at)}
        </span>
      </div>
    </Link>
  );
}
