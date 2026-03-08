import { useParams, useNavigate } from "react-router-dom";
import { useTranscription } from "../../hooks/useTranscription";
import { useDeleteJob } from "../../hooks/useDeleteJob";
import { STATUS_LABEL } from "../../utils/status";
import { formatDate } from "../../utils/time";
import { formatTimestamp } from "../../utils/format";
import type { TranscriptionStatus } from "../../types";

const STATUS_TEXT_COLOR: Record<TranscriptionStatus, string> = {
  pending: "text-indigo-300",
  processing: "text-violet-400",
  completed: "text-emerald-400",
  failed: "text-rose-400",
};

const STATUS_BORDER_COLOR: Record<TranscriptionStatus, string> = {
  pending: "border-indigo-300",
  processing: "border-violet-400",
  completed: "border-emerald-400",
  failed: "border-rose-400",
};

interface TranscriptViewProps {
  onDeleted?: () => void;
}

export function TranscriptView({ onDeleted }: TranscriptViewProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { job, loading, error } = useTranscription(id);
  const { deleteJob, deleting } = useDeleteJob(() => {
    onDeleted?.();
    navigate("/3");
  });

  if (loading) {
    return <p className="text-slate-400 text-sm">Loading...</p>;
  }

  if (error || !job) {
    return <p className="text-rose-400 text-sm">{error ?? "Not found"}</p>;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate("/3")}
          className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm"
        >
          &larr; Back
        </button>
        <button
          onClick={() => deleteJob(job.id)}
          disabled={deleting}
          className="text-rose-400/60 hover:text-rose-400 transition-colors text-sm disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      <h1 className="text-2xl font-semibold text-white mb-3">
        {job.source_filename}
      </h1>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-8">
        <span className={STATUS_TEXT_COLOR[job.status]}>
          {STATUS_LABEL[job.status]}
        </span>
        <span className="text-slate-400">{job.media_type}</span>
        <span className="text-slate-400">
          Created {formatDate(job.created_at)}
        </span>
        {job.completed_at && (
          <span className="text-slate-400">
            Completed {formatDate(job.completed_at)}
          </span>
        )}
      </div>

      {job.status === "failed" && job.error && (
        <div
          className={`bg-white/5 rounded-lg p-4 mb-6 border-l-4 ${STATUS_BORDER_COLOR.failed}`}
        >
          <p className="text-rose-400 text-sm">{job.error}</p>
        </div>
      )}

      {job.status === "processing" && (
        <div
          className={`bg-white/5 rounded-lg p-4 mb-6 border-l-4 ${STATUS_BORDER_COLOR.processing}`}
        >
          <p className="text-violet-400 text-sm">
            Transcription in progress...
          </p>
        </div>
      )}

      {job.status === "pending" && (
        <div
          className={`bg-white/5 rounded-lg p-4 mb-6 border-l-4 ${STATUS_BORDER_COLOR.pending}`}
        >
          <p className="text-indigo-300 text-sm">Waiting for a worker...</p>
        </div>
      )}

      {job.segments_json?.segments && job.segments_json.segments.length > 0 ? (
        <div className="space-y-3">
          {job.segments_json.segments.map((segment, i) => (
            <div key={i} className="flex gap-3">
              <span className="font-mono text-sm text-slate-500 shrink-0 pt-0.5">
                [{formatTimestamp(segment.start)}]
              </span>
              <p className="text-slate-200 leading-relaxed">{segment.text}</p>
            </div>
          ))}
        </div>
      ) : job.transcript_text ? (
        <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
          {job.transcript_text}
        </p>
      ) : null}
    </div>
  );
}
