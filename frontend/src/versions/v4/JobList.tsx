import { useTranscriptions } from "../../hooks/useTranscriptions";
import { useDeleteJob } from "../../hooks/useDeleteJob";
import { JobRow } from "./JobRow";

/* ---------- Hexagonal empty-state icon ---------- */
function EmptyIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className="h-12 w-12"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24 4L42.19 14.5V31.5L24 44L5.81 31.5V14.5L24 4Z"
        stroke="#5a5a70"
        strokeWidth="1"
        strokeLinejoin="round"
        opacity="0.4"
      />
      <path
        d="M24 16L32 24L24 32L16 24L24 16Z"
        stroke="#5a5a70"
        strokeWidth="1"
        strokeLinejoin="round"
        opacity="0.25"
      />
    </svg>
  );
}

export function JobList() {
  const { jobs, loading, error, refresh } = useTranscriptions();
  const { deleteJob } = useDeleteJob(refresh);

  /* ---- Loading skeletons — glass shimmers ---- */
  if (loading && jobs.length === 0) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.02] px-5 py-4 backdrop-blur-xl"
          >
            <div className="flex items-center gap-4">
              <div className="h-2 w-2 rounded-full bg-white/[0.06]" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-2/3 rounded bg-white/[0.04]" />
                <div className="h-3 w-1/3 rounded bg-white/[0.03]" />
              </div>
              <div className="h-3 w-12 rounded bg-white/[0.03]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ---- Error state ---- */
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] px-6 py-5 text-center backdrop-blur-xl">
        <p className="font-['DM_Sans',sans-serif] text-sm text-red-400">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-2 font-['DM_Sans',sans-serif] text-xs text-red-400/70 underline decoration-red-500/30 underline-offset-2 transition-colors duration-300 hover:text-red-300"
        >
          Try again
        </button>
      </div>
    );
  }

  /* ---- Empty state ---- */
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-white/[0.06] bg-white/[0.02] px-8 py-16 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="mb-5">
          <EmptyIcon />
        </div>
        <p className="font-['Outfit',sans-serif] text-sm font-light tracking-wide text-[#5a5a70]">
          No transcriptions yet
        </p>
        <p className="mt-1.5 font-['DM_Sans',sans-serif] text-xs text-[#5a5a70]/60">
          Upload a recording to get started
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
