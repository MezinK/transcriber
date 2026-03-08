import { useNavigate } from "react-router-dom";
import type { Transcription, TranscriptionStatus } from "../../types";
import { timeAgo } from "../../utils/time";
import { STATUS_LABEL } from "../../utils/status";

const STATUS_DOT_COLOR: Record<TranscriptionStatus, string> = {
  pending: "bg-stone-400",
  processing: "bg-amber-500",
  completed: "bg-emerald-500",
  failed: "bg-rose-500",
};

const STATUS_RING_COLOR: Record<TranscriptionStatus, string> = {
  pending: "ring-stone-400/30",
  processing: "ring-amber-500/30",
  completed: "ring-emerald-500/30",
  failed: "ring-rose-500/30",
};

const STATUS_TEXT_COLOR: Record<TranscriptionStatus, string> = {
  pending: "text-stone-400",
  processing: "text-amber-500",
  completed: "text-emerald-500",
  failed: "text-rose-500",
};

interface JobCardProps {
  job: Transcription;
  onDelete: (id: string) => void;
}

export function JobCard({ job, onDelete }: JobCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/4/${job.id}`)}
      className="bg-stone-900 rounded-xl p-5 border border-stone-800/60 cursor-pointer
        transition-all duration-200
        hover:translate-y-[-2px] hover:shadow-[0_8px_30px_rgba(245,158,11,0.12)]
        hover:border-stone-700/80
        group"
    >
      {/* Header: status dot + delete */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {job.status === "processing" && (
              <span
                className={`absolute inset-0 rounded-full animate-ping opacity-40 ${STATUS_DOT_COLOR[job.status]}`}
              />
            )}
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ring-4 ${STATUS_DOT_COLOR[job.status]} ${STATUS_RING_COLOR[job.status]}`}
            />
          </span>
          <span className={`text-xs font-medium ${STATUS_TEXT_COLOR[job.status]}`}>
            {STATUS_LABEL[job.status]}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(job.id);
          }}
          className="text-stone-600 hover:text-stone-300 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Delete transcription"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {/* Filename */}
      <p className="text-stone-100 font-medium truncate mb-2 leading-snug">
        {job.source_filename}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-stone-500">{timeAgo(job.created_at)}</span>
        <span className="text-stone-700">&middot;</span>
        <span className="text-stone-500 capitalize">{job.media_type}</span>
      </div>
    </div>
  );
}
