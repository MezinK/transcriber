import { Link } from "react-router-dom";
import type { Transcription } from "../../types";
import { STATUS_BG, STATUS_LABELS } from "../../utils/status";
import { timeAgo } from "../../utils/time";

interface JobCardProps {
  job: Transcription;
  onDelete: (id: string) => void;
}

export function JobCard({ job, onDelete }: JobCardProps) {
  return (
    <Link
      to={job.id}
      className="group relative flex flex-col justify-between rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-950/5 transition-all duration-200 hover:shadow-md hover:ring-stone-950/10"
    >
      {/* Top row: file name + delete */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-stone-800">
            {job.file_name}
          </p>
        </div>

        {/* Delete button — visible on hover */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(job.id);
          }}
          className="flex-shrink-0 rounded-lg p-1.5 text-stone-300 opacity-0 transition-all duration-150 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
          aria-label="Delete transcription"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 01.79.7l.5 6a.75.75 0 11-1.49.12l-.5-6a.75.75 0 01.7-.82zm2.84 0a.75.75 0 01.7.82l-.5 6a.75.75 0 11-1.49-.12l.5-6a.75.75 0 01.79-.7z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Bottom row: status pill + meta */}
      <div className="mt-4 flex items-center gap-2.5">
        {/* Status pill */}
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BG[job.status]}`}
        >
          {job.status === "processing" && (
            <svg
              className="mr-1 h-3 w-3 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {STATUS_LABELS[job.status]}
        </span>

        {/* Media type badge */}
        <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
          {job.media_type === "audio" ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="mr-1 h-3 w-3"
            >
              <path d="M3 3.732a1.5 1.5 0 012.305-1.265l6.706 4.267a1.5 1.5 0 010 2.531l-6.706 4.268A1.5 1.5 0 013 12.267V3.732z" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="mr-1 h-3 w-3"
            >
              <path d="M1 4.75C1 3.784 1.784 3 2.75 3h10.5c.966 0 1.75.784 1.75 1.75v6.5A1.75 1.75 0 0113.25 13H2.75A1.75 1.75 0 011 11.25v-6.5zm6.22 1.97a.75.75 0 011.06 0l2 2a.75.75 0 010 1.06l-2 2a.75.75 0 01-1.06-1.06L8.94 9H5.25a.75.75 0 010-1.5h3.69L7.22 5.78a.75.75 0 010-1.06z" />
            </svg>
          )}
          {job.media_type}
        </span>

        {/* Spacer */}
        <span className="flex-1" />

        {/* Time ago */}
        <span className="text-xs text-stone-400">
          {timeAgo(job.created_at)}
        </span>
      </div>
    </Link>
  );
}
