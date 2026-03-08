import { useParams, useNavigate } from "react-router-dom";
import { useTranscription } from "../../hooks/useTranscription.ts";
import { STATUS_LABEL, STATUS_PILL } from "../../utils/status.ts";
import { formatTimestamp } from "../../utils/format.ts";
import { formatDate } from "../../utils/time.ts";

export function TranscriptView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { job, loading } = useTranscription(id);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-slate-400 text-sm text-center py-12">Loading…</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-slate-400 text-sm text-center py-12">
          Transcription not found.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate("/1")}
        className="text-slate-400 hover:text-slate-600 transition-colors duration-200 text-sm mb-8 inline-block"
      >
        &larr; Back
      </button>

      <h1 className="text-2xl font-semibold text-slate-800 mb-3">
        {job.source_filename}
      </h1>

      <div className="flex flex-wrap items-center gap-3 mb-8 text-sm text-slate-400">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_PILL[job.status]}`}
        >
          {STATUS_LABEL[job.status]}
        </span>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          {job.media_type}
        </span>
        <span>Attempt {job.attempt_count}</span>
        <span>Created {formatDate(job.created_at)}</span>
        {job.completed_at && <span>Completed {formatDate(job.completed_at)}</span>}
      </div>

      {(job.status === "pending" || job.status === "processing") && (
        <p className="text-slate-400 text-sm mb-8">Processing…</p>
      )}

      {job.status === "failed" && job.error && (
        <p className="text-red-500 text-sm mb-8">{job.error}</p>
      )}

      {job.segments_json && job.segments_json.segments.length > 0 ? (
        <div>
          {job.segments_json.segments.map((segment, i) => (
            <p key={i} className="mb-4 text-slate-700 leading-relaxed">
              <span className="font-mono text-xs text-slate-400 mr-2">
                [{formatTimestamp(segment.start)}]
              </span>
              {segment.text}
            </p>
          ))}
        </div>
      ) : job.transcript_text ? (
        <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
          {job.transcript_text}
        </div>
      ) : null}
    </div>
  );
}
