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

/* ---------- Status mappings ---------- */
const STATUS_DOT: Record<TranscriptionStatus, string> = {
  pending: "bg-[#5a5a70]",
  processing: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]",
  completed: "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]",
  failed: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]",
};

const STATUS_TEXT: Record<TranscriptionStatus, string> = {
  pending: "text-[#5a5a70]",
  processing: "text-amber-400",
  completed: "text-cyan-400",
  failed: "text-red-400",
};

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

export function TranscriptView() {
  const { id } = useParams<{ id: string }>();
  const { job, loading, error } = useTranscription(id);

  /* ---- Loading skeleton ---- */
  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-4 w-24 rounded bg-white/[0.04]" />
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <div className="h-8 w-72 rounded bg-white/[0.04]" />
          <div className="mt-4 flex gap-3">
            <div className="h-5 w-20 rounded-full bg-white/[0.04]" />
            <div className="h-5 w-36 rounded bg-white/[0.03]" />
          </div>
          <div className="mt-8 h-[1px] w-full bg-gradient-to-r from-cyan-400/20 via-violet-500/20 to-transparent" />
          <div className="mt-8 space-y-3">
            <div className="h-4 w-full rounded bg-white/[0.03]" />
            <div className="h-4 w-5/6 rounded bg-white/[0.03]" />
            <div className="h-4 w-4/6 rounded bg-white/[0.03]" />
            <div className="h-4 w-full rounded bg-white/[0.03]" />
            <div className="h-4 w-3/4 rounded bg-white/[0.03]" />
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
          to="/4"
          className="group inline-flex items-center gap-1.5 font-['Outfit',sans-serif] text-sm font-normal text-[#5a5a70] transition-colors duration-300 hover:text-cyan-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
              clipRule="evenodd"
            />
          </svg>
          Back
        </Link>

        <div className="flex flex-col items-center rounded-2xl border border-white/[0.06] bg-white/[0.03] px-8 py-16 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/[0.08]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-6 w-6 text-red-400"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="font-['DM_Sans',sans-serif] text-sm text-[#f0f0f5]/70">
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
        to="/4"
        className="group inline-flex items-center gap-1.5 font-['Outfit',sans-serif] text-sm font-normal text-[#5a5a70] transition-colors duration-300 hover:text-cyan-400"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5"
        >
          <path
            fillRule="evenodd"
            d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
            clipRule="evenodd"
          />
        </svg>
        Back to transcriptions
      </Link>

      {/* Main glass card */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        {/* ---- Header ---- */}
        <div className="space-y-4">
          <h1 className="font-['Outfit',sans-serif] text-3xl font-light tracking-tight text-[#f0f0f5]">
            {job.file_name}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {/* Status badge */}
            <span className={`inline-flex items-center gap-2 text-xs font-medium ${STATUS_TEXT[job.status]}`}>
              <span
                className={`
                  inline-block h-1.5 w-1.5 rounded-full
                  ${STATUS_DOT[job.status]}
                  ${job.status === "processing" ? "animate-pulse" : ""}
                `}
              />
              {STATUS_LABELS[job.status]}
            </span>

            <span className="font-['JetBrains_Mono',monospace] text-xs text-[#5a5a70]">
              {formatDate(job.created_at)}
            </span>

            {job.media_type && (
              <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 font-['JetBrains_Mono',monospace] text-xs text-[#5a5a70]">
                {job.media_type}
              </span>
            )}
          </div>
        </div>

        {/* Gradient divider */}
        <div className="my-7 h-[1px] bg-gradient-to-r from-cyan-400/30 via-violet-500/20 to-transparent" />

        {/* ---- Failed ---- */}
        {job.status === "failed" && job.error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] px-5 py-4 font-['DM_Sans',sans-serif] text-sm text-red-400">
            {job.error}
          </div>
        )}

        {/* ---- Pending / Processing ---- */}
        {(job.status === "pending" || job.status === "processing") && (
          <div className="flex flex-col items-center gap-5 py-16">
            {/* Animated gradient line */}
            <div className="relative h-[2px] w-48 overflow-hidden rounded-full bg-white/[0.04]">
              <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            </div>
            <p className="font-['Outfit',sans-serif] text-sm font-normal italic text-[#5a5a70]">
              {job.status === "pending" ? "Queued for transcription..." : "Transcribing..."}
            </p>
          </div>
        )}

        {/* ---- Completed transcript ---- */}
        {job.status === "completed" && (
          <div className="space-y-8">
            {/* Plain text */}
            {job.result_text && (
              <p className="whitespace-pre-wrap font-['DM_Sans',sans-serif] text-base leading-relaxed text-[#f0f0f5]">
                {job.result_text}
              </p>
            )}

            {/* Segments with timestamps */}
            {segments && segments.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-['Outfit',sans-serif] text-xs font-medium uppercase tracking-[0.2em] text-[#5a5a70]">
                  Timestamped Segments
                </h2>
                <div className="space-y-0.5">
                  {segments.map((seg, i) => (
                    <div
                      key={i}
                      className="group flex gap-4 rounded-xl border-l-2 border-l-transparent px-4 py-2.5 transition-all duration-300 hover:border-l-cyan-400/40 hover:bg-white/[0.02]"
                    >
                      <span className="flex-shrink-0 pt-0.5 font-['JetBrains_Mono',monospace] text-sm tabular-nums text-cyan-400/50 transition-colors duration-300 group-hover:text-cyan-400/80">
                        {formatTimestamp(seg.start)}
                      </span>
                      <span className="font-['DM_Sans',sans-serif] text-sm leading-relaxed text-[#f0f0f5]/80 transition-colors duration-300 group-hover:text-[#f0f0f5]">
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
