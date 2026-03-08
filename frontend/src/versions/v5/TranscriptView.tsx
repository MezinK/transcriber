import { Link, useParams } from "react-router-dom";
import { useTranscription } from "../../hooks/useTranscription";
import { STATUS_LABELS } from "../../utils/status";
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
    return <p className="py-16 text-sm text-gray-400">Loading...</p>;
  }

  if (error || !job) {
    return (
      <div className="py-16">
        <Link
          to="/5"
          className="text-sm text-gray-400 transition-colors hover:text-gray-600"
        >
          &larr; All transcriptions
        </Link>
        <p className="mt-6 text-sm text-gray-500">
          {error ?? "Transcription not found."}
        </p>
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
    <article>
      {/* Back link */}
      <Link
        to="/5"
        className="inline-block text-sm text-gray-400 transition-colors hover:text-gray-600"
      >
        &larr; All transcriptions
      </Link>

      {/* Header */}
      <header className="mt-8">
        <h1 className="text-2xl font-medium text-gray-900">
          {job.file_name}
        </h1>
        <p className="mt-1.5 text-sm text-gray-400">
          {STATUS_LABELS[job.status]}
          {job.completed_at
            ? ` \u00b7 ${formatDate(job.completed_at)}`
            : ` \u00b7 ${formatDate(job.created_at)}`}
        </p>
      </header>

      {/* Divider */}
      <hr className="my-8 border-gray-100" />

      {/* Failed */}
      {job.status === "failed" && job.error && (
        <p className="text-sm text-red-400">{job.error}</p>
      )}

      {/* Processing / Pending */}
      {(job.status === "pending" || job.status === "processing") && (
        <p className="py-12 text-gray-400">
          <span className="mr-2 inline-block animate-pulse">&#9679;</span>
          Transcription in progress...
        </p>
      )}

      {/* Completed — the document reading experience */}
      {job.status === "completed" && (
        <div>
          {/* Plain text — the hero */}
          {job.result_text && !segments && (
            <div className="text-lg leading-loose text-gray-800 whitespace-pre-wrap">
              {job.result_text}
            </div>
          )}

          {/* Segments with timestamps */}
          {segments && segments.length > 0 && (
            <div className="space-y-0">
              {segments.map((seg, i) => (
                <div key={i}>
                  {i > 0 && <hr className="my-6 border-gray-100" />}
                  <p className="mb-1 text-xs text-gray-300">
                    {formatTimestamp(seg.start)}
                  </p>
                  <p className="text-lg leading-loose text-gray-800">
                    {seg.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Fallback: plain text when segments exist but also show full text */}
          {job.result_text && segments && segments.length > 0 && (
            <>
              <hr className="my-10 border-gray-100" />
              <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-gray-400">
                Full Transcript
              </h2>
              <div className="text-lg leading-loose text-gray-800 whitespace-pre-wrap">
                {job.result_text}
              </div>
            </>
          )}
        </div>
      )}
    </article>
  );
}
