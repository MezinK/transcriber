import { useParams, useNavigate } from "react-router-dom";
import { useTranscription } from "../../hooks/useTranscription";
import { formatDate } from "../../utils/time";
import type { TranscriptionStatus } from "../../types";

const STATUS_COLOR: Record<TranscriptionStatus, string> = {
  pending: "text-neutral-400",
  processing: "text-yellow-300",
  completed: "text-green-400",
  failed: "text-red-400",
};

function formatTimestampHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TranscriptView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { job, loading, error } = useTranscription(id);

  if (loading) {
    return (
      <p className="text-neutral-500 py-4">
        &gt; loading...<span className="v2-blink">_</span>
      </p>
    );
  }

  if (error || !job) {
    return (
      <p className="text-red-400 py-4">
        &gt; error: {error ?? "not found"}
      </p>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate("/2")}
        className="text-green-400 hover:text-green-300 transition-colors text-sm mb-6 inline-block"
      >
        &lt; back
      </button>

      <h1 className="text-lg font-bold text-green-100 mb-3">
        {job.source_filename}
      </h1>

      <div className="text-sm text-neutral-500 mb-8">
        <span>
          status:{" "}
          <span className={STATUS_COLOR[job.status]}>
            [{job.status.toUpperCase()}]
          </span>
        </span>
        <span className="mx-2">|</span>
        <span>type: {job.media_type}</span>
        <span className="mx-2">|</span>
        <span>created: {formatDate(job.created_at)}</span>
      </div>

      {job.status === "processing" && (
        <p className="text-yellow-300 mb-6">
          &gt; transcription in progress...<span className="v2-blink">_</span>
        </p>
      )}

      {job.status === "failed" && (
        <p className="mb-6">
          <span className="text-red-400">&gt; error:</span>{" "}
          <span className="text-red-400/80">{job.error ?? "unknown error"}</span>
        </p>
      )}

      {job.status === "pending" && (
        <p className="text-neutral-500 mb-6">&gt; waiting for worker...</p>
      )}

      {job.segments_json?.segments && job.segments_json.segments.length > 0 ? (
        <div className="space-y-2">
          {job.segments_json.segments.map((segment, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-neutral-500 shrink-0">
                [{formatTimestampHMS(segment.start)}]
              </span>
              <span className="text-green-200">{segment.text}</span>
            </div>
          ))}
        </div>
      ) : job.transcript_text ? (
        <p className="text-green-200 whitespace-pre-wrap leading-relaxed">
          {job.transcript_text}
        </p>
      ) : null}
    </div>
  );
}
