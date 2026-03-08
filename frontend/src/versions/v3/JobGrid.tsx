import { useTranscriptions } from "../../hooks/useTranscriptions";
import { useDeleteJob } from "../../hooks/useDeleteJob";
import { JobCard } from "./JobCard";

export function JobGrid() {
  const { jobs, loading, error, refresh } = useTranscriptions();
  const { deleteJob } = useDeleteJob(refresh);

  /* ---- Loading skeletons in 2-column grid ---- */
  if (loading && jobs.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-950/5"
          >
            <div className="h-4 w-3/4 rounded-md bg-stone-100" />
            <div className="mt-4 flex items-center gap-2.5">
              <div className="h-5 w-20 rounded-full bg-stone-100" />
              <div className="h-5 w-14 rounded-md bg-stone-50" />
              <span className="flex-1" />
              <div className="h-4 w-12 rounded bg-stone-50" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ---- Error state ---- */
  if (error) {
    return (
      <div className="rounded-xl bg-red-50 px-6 py-5 text-center">
        <p className="text-sm font-medium text-red-600">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-2 text-sm font-medium text-red-500 underline decoration-red-300 underline-offset-2 transition-colors hover:text-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  /* ---- Empty state ---- */
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl bg-white px-8 py-16 shadow-sm ring-1 ring-stone-950/5">
        {/* Document icon */}
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-7 w-7 text-stone-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-stone-600">
          No transcriptions yet
        </p>
        <p className="mt-1 text-sm text-stone-400">
          Upload a file above to get started.
        </p>
      </div>
    );
  }

  /* ---- Grid of job cards ---- */
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} onDelete={deleteJob} />
      ))}
    </div>
  );
}
