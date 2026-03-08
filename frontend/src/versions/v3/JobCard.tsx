import { useNavigate } from "react-router-dom";
import type { Transcription } from "../../types";
import { STATUS_PILL, STATUS_LABEL } from "../../utils/status";
import { timeAgo } from "../../utils/time";

interface JobCardProps {
  job: Transcription;
  onDelete: (id: string) => void;
}

export function JobCard({ job, onDelete }: JobCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/3/${job.id}`)}
      className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-stone-800 truncate">
          {job.source_filename}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(job.id);
          }}
          className="shrink-0 text-stone-300 hover:text-red-500 transition-colors text-lg leading-none"
          title="Delete"
        >
          &times;
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_PILL[job.status]}`}
        >
          {STATUS_LABEL[job.status]}
        </span>
        <span className="text-sm text-stone-400">
          {timeAgo(job.updated_at)}
        </span>
      </div>

      {job.status === "failed" && job.error && (
        <p className="mt-2 text-xs text-red-500 truncate">{job.error}</p>
      )}
    </div>
  );
}
