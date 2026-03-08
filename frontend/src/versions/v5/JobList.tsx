import { useNavigate } from "react-router-dom";
import { useTranscriptions } from "../../hooks/useTranscriptions";
import { useDeleteJob } from "../../hooks/useDeleteJob";
import type { TranscriptionStatus } from "../../types";

function statusText(status: TranscriptionStatus): string | null {
  switch (status) {
    case "pending":
      return "pending";
    case "processing":
      return "processing\u2026";
    case "failed":
      return "failed";
    default:
      return null;
  }
}

function statusClass(status: TranscriptionStatus): string {
  switch (status) {
    case "pending":
      return "text-gray-500";
    case "processing":
      return "text-cyan-400";
    case "failed":
      return "text-red-400";
    default:
      return "";
  }
}

export function JobList() {
  const navigate = useNavigate();
  const { jobs, loading, error, refresh } = useTranscriptions();
  const { deleteJob } = useDeleteJob(refresh);

  if (loading && jobs.length === 0) {
    return <p className="text-gray-600 text-sm">loading&hellip;</p>;
  }

  if (error) {
    return <p className="text-red-400 text-sm">{error}</p>;
  }

  if (jobs.length === 0) {
    return <p className="text-gray-600 text-sm italic">nothing here yet.</p>;
  }

  return (
    <div className="space-y-1">
      {jobs.map((job) => {
        const label = statusText(job.status);
        return (
          <div key={job.id} className="group flex items-baseline gap-1">
            <span
              onClick={() => navigate(`/5/${job.id}`)}
              className="text-sm text-gray-300 hover:text-gray-100 transition-colors cursor-pointer"
            >
              {job.source_filename}
            </span>
            {label && (
              <span className={`text-xs ${statusClass(job.status)}`}>
                ({label})
              </span>
            )}
            <span
              onClick={() => deleteJob(job.id)}
              className="text-gray-700 hover:text-red-400 ml-2 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity select-none"
            >
              &times;
            </span>
          </div>
        );
      })}
    </div>
  );
}
