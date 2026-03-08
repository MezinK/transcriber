import { useTranscriptions } from "../../hooks/useTranscriptions";
import { useDeleteJob } from "../../hooks/useDeleteJob";
import { JobCard } from "./JobCard";

export function JobList() {
  const { jobs, loading, error, refresh } = useTranscriptions();
  const { deleteJob } = useDeleteJob(refresh);

  if (loading && jobs.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg border border-slate-100 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1.5 h-2 w-2 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded bg-slate-100" />
                <div className="h-3 w-28 rounded bg-slate-50" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="mb-4 rounded-full bg-slate-100 p-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-6 w-6 text-slate-300"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-500">
          No transcriptions yet
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Upload a file to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} onDelete={deleteJob} />
      ))}
    </div>
  );
}
