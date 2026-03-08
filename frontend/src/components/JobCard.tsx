import { useNavigate } from "react-router-dom";
import type { Transcription, TranscriptionStatus } from "../types";
import { STATUS_LABEL } from "../utils/status";
import { timeAgo } from "../utils/time";

const STATUS_COLOR: Record<TranscriptionStatus, string> = {
  pending: "bg-sky-500",
  processing: "bg-amber-500",
  completed: "bg-emerald-500",
  failed: "bg-red-500",
};

const STATUS_TEXT: Record<TranscriptionStatus, string> = {
  pending: "text-sky-400",
  processing: "text-amber-400",
  completed: "text-emerald-400",
  failed: "text-red-400",
};

interface JobCardProps {
  job: Transcription;
  onDelete: (id: string) => void;
}

export function JobCard({ job, onDelete }: JobCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/${job.id}`)}
      className="group bg-zinc-900 rounded-lg p-4 cursor-pointer hover:bg-zinc-800/80 transition-all border border-zinc-800/50 hover:border-zinc-700/50 relative"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(job.id);
        }}
        className="absolute top-2.5 right-2.5 text-zinc-700 hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Delete transcription"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3.5 w-3.5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <p className="text-sm text-zinc-200 font-medium truncate pr-6 mb-2">
        {job.source_filename}
      </p>

      <div className="flex items-center gap-2">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_COLOR[job.status]}`}
        />
        <span className={`text-xs ${STATUS_TEXT[job.status]}`}>
          {STATUS_LABEL[job.status]}
        </span>
        <span className="text-xs text-zinc-600 ml-auto">
          {timeAgo(job.created_at)}
        </span>
      </div>
    </div>
  );
}
