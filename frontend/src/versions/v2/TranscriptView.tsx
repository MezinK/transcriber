import { useParams } from "react-router-dom";
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

  /* ---- Loading skeleton ---- */
  if (loading) {
    return (
      <div className="animate-pulse p-8 lg:p-12">
        <div className="max-w-3xl">
          <div className="h-7 w-64 rounded-md bg-slate-100" />
          <div className="mt-3 flex gap-3">
            <div className="h-5 w-20 rounded-full bg-slate-100" />
            <div className="h-5 w-36 rounded bg-slate-50" />
          </div>
          <div className="mt-8 space-y-3">
            <div className="h-4 w-full rounded bg-slate-50" />
            <div className="h-4 w-5/6 rounded bg-slate-50" />
            <div className="h-4 w-4/6 rounded bg-slate-50" />
            <div className="h-4 w-full rounded bg-slate-50" />
            <div className="h-4 w-3/4 rounded bg-slate-50" />
          </div>
        </div>
      </div>
    );
  }

  /* ---- Error / not found ---- */
  if (error || !job) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
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
          <p className="text-sm font-medium text-slate-700">
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
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-8 py-8 lg:px-12 lg:py-12">
        {/* ---- Header ---- */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-slate-800">
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
        <div className="my-6 border-t border-slate-100" />

        {/* ---- Failed ---- */}
        {job.status === "failed" && job.error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {job.error}
          </div>
        )}

        {/* ---- Pending / processing ---- */}
        {(job.status === "pending" || job.status === "processing") && (
          <div className="flex items-center gap-3 py-12 text-sm text-slate-400">
            <svg
              className="h-5 w-5 animate-spin text-indigo-500"
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
            <span className="font-medium">
              {job.status === "pending"
                ? "Waiting to process..."
                : "Transcribing..."}
            </span>
          </div>
        )}

        {/* ---- Completed transcript ---- */}
        {job.status === "completed" && (
          <div className="space-y-8">
            {/* Plain text */}
            {job.result_text && (
              <div className="prose prose-slate max-w-none">
                <p className="text-base leading-relaxed text-slate-600 whitespace-pre-wrap">
                  {job.result_text}
                </p>
              </div>
            )}

            {/* Segments with timestamps */}
            {segments && segments.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Timestamped Segments
                </h2>
                <div className="space-y-1">
                  {segments.map((seg, i) => (
                    <div
                      key={i}
                      className="group flex gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-slate-50"
                    >
                      <span className="flex-shrink-0 pt-0.5 font-mono text-xs tabular-nums text-slate-300">
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
    </div>
  );
}
