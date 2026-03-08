import { useNavigate } from "react-router-dom";
import type { Transcription, TranscriptionStatus } from "../../types";
import { STATUS_LABEL } from "../../utils/status";
import { timeAgo } from "../../utils/time";

const BORDER_COLOR: Record<TranscriptionStatus, string> = {
  pending: "border-sky-500",
  processing: "border-amber-500",
  completed: "border-emerald-500",
  failed: "border-red-500",
};

const TEXT_COLOR: Record<TranscriptionStatus, string> = {
  pending: "text-sky-500",
  processing: "text-amber-500",
  completed: "text-emerald-500",
  failed: "text-red-500",
};

interface JobRowProps {
  job: Transcription;
  onDelete: (id: string) => void;
}

export function JobRow({ job, onDelete }: JobRowProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/${job.id}`)}
      className={`bg-zinc-900 rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:bg-zinc-800 transition-colors border-l-4 ${BORDER_COLOR[job.status]}`}
    >
      <span className="text-zinc-200 font-medium flex-1 truncate">
        {job.source_filename}
      </span>

      <span className={`text-sm font-medium ${TEXT_COLOR[job.status]}`}>
        {STATUS_LABEL[job.status]}
      </span>

      <span className="text-zinc-500 text-sm whitespace-nowrap">
        {timeAgo(job.created_at)}
      </span>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(job.id);
        }}
        className="text-zinc-600 hover:text-zinc-300 transition-colors"
        aria-label="Delete transcription"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
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
    </div>
  );
}
