import { useTranscriptions } from "../../hooks/useTranscriptions";
import { useDeleteJob } from "../../hooks/useDeleteJob";
import { JobRow } from "./JobRow";

export function JobList() {
  const { jobs, loading, error, refresh } = useTranscriptions();
  const { deleteJob } = useDeleteJob(refresh);

  /* ---- Loading skeletons ---- */
  if (loading && jobs.length === 0) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg border-l-4 border-l-zinc-800 bg-zinc-900 px-5 py-4"
          >
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-md bg-zinc-800" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-zinc-800" />
                <div className="h-3 w-1/3 rounded bg-zinc-800/60" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ---- Error state ---- */
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-6 py-5 text-center">
        <p className="text-sm font-medium text-red-400">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-2 text-xs font-medium text-red-400/70 underline decoration-red-500/30 underline-offset-2 transition-colors hover:text-red-300"
        >
          Try again
        </button>
      </div>
    );
  }

  /* ---- Empty state ---- */
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-zinc-800 bg-zinc-900/50 px-8 py-16">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-6 w-6 text-zinc-600"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-400">
          No transcriptions yet
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          Upload a file to get started
        </p>
      </div>
    );
  }

  /* ---- Job rows ---- */
  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <JobRow key={job.id} job={job} onDelete={deleteJob} />
      ))}
    </div>
  );
}
