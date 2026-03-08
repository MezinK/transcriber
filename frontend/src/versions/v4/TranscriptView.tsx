import { useParams, useNavigate } from "react-router-dom";
import { useTranscription } from "../../hooks/useTranscription";
import { useDeleteJob } from "../../hooks/useDeleteJob";
import { STATUS_LABEL } from "../../utils/status";
import { formatTimestamp } from "../../utils/format";
import { formatDate } from "../../utils/time";
import type { TranscriptionStatus } from "../../types";

const STATUS_TEXT_COLOR: Record<TranscriptionStatus, string> = {
  pending: "text-stone-400",
  processing: "text-amber-500",
  completed: "text-emerald-500",
  failed: "text-rose-500",
};

export function TranscriptView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { job, loading, error } = useTranscription(id);
  const { deleteJob, deleting } = useDeleteJob(() => {
    navigate("/4");
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-flex items-center gap-2 text-stone-500 text-sm">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center py-20">
        <p className="text-rose-500 text-sm">{error ?? "Transcription not found"}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => navigate("/4")}
        className="text-amber-500 hover:text-amber-400 transition-colors text-sm mb-8 inline-flex items-center gap-1.5"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Main card */}
      <div className="bg-stone-900 rounded-2xl p-8 border border-stone-800/60 shadow-[0_4px_30px_rgba(245,158,11,0.08)]">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-stone-100 text-lg font-semibold mb-2 break-words">
            {job.source_filename}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className={STATUS_TEXT_COLOR[job.status]}>
              {STATUS_LABEL[job.status]}
            </span>
            <span className="text-stone-500 capitalize">{job.media_type}</span>
            <span className="text-stone-500">{formatDate(job.created_at)}</span>
            {job.completed_at && (
              <span className="text-stone-500">
                Completed {formatDate(job.completed_at)}
              </span>
            )}
          </div>
        </div>

        {/* Status messages */}
        {job.status === "failed" && job.error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 mb-6">
            <p className="text-rose-500 text-sm">{job.error}</p>
          </div>
        )}

        {job.status === "processing" && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 animate-spin text-amber-500"
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-amber-500 text-sm">Transcription in progress...</p>
            </div>
          </div>
        )}

        {job.status === "pending" && (
          <div className="bg-stone-800/60 border border-stone-700/40 rounded-xl p-4 mb-6">
            <p className="text-stone-400 text-sm">Waiting for a worker to pick up this job...</p>
          </div>
        )}

        {/* Transcript content */}
        {job.segments_json?.segments && job.segments_json.segments.length > 0 ? (
          <div className="space-y-4 mt-6">
            {job.segments_json.segments.map((segment, i) => (
              <div key={i} className="flex gap-4">
                <span className="font-mono text-sm text-stone-500 shrink-0 pt-0.5 select-none">
                  [{formatTimestamp(segment.start)}]
                </span>
                <p className="text-stone-200 leading-relaxed">{segment.text}</p>
              </div>
            ))}
          </div>
        ) : job.transcript_text ? (
          <p className="text-stone-200 leading-relaxed whitespace-pre-wrap mt-6">
            {job.transcript_text}
          </p>
        ) : null}

        {/* Delete button */}
        <div className="mt-10 pt-6 border-t border-stone-800/60">
          <button
            onClick={() => deleteJob(job.id)}
            disabled={deleting}
            className="text-stone-600 hover:text-rose-500 transition-colors text-sm disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete transcription"}
          </button>
        </div>
      </div>
    </div>
  );
}
