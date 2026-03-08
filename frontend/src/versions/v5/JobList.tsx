import { Link } from "react-router-dom";
import { useTranscriptions } from "../../hooks/useTranscriptions";
import { useDeleteJob } from "../../hooks/useDeleteJob";

export function JobList() {
  const { jobs, loading, error, refresh } = useTranscriptions();
  const { deleteJob } = useDeleteJob(refresh);

  if (loading && jobs.length === 0) {
    return <p className="text-sm text-gray-400">Loading...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (jobs.length === 0) {
    return <p className="text-sm text-gray-400 italic">No transcriptions yet.</p>;
  }

  return (
    <ul className="list-none space-y-1">
      {jobs.map((job) => (
        <li key={job.id} className="flex items-center">
          <Link
            to={`/5/${job.id}`}
            className="text-sm text-gray-800 hover:text-gray-600 transition-colors"
          >
            {job.source_filename}
          </Link>
          {job.status !== "completed" && (
            <span className="text-sm text-gray-400 ml-2">
              ({job.status})
            </span>
          )}
          <button
            onClick={() => deleteJob(job.id)}
            className="text-sm text-gray-300 hover:text-red-400 ml-2 cursor-pointer transition-colors"
            aria-label={`Delete ${job.source_filename}`}
          >
            &times;
          </button>
        </li>
      ))}
    </ul>
  );
}
