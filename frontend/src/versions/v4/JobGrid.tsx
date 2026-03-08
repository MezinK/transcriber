import { useTranscriptions } from "../../hooks/useTranscriptions";
import { useDeleteJob } from "../../hooks/useDeleteJob";
import { JobCard } from "./JobCard";

export function JobGrid() {
  const { jobs, loading, error, refresh } = useTranscriptions();
  const { deleteJob } = useDeleteJob(refresh);

  if (loading && jobs.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center gap-2 text-stone-500 text-sm">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-rose-500 text-sm">{error}</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-500 text-sm">
          No transcriptions yet. Upload a file to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} onDelete={deleteJob} />
      ))}
    </div>
  );
}
