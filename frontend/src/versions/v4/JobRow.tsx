import { Link } from "react-router-dom";
import type { Transcription, TranscriptionStatus } from "../../types";
import { STATUS_LABELS } from "../../utils/status";
import { timeAgo } from "../../utils/time";

interface JobRowProps {
  job: Transcription;
  onDelete: (id: string) => void;
}

const BORDER_COLOR: Record<TranscriptionStatus, string> = {
  pending: "border-l-sky-500",
  processing: "border-l-amber-500",
  completed: "border-l-emerald-500",
  failed: "border-l-red-500",
};

const STATUS_TEXT_COLOR: Record<TranscriptionStatus, string> = {
  pending: "text-sky-400",
  processing: "text-amber-400",
  completed: "text-emerald-400",
  failed: "text-red-400",
};

export function JobRow({ job, onDelete }: JobRowProps) {
  return (
    <Link
      to={job.id}
      className={`
        group relative flex items-center gap-4 rounded-lg border-l-4 bg-zinc-900
        px-5 py-4 transition-all duration-200
        hover:bg-zinc-800/80 hover:shadow-lg hover:shadow-black/20
        ${BORDER_COLOR[job.status]}
      `}
    >
      {/* File icon */}
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 transition-colors group-hover:bg-zinc-700 group-hover:text-zinc-300">
        {job.media_type === "audio" ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
            <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M3.25 4A2.25 2.25 0 001 6.25v7.5A2.25 2.25 0 003.25 16h7.5A2.25 2.25 0 0013 13.75v-7.5A2.25 2.25 0 0010.75 4h-7.5zM19 4.75a.75.75 0 00-1.28-.53l-3 3a.75.75 0 00-.22.53v4.5c0 .199.079.39.22.53l3 3a.75.75 0 001.28-.53V4.75z" />
          </svg>
        )}
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100 transition-colors group-hover:text-white">
          {job.file_name}
        </p>
        <div className="mt-1 flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs font-medium ${STATUS_TEXT_COLOR[job.status]}`}>
            {job.status === "processing" && (
              <svg
                className="h-3 w-3 animate-spin"
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
          <span className="text-zinc-600">&middot;</span>
          <span className="text-xs text-zinc-500">
            {timeAgo(job.created_at)}
          </span>
        </div>
      </div>

      {/* Delete button — appears on hover */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(job.id);
        }}
        className="flex-shrink-0 rounded-md p-1.5 text-zinc-600 opacity-0 transition-all duration-150 hover:bg-zinc-700 hover:text-red-400 group-hover:opacity-100"
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

      {/* Hover arrow indicator */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4 flex-shrink-0 text-zinc-700 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-400"
      >
        <path
          fillRule="evenodd"
          d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
          clipRule="evenodd"
        />
      </svg>
    </Link>
  );
}
