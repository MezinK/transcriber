import { useParams, useNavigate } from "react-router-dom";
import { useTranscription } from "../../hooks/useTranscription";
import { STATUS_LABEL } from "../../utils/status";
import { formatDate } from "../../utils/time";
import { formatTimestamp } from "../../utils/format";
import type { TranscriptionStatus } from "../../types";

const TEXT_COLOR: Record<TranscriptionStatus, string> = {
  pending: "text-sky-500",
  processing: "text-amber-500",
  completed: "text-emerald-500",
  failed: "text-red-500",
};

export function TranscriptView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { job, loading, error } = useTranscription(id);

  if (loading) {
    return <p className="text-zinc-500 text-sm">Loading...</p>;
  }

  if (error || !job) {
    return <p className="text-red-400 text-sm">{error ?? "Not found"}</p>;
  }

  return (
    <div>
      <button
        onClick={() => navigate("/1")}
        className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm mb-6 inline-block"
      >
        &larr; Back
      </button>

      <h1 className="text-2xl font-semibold text-zinc-100 mb-3">
        {job.source_filename}
      </h1>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-8">
        <span className={TEXT_COLOR[job.status]}>
          {STATUS_LABEL[job.status]}
        </span>
        <span className="text-zinc-500">{job.media_type}</span>
        <span className="text-zinc-500">
          Created {formatDate(job.created_at)}
        </span>
        {job.completed_at && (
          <span className="text-zinc-500">
            Completed {formatDate(job.completed_at)}
          </span>
        )}
      </div>

      {job.status === "failed" && job.error && (
        <div className="bg-zinc-900 rounded-lg p-4 mb-6 border-l-4 border-red-500">
          <p className="text-red-400 text-sm">{job.error}</p>
        </div>
      )}

      {job.status === "processing" && (
        <div className="bg-zinc-900 rounded-lg p-4 mb-6 border-l-4 border-amber-500">
          <p className="text-amber-500 text-sm">
            Transcription in progress...
          </p>
        </div>
      )}

      {job.status === "pending" && (
        <div className="bg-zinc-900 rounded-lg p-4 mb-6 border-l-4 border-sky-500">
          <p className="text-sky-500 text-sm">Waiting for a worker...</p>
        </div>
      )}

      {job.segments_json?.segments && job.segments_json.segments.length > 0 ? (
        <div className="space-y-3">
          {job.segments_json.segments.map((segment, i) => (
            <div key={i} className="flex gap-3">
              <span className="font-mono text-sm text-zinc-500 shrink-0 pt-0.5">
                [{formatTimestamp(segment.start)}]
              </span>
              <p className="text-zinc-300 leading-relaxed">{segment.text}</p>
            </div>
          ))}
        </div>
      ) : job.transcript_text ? (
        <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {job.transcript_text}
        </p>
      ) : null}
    </div>
  );
}
