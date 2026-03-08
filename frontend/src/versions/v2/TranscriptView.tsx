import { useParams, useNavigate } from "react-router-dom";
import { useTranscription } from "../../hooks/useTranscription";
import { useDeleteJob } from "../../hooks/useDeleteJob";
import { STATUS_PILL, STATUS_LABEL } from "../../utils/status";
import { formatDate } from "../../utils/time";
import { formatTimestamp } from "../../utils/format";

export function TranscriptView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { job, loading, error } = useTranscription(id);
  const { deleteJob, deleting } = useDeleteJob(() => navigate("/2"));

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="p-8">
        <p className="text-red-500 text-sm">{error ?? "Job not found"}</p>
      </div>
    );
  }

  const segments = job.segments_json?.segments ?? [];

  return (
    <div className="p-8 max-w-4xl overflow-y-auto">
      {/* Back link */}
      <button
        onClick={() => navigate("/2")}
        className="text-indigo-500 hover:text-indigo-600 text-sm mb-6 inline-flex items-center gap-1 transition-colors"
      >
        &larr; All Transcriptions
      </button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-3 mb-2">
          <h2 className="text-2xl font-semibold text-slate-900 break-all">
            {job.source_filename}
          </h2>
          <span
            className={`shrink-0 mt-1.5 inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_PILL[job.status]}`}
          >
            {STATUS_LABEL[job.status]}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
          <span>Created {formatDate(job.created_at)}</span>
          {job.completed_at && <span>Completed {formatDate(job.completed_at)}</span>}
          <span className="capitalize">{job.media_type}</span>
          <span>Attempts: {job.attempt_count}</span>
        </div>

        {/* Delete button */}
        <button
          onClick={() => deleteJob(job.id)}
          disabled={deleting}
          className="mt-3 text-xs text-red-400 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      {/* Error */}
      {job.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {job.error}
        </div>
      )}

      {/* Processing indicator */}
      {(job.status === "pending" || job.status === "processing") && (
        <div className="mb-6 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500">
            {job.status === "pending" ? "Waiting to be picked up..." : "Transcribing..."}
          </span>
        </div>
      )}

      {/* Plain text fallback */}
      {job.transcript_text && segments.length === 0 && (
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
            {job.transcript_text}
          </p>
        </div>
      )}

      {/* Segments */}
      {segments.length > 0 && (
        <div className="space-y-4">
          {segments.map((seg, i) => (
            <div key={i} className="group">
              <p className="text-slate-700 leading-relaxed">
                <span className="font-mono text-xs text-slate-400 mr-2">
                  [{formatTimestamp(seg.start)}]
                </span>
                {seg.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
