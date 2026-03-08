import { Link } from "react-router-dom";
import type { Transcription } from "../../types";
import { STATUS_LABELS } from "../../utils/status";
import { timeAgo } from "../../utils/time";

const DOT_COLORS: Record<Transcription["status"], string> = {
  pending: "bg-gray-400",
  processing: "bg-amber-400",
  completed: "bg-green-500",
  failed: "bg-red-500",
};

interface JobCardProps {
  job: Transcription;
  onDelete: (id: string) => void;
}

export function JobCard({ job, onDelete }: JobCardProps) {
  return (
    <div className="group relative border border-slate-200 rounded-lg p-4 hover:border-slate-300 hover:shadow-sm transition-all duration-150">
      <Link to={job.id} className="absolute inset-0 z-0 rounded-lg" aria-label={`View ${job.file_name}`} />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Status dot */}
          <span
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT_COLORS[job.status]}`}
            title={STATUS_LABELS[job.status]}
          />

          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">
              {job.file_name}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <span>{STATUS_LABELS[job.status]}</span>
              <span aria-hidden="true">&middot;</span>
              <span>{timeAgo(job.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(job.id);
          }}
          className="relative z-20 shrink-0 rounded p-1 text-slate-300 opacity-0 transition-opacity duration-150 hover:bg-slate-100 hover:text-slate-500 group-hover:opacity-100 focus:opacity-100"
          aria-label={`Delete ${job.file_name}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
