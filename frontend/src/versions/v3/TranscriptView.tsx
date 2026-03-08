import { Link, useParams } from "react-router-dom";
import { useTranscription } from "../../hooks/useTranscription";
import { STATUS_LABELS } from "../../utils/status";
import { formatDate } from "../../utils/time";
import type { TranscriptionStatus } from "../../types";

interface Segment {
  start: number;
  end: number;
  text: string;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function isSegmentArray(value: unknown): value is Segment[] {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return false;
  const first = value[0] as Record<string, unknown>;
  return (
    typeof first === "object" &&
    first !== null &&
    "start" in first &&
    "text" in first
  );
}

const STATUS_PILL: Record<TranscriptionStatus, string> = {
  pending: "bg-[#33261c]/[0.06] text-[#8c7a6b]",
  processing: "bg-[#b45309]/10 text-[#b45309]",
  completed: "bg-[#15803d]/10 text-[#15803d]",
  failed: "bg-[#b91c1c]/10 text-[#b91c1c]",
};

/* Small ornamental divider */
function OrnamentDivider() {
  return (
    <div className="flex items-center justify-center py-6">
      <svg viewBox="0 0 120 16" fill="none" className="h-4 w-[120px] text-[#e8ddd0]">
        <line x1="0" y1="8" x2="48" y2="8" stroke="currentColor" strokeWidth="1" />
        <path
          d="M56 8 L60 4 L64 8 L60 12 Z"
          fill="currentColor"
        />
        <line x1="72" y1="8" x2="120" y2="8" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  );
}

export function TranscriptView() {
  const { id } = useParams<{ id: string }>();
  const { job, loading, error } = useTranscription(id);

  /* ---- Loading skeleton ---- */
  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-5 w-36 rounded-lg bg-[#33261c]/[0.04]" />
        <div className="rounded-2xl border border-[#e8ddd0] bg-[#fffcf7] p-8 sm:p-10">
          <div className="h-8 w-72 rounded-lg bg-[#33261c]/[0.04]" />
          <div className="mt-4 flex gap-3">
            <div className="h-5 w-20 rounded-full bg-[#33261c]/[0.04]" />
            <div className="h-5 w-40 rounded bg-[#33261c]/[0.03]" />
          </div>
          <div className="my-8 h-px bg-[#e8ddd0]" />
          <div className="space-y-4">
            <div className="h-4 w-full rounded bg-[#33261c]/[0.03]" />
            <div className="h-4 w-5/6 rounded bg-[#33261c]/[0.03]" />
            <div className="h-4 w-4/6 rounded bg-[#33261c]/[0.03]" />
            <div className="h-4 w-full rounded bg-[#33261c]/[0.03]" />
            <div className="h-4 w-3/4 rounded bg-[#33261c]/[0.03]" />
          </div>
        </div>
      </div>
    );
  }

  /* ---- Error / not found ---- */
  if (error || !job) {
    return (
      <div className="space-y-8">
        <Link
          to="/3"
          className="inline-flex items-center gap-2 font-['DM_Sans',sans-serif] text-sm font-medium text-[#8c7a6b] transition-colors duration-200 hover:text-[#b45309]"
        >
          <span className="text-base">{"\u2190"}</span>
          All transcriptions
        </Link>

        <div className="flex flex-col items-center rounded-2xl border border-[#e8ddd0] bg-[#fffcf7] px-8 py-20 shadow-[0_2px_16px_rgba(51,38,28,0.04)]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#b91c1c]/5">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-6 w-6 text-[#b91c1c]/60"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="font-['DM_Sans',sans-serif] text-sm font-medium text-[#33261c]">
            {error ?? "Transcription not found"}
          </p>
        </div>
      </div>
    );
  }

  const segments: Segment[] | null =
    job.result_json && "segments" in job.result_json
      ? isSegmentArray(job.result_json.segments)
        ? (job.result_json.segments as Segment[])
        : null
      : null;

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        to="/3"
        className="inline-flex items-center gap-2 font-['DM_Sans',sans-serif] text-sm font-medium text-[#8c7a6b] transition-colors duration-200 hover:text-[#b45309]"
      >
        <span className="text-base">{"\u2190"}</span>
        All transcriptions
      </Link>

      {/* Main card */}
      <div className="rounded-2xl border border-[#e8ddd0] bg-[#fffcf7] p-8 shadow-[0_4px_30px_rgba(51,38,28,0.06)] sm:p-10">
        {/* ---- Header ---- */}
        <div className="space-y-4">
          <h1 className="font-['Fraunces',serif] text-3xl font-normal text-[#33261c]">
            {job.file_name}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-['DM_Sans',sans-serif] text-xs font-medium ${STATUS_PILL[job.status]}`}
            >
              {STATUS_LABELS[job.status]}
            </span>
            <span className="font-['DM_Sans',sans-serif] text-sm text-[#8c7a6b]">
              {formatDate(job.created_at)}
            </span>
          </div>
        </div>

        {/* Ornamental divider */}
        <OrnamentDivider />

        {/* ---- Failed ---- */}
        {job.status === "failed" && job.error && (
          <div className="rounded-xl bg-[#b91c1c]/5 px-5 py-4">
            <p className="font-['DM_Sans',sans-serif] text-sm text-[#b91c1c]">
              {job.error}
            </p>
          </div>
        )}

        {/* ---- Pending / processing ---- */}
        {(job.status === "pending" || job.status === "processing") && (
          <div className="flex flex-col items-center py-16">
            {/* Warm amber spinner */}
            <svg
              className="h-8 w-8 animate-spin text-[#b45309]"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
                className="opacity-20"
              />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <p className="mt-5 font-['Fraunces',serif] text-lg italic text-[#8c7a6b]">
              {job.status === "pending"
                ? "Waiting to begin\u2026"
                : "Transcribing your recording\u2026"}
            </p>
            <p className="mt-2 font-['DM_Sans',sans-serif] text-xs text-[#8c7a6b]/60">
              This may take a moment
            </p>
          </div>
        )}

        {/* ---- Completed transcript ---- */}
        {job.status === "completed" && (
          <div className="space-y-10">
            {/* Plain text */}
            {job.result_text && (
              <p className="whitespace-pre-wrap font-['DM_Sans',sans-serif] text-base leading-[1.9] text-[#33261c]">
                {job.result_text}
              </p>
            )}

            {/* Segments with timestamps */}
            {segments && segments.length > 0 && (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#e8ddd0]" />
                  <span className="font-['DM_Sans',sans-serif] text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8c7a6b]/60">
                    Timestamped Segments
                  </span>
                  <div className="h-px flex-1 bg-[#e8ddd0]" />
                </div>
                <div className="space-y-1">
                  {segments.map((seg, i) => (
                    <div
                      key={i}
                      className="group/seg flex gap-4 rounded-lg border-l-[3px] border-transparent px-4 py-2.5 transition-all duration-200 hover:border-l-[#b45309] hover:bg-[#f8f0e3]/50"
                    >
                      <span className="flex-shrink-0 pt-0.5 font-['JetBrains_Mono',monospace] text-xs tabular-nums text-[#8c7a6b]/50">
                        {formatTimestamp(seg.start)}
                      </span>
                      <span className="font-['DM_Sans',sans-serif] text-[15px] leading-relaxed text-[#33261c]/90">
                        {seg.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
