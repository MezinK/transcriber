import { Link, useParams } from "react-router-dom";
import { useTranscription } from "../../hooks/useTranscription";
import { STATUS_BG, STATUS_LABELS } from "../../utils/status";
import { formatDate } from "../../utils/time";

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

export function TranscriptView() {
  const { id } = useParams<{ id: string }>();
  const { job, loading, error } = useTranscription(id);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-32 rounded bg-slate-100" />
        <div className="h-7 w-64 rounded bg-slate-100" />
        <div className="space-y-2 pt-4">
          <div className="h-4 w-full rounded bg-slate-50" />
          <div className="h-4 w-5/6 rounded bg-slate-50" />
          <div className="h-4 w-4/6 rounded bg-slate-50" />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-4">
        <Link
          to="/1"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors"
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
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          {error ?? "Transcription not found"}
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
        to="/1"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors"
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

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-lg font-semibold text-slate-700">
          {job.file_name}
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BG[job.status]}`}
          >
            {STATUS_LABELS[job.status]}
          </span>
          <span className="text-slate-400">
            {formatDate(job.created_at)}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100" />

      {/* Error for failed jobs */}
      {job.status === "failed" && job.error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          {job.error}
        </div>
      )}

      {/* Pending / processing states */}
      {(job.status === "pending" || job.status === "processing") && (
        <div className="flex items-center gap-3 py-8 text-sm text-slate-400">
          <svg
            className="h-4 w-4 animate-spin text-slate-400"
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
          {job.status === "pending"
            ? "Waiting to process..."
            : "Transcribing..."}
        </div>
      )}

      {/* Transcript content */}
      {job.status === "completed" && (
        <div className="max-w-3xl space-y-6">
          {/* Plain text */}
          {job.result_text && (
            <div className="prose prose-slate prose-sm max-w-none">
              <p className="text-base leading-relaxed text-slate-600 whitespace-pre-wrap">
                {job.result_text}
              </p>
            </div>
          )}

          {/* Segments with timestamps */}
          {segments && segments.length > 0 && (
            <div className="space-y-1">
              <h2 className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-3">
                Timestamped segments
              </h2>
              <div className="space-y-1.5">
                {segments.map((seg, i) => (
                  <div key={i} className="group flex gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50 transition-colors">
                    <span className="shrink-0 pt-0.5 font-mono text-xs text-slate-300 tabular-nums">
                      {formatTimestamp(seg.start)}
                    </span>
                    <span className="text-sm leading-relaxed text-slate-600">
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
  );
}
