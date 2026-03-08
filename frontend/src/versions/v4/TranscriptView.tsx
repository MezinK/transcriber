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

const STATUS_ACCENT: Record<TranscriptionStatus, string> = {
  pending: "text-sky-400",
  processing: "text-amber-400",
  completed: "text-emerald-400",
  failed: "text-red-400",
};

const STATUS_DOT: Record<TranscriptionStatus, string> = {
  pending: "bg-sky-400",
  processing: "bg-amber-400",
  completed: "bg-emerald-400",
  failed: "bg-red-400",
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
      <div className="animate-pulse space-y-6">
        <div className="h-4 w-20 rounded bg-zinc-800" />
        <div className="rounded-lg bg-zinc-900 p-8">
          <div className="h-6 w-64 rounded bg-zinc-800" />
          <div className="mt-3 flex gap-3">
            <div className="h-5 w-20 rounded-full bg-zinc-800" />
            <div className="h-5 w-32 rounded bg-zinc-800/60" />
          </div>
          <div className="mt-8 space-y-3">
            <div className="h-4 w-full rounded bg-zinc-800/50" />
            <div className="h-4 w-5/6 rounded bg-zinc-800/50" />
            <div className="h-4 w-4/6 rounded bg-zinc-800/50" />
            <div className="h-4 w-full rounded bg-zinc-800/50" />
            <div className="h-4 w-3/4 rounded bg-zinc-800/50" />
          </div>
        </div>
      </div>
    );
  }

  /* ---- Error / not found ---- */
  if (error || !job) {
    return (
      <div className="space-y-6">
        <Link
          to="/4"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
              clipRule="evenodd"
            />
          </svg>
          Back
        </Link>

        <div className="flex flex-col items-center rounded-lg border border-zinc-800 bg-zinc-900 px-8 py-16">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
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
          <p className="text-sm font-medium text-zinc-300">
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
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/4"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-300"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path
            fillRule="evenodd"
            d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
            clipRule="evenodd"
          />
        </svg>
        Back to transcriptions
      </Link>

      {/* Main card */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8">
        {/* ---- Header ---- */}
        <div className="space-y-3">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
            {job.file_name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {/* Status indicator */}
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${STATUS_ACCENT[job.status]}`}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[job.status]} ${job.status === "processing" ? "animate-pulse" : ""}`} />
              {STATUS_LABELS[job.status]}
            </span>
            <span className="text-zinc-600">
              {formatDate(job.created_at)}
            </span>
            {job.media_type && (
              <span className="inline-flex items-center rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-500">
                {job.media_type}
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-zinc-800" />

        {/* ---- Failed ---- */}
        {job.status === "failed" && job.error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400">
            {job.error}
          </div>
        )}

        {/* ---- Pending / processing ---- */}
        {(job.status === "pending" || job.status === "processing") && (
          <div className="flex items-center gap-3 py-12 text-sm">
            <svg
              className="h-5 w-5 animate-spin text-zinc-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
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
            <span className="font-medium text-zinc-400">
              {job.status === "pending"
                ? "Waiting to process..."
                : "Transcribing your file..."}
            </span>
          </div>
        )}

        {/* ---- Completed transcript ---- */}
        {job.status === "completed" && (
          <div className="space-y-8">
            {/* Plain text */}
            {job.result_text && (
              <p className="whitespace-pre-wrap text-base leading-relaxed text-zinc-200">
                {job.result_text}
              </p>
            )}

            {/* Segments with timestamps */}
            {segments && segments.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Timestamped Segments
                </h2>
                <div className="space-y-0.5">
                  {segments.map((seg, i) => (
                    <div
                      key={i}
                      className="group flex gap-4 rounded-md px-3 py-2 transition-colors hover:bg-zinc-800/50"
                    >
                      <span className="flex-shrink-0 pt-0.5 font-mono text-sm tabular-nums text-zinc-600">
                        {formatTimestamp(seg.start)}
                      </span>
                      <span className="text-sm leading-relaxed text-zinc-300">
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
