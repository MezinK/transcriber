import { useTranscriptions } from "../../hooks/useTranscriptions";
import { useDeleteJob } from "../../hooks/useDeleteJob";
import { JobCard } from "./JobCard";

export function JobGrid() {
  const { jobs, loading, error, refresh } = useTranscriptions();
  const { deleteJob } = useDeleteJob(refresh);

  /* ---- Loading skeletons ---- */
  if (loading && jobs.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-[#e8ddd0] bg-[#fffcf7] p-5"
          >
            <div className="h-4 w-3/4 rounded-lg bg-[#33261c]/[0.04]" />
            <div className="mt-5 flex items-center gap-3">
              <div className="h-5 w-20 rounded-full bg-[#33261c]/[0.04]" />
              <span className="flex-1" />
              <div className="h-4 w-12 rounded bg-[#33261c]/[0.03]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ---- Error state ---- */
  if (error) {
    return (
      <div className="rounded-2xl border border-[#b91c1c]/10 bg-[#b91c1c]/5 px-6 py-5 text-center">
        <p className="font-['DM_Sans',sans-serif] text-sm font-medium text-[#b91c1c]">
          {error}
        </p>
        <button
          type="button"
          onClick={refresh}
          className="mt-2 font-['DM_Sans',sans-serif] text-sm font-medium text-[#b91c1c]/70 underline decoration-[#b91c1c]/20 underline-offset-2 transition-colors duration-200 hover:text-[#b91c1c]"
        >
          Try again
        </button>
      </div>
    );
  }

  /* ---- Empty state ---- */
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-[#e8ddd0] bg-[#fffcf7] px-8 py-20 shadow-[0_2px_16px_rgba(51,38,28,0.04)]">
        {/* Botanical leaf ornament */}
        <svg
          viewBox="0 0 48 48"
          fill="none"
          className="mb-5 h-12 w-12 text-[#e8ddd0]"
        >
          <path
            d="M24 4C24 4 10 14 10 28c0 8 6 14 14 16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M24 4C24 4 38 14 38 28c0 8-6 14-14 16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="24"
            y1="12"
            x2="24"
            y2="44"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>

        <p className="font-['Fraunces',serif] text-lg italic text-[#8c7a6b]">
          No transcriptions yet
        </p>
        <p className="mt-2 font-['DM_Sans',sans-serif] text-sm text-[#8c7a6b]/70">
          Upload a recording above to get started
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
