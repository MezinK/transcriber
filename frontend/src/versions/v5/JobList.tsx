import { Link } from "react-router-dom";
import { useTranscriptions } from "../../hooks/useTranscriptions";
import { useDeleteJob } from "../../hooks/useDeleteJob";
import { timeAgo } from "../../utils/time";
import { STATUS_LABELS } from "../../utils/status";

export function JobList() {
  const { jobs, loading, error, refresh } = useTranscriptions();
  const { deleteJob } = useDeleteJob(refresh);

  if (loading) {
    return <p className="py-8 text-sm text-gray-400">Loading...</p>;
  }

  if (error) {
    return <p className="py-8 text-sm text-red-400">{error}</p>;
  }

  if (jobs.length === 0) {
    return <p className="py-8 text-sm text-gray-400">No transcriptions yet.</p>;
  }

  return (
    <ul>
      {jobs.map((job) => (
        <li
          key={job.id}
          className="group flex items-baseline justify-between border-b border-gray-100 py-2.5"
        >
          <div className="flex items-baseline gap-2 min-w-0">
            <Link
              to={`/5/${job.id}`}
              className="truncate text-gray-900 hover:underline"
            >
              {job.file_name}
            </Link>
            <span className="flex-shrink-0 text-sm text-gray-400">
              ({STATUS_LABELS[job.status].toLowerCase()})
            </span>
          </div>
          <div className="flex flex-shrink-0 items-center gap-3 pl-4">
            <span className="text-xs text-gray-400">
              {timeAgo(job.created_at)}
            </span>
            <button
              type="button"
              onClick={() => deleteJob(job.id)}
              className="text-gray-300 opacity-0 transition-all hover:text-gray-600 group-hover:opacity-100"
              aria-label={`Delete ${job.file_name}`}
            >
              &times;
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
