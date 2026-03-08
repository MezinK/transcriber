import { Link } from "react-router-dom";
import { useTranscriptions } from "../../hooks/useTranscriptions";
import { useDeleteJob } from "../../hooks/useDeleteJob";
import { timeAgo } from "../../utils/time";
import { STATUS_LABELS } from "../../utils/status";
import type { TranscriptionStatus } from "../../types";

function StatusIndicator({ status }: { status: TranscriptionStatus }) {
  // Small red square for completed/processing, empty for others
  const isActive = status === "completed" || status === "processing";
  return (
    <span
      className={`mr-2 inline-block h-1 w-1 ${
        isActive ? "bg-[#dc2626]" : "bg-[#e5e5e5]"
      }`}
    />
  );
}

export function JobList() {
  const { jobs, loading, error, refresh } = useTranscriptions();
  const { deleteJob } = useDeleteJob(refresh);

  if (loading) {
    return (
      <div className="flex gap-8">
        <div className="w-32 shrink-0" />
        <p className="font-['JetBrains_Mono',monospace] text-[11px] text-[#888888]">
          Loading...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex gap-8">
        <div className="w-32 shrink-0" />
        <p className="font-['JetBrains_Mono',monospace] text-[11px] text-[#dc2626]">
          {error}
        </p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex gap-8">
        <div className="w-32 shrink-0">
          <span className="font-['JetBrains_Mono',monospace] text-[10px] uppercase tracking-[0.2em] text-[#888888]">
            Jobs
          </span>
        </div>
        <p className="font-['DM_Sans',sans-serif] text-sm text-[#888888]">
          No transcriptions yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Column headers — Swiss grid */}
      <div className="flex items-baseline gap-8">
        <div className="w-32 shrink-0">
          <span className="font-['JetBrains_Mono',monospace] text-[10px] uppercase tracking-[0.2em] text-[#888888]">
            Jobs
          </span>
        </div>
        <div className="flex flex-1 items-baseline">
          <span className="w-10 shrink-0 font-['JetBrains_Mono',monospace] text-[10px] uppercase tracking-[0.2em] text-[#888888]">
            No.
          </span>
          <span className="flex-1 font-['JetBrains_Mono',monospace] text-[10px] uppercase tracking-[0.2em] text-[#888888]">
            File
          </span>
          <span className="w-24 shrink-0 text-right font-['JetBrains_Mono',monospace] text-[10px] uppercase tracking-[0.2em] text-[#888888]">
            Status
          </span>
          <span className="w-20 shrink-0 text-right font-['JetBrains_Mono',monospace] text-[10px] uppercase tracking-[0.2em] text-[#888888]">
            Time
          </span>
          <span className="w-8 shrink-0" />
        </div>
      </div>

      {/* Top rule */}
      <div className="mt-3 border-t-2 border-[#111111]" />

      {/* Job rows */}
      {jobs.map((job, index) => (
        <div key={job.id}>
          <div className="group flex items-baseline gap-8 transition-colors duration-200 hover:bg-[#f5f5f5]">
            {/* Label column — empty for rows, grid alignment */}
            <div className="w-32 shrink-0" />

            {/* Content area */}
            <div className="flex flex-1 items-baseline py-3">
              {/* Index number */}
              <span className="w-10 shrink-0 font-['JetBrains_Mono',monospace] text-[12px] text-[#888888]">
                {String(index + 1).padStart(2, "0")}
              </span>

              {/* File name */}
              <Link
                to={`/5/${job.id}`}
                className="min-w-0 flex-1 truncate font-['DM_Sans',sans-serif] text-sm font-bold text-[#111111] no-underline transition-colors duration-200 hover:text-[#dc2626]"
              >
                {job.file_name}
              </Link>

              {/* Status with indicator */}
              <span className="flex w-24 shrink-0 items-center justify-end font-['DM_Sans',sans-serif] text-[12px] text-[#888888]">
                <StatusIndicator status={job.status} />
                {STATUS_LABELS[job.status]}
              </span>

              {/* Timestamp */}
              <span className="w-20 shrink-0 text-right font-['JetBrains_Mono',monospace] text-[11px] text-[#888888]">
                {timeAgo(job.created_at)}
              </span>

              {/* Delete button — visible on hover */}
              <span className="flex w-8 shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => deleteJob(job.id)}
                  className="font-['DM_Sans',sans-serif] text-sm text-transparent transition-colors duration-200 group-hover:text-[#888888] group-hover:hover:text-[#dc2626]"
                  aria-label={`Delete ${job.file_name}`}
                >
                  ×
                </button>
              </span>
            </div>
          </div>

          {/* Hairline rule between rows */}
          <div className="ml-32 border-t border-[#111111] opacity-10" />
        </div>
      ))}

      {/* Bottom rule */}
      <div className="border-t border-[#111111]" />
    </div>
  );
}
