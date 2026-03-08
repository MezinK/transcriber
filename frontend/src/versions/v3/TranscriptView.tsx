import { useParams, Link } from "react-router-dom";
import { useTranscription } from "../../hooks/useTranscription";
import { STATUS_PILL, STATUS_LABEL } from "../../utils/status";
import { formatTimestamp } from "../../utils/format";
import { formatDate } from "../../utils/time";

export function TranscriptView() {
  const { id } = useParams<{ id: string }>();
  const { job, loading, error } = useTranscription(id);

  if (loading) {
    return (
      <div className="text-center text-stone-400 py-20">Loading...</div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center text-red-500 py-20">
        {error ?? "Job not found"}
      </div>
    );
  }

  const segments = job.segments_json?.segments;

  return (
    <div>
      <Link
        to="/3"
        className="inline-block mb-6 text-blue-500 hover:text-blue-600 transition-colors text-sm font-medium"
      >
        &larr; Back to transcriptions
      </Link>

      <div className="bg-white rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-semibold text-stone-800 mb-4">
          {job.source_filename}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-sm text-stone-400 mb-6">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_PILL[job.status]}`}
          >
            {STATUS_LABEL[job.status]}
          </span>
          <span>{job.media_type}</span>
          <span>Created {formatDate(job.created_at)}</span>
          {job.completed_at && <span>Completed {formatDate(job.completed_at)}</span>}
        </div>

        {job.status === "failed" && job.error && (
          <p className="mb-6 text-sm text-red-500">{job.error}</p>
        )}

        {job.status === "completed" && segments && segments.length > 0 ? (
          <div className="space-y-3">
            {segments.map((seg, i) => (
              <p key={i} className="text-stone-700 leading-relaxed">
                <span className="font-mono text-xs text-stone-400 mr-2">
                  [{formatTimestamp(seg.start)}]
                </span>
                {seg.text}
              </p>
            ))}
          </div>
        ) : job.status === "completed" && job.transcript_text ? (
          <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">
            {job.transcript_text}
          </p>
        ) : (
          job.status !== "failed" && (
            <p className="text-stone-400 italic">
              Transcript not yet available.
            </p>
          )
        )}
      </div>
    </div>
  );
}
