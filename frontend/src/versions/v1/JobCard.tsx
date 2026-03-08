import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Transcription } from "../../types/index.ts";
import { STATUS_DOT } from "../../utils/status.ts";
import { timeAgo } from "../../utils/time.ts";

interface JobCardProps {
  job: Transcription;
  onDelete: (id: string) => void;
}

export function JobCard({ job, onDelete }: JobCardProps) {
  const navigate = useNavigate();

  const handleClick = useCallback(() => {
    navigate(`/1/${job.id}`);
  }, [navigate, job.id]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(job.id);
    },
    [onDelete, job.id],
  );

  return (
    <div
      onClick={handleClick}
      className="group border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-slate-300 transition-colors duration-200"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[job.status]}`}
          />
          <span className="text-slate-800 font-medium truncate">
            {job.source_filename}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="text-sm text-slate-400">
            {timeAgo(job.created_at)}
          </span>
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all duration-200 text-lg leading-none"
            title="Delete"
          >
            &times;
          </button>
        </div>
      </div>

      {job.status === "failed" && job.error && (
        <p className="mt-2 text-sm text-red-500 pl-5">{job.error}</p>
      )}
    </div>
  );
}
