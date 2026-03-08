import { useParams } from "react-router-dom";
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

/* Status badge dot colors */
const BADGE_DOT: Record<TranscriptionStatus, string> = {
  pending: "bg-[#6b6f8a]",
  processing: "bg-[#fbbf24]",
  completed: "bg-[#34d399]",
  failed: "bg-[#f87171]",
};

const BADGE_TEXT: Record<TranscriptionStatus, string> = {
  pending: "text-[#6b6f8a]",
  processing: "text-[#fbbf24]",
  completed: "text-[#34d399]",
  failed: "text-[#f87171]",
};

export function TranscriptView() {
  const { id } = useParams<{ id: string }>();
  const { job, loading, error } = useTranscription(id);

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="animate-pulse p-8 lg:p-12">
        <div className="max-w-3xl">
          <div className="h-7 w-64 rounded-md bg-[#12122a]" />
          <div className="mt-3 flex gap-3">
            <div className="h-5 w-24 rounded-full bg-[#12122a]" />
            <div className="h-5 w-36 rounded bg-[rgba(129,140,248,0.06)]" />
          </div>
          <div className="mt-1.5 h-px w-full bg-[rgba(129,140,248,0.08)]" />
          <div className="mt-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-4 rounded bg-[rgba(129,140,248,0.04)]"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Error / not found ── */
  if (error || !job) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.06)]">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-6 w-6 text-[#f87171]"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="font-['DM_Sans',sans-serif] text-sm font-medium text-[#e2e4f0]">
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
    <div className="h-full overflow-y-auto bg-gradient-to-b from-[#0c0c1d] to-[#0f0f24] [scrollbar-width:thin] [scrollbar-color:rgba(129,140,248,0.15)_transparent]">
      <div className="mx-auto max-w-3xl px-8 py-8 lg:px-12 lg:py-12">
        {/* ── Header ── */}
        <div className="space-y-3">
          <h1 className="font-['Sora',sans-serif] text-xl font-semibold tracking-tight text-[#e2e4f0]">
            {job.file_name}
          </h1>
          <div className="flex items-center gap-3">
            {/* Status badge */}
            <span className={`inline-flex items-center gap-1.5 rounded-full border border-[rgba(129,140,248,0.1)] bg-[#12122a] px-2.5 py-1 font-['DM_Sans',sans-serif] text-xs font-medium ${BADGE_TEXT[job.status]}`}>
              <span className="relative flex h-2 w-2">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full ${BADGE_DOT[job.status]} ${
                    job.status === "processing" ? "animate-ping opacity-75" : ""
                  }`}
                />
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${BADGE_DOT[job.status]}`}
                />
              </span>
              {STATUS_LABELS[job.status]}
            </span>
            <span className="font-['JetBrains_Mono',monospace] text-xs text-[#6b6f8a]">
              {formatDate(job.created_at)}
            </span>
          </div>
        </div>

        {/* Accent line */}
        <div className="my-6 h-px bg-gradient-to-r from-[#818cf8] via-[rgba(129,140,248,0.2)] to-transparent" />

        {/* ── Failed ── */}
        {job.status === "failed" && job.error && (
          <div className="rounded-lg border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.06)] px-4 py-3 font-['DM_Sans',sans-serif] text-sm text-[#f87171]">
            {job.error}
          </div>
        )}

        {/* ── Pending / processing ── */}
        {(job.status === "pending" || job.status === "processing") && (
          <div className="flex items-center gap-3 py-16">
            <svg
              className="h-5 w-5 animate-spin text-[#818cf8]"
              viewBox="0 0 24 24"
              fill="none"
            >
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="font-['DM_Sans',sans-serif] text-sm font-medium text-[#6b6f8a]">
              {job.status === "pending"
                ? "Waiting to process..."
                : "Transcribing..."}
            </span>
          </div>
        )}

        {/* ── Completed transcript ── */}
        {job.status === "completed" && (
          <div className="space-y-8">
            {/* Plain text */}
            {job.result_text && (
              <div>
                <p className="font-['DM_Sans',sans-serif] text-[15px] leading-relaxed text-[#e2e4f0] whitespace-pre-wrap">
                  {job.result_text}
                </p>
              </div>
            )}

            {/* Segments with timestamps */}
            {segments && segments.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-['Sora',sans-serif] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b6f8a]">
                  Timestamped Segments
                </h2>
                <div className="space-y-0.5">
                  {segments.map((seg, i) => (
                    <div
                      key={i}
                      className="group flex gap-4 rounded-md border-l-2 border-l-[rgba(129,140,248,0.15)] px-4 py-2.5 transition-all duration-200 hover:border-l-[#818cf8] hover:bg-[rgba(129,140,248,0.04)]"
                    >
                      <span className="flex-shrink-0 pt-0.5 font-['JetBrains_Mono',monospace] text-xs tabular-nums text-[#818cf8]/60">
                        {formatTimestamp(seg.start)}
                      </span>
                      <span className="font-['DM_Sans',sans-serif] text-sm leading-relaxed text-[#e2e4f0]/90">
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
