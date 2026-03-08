import { useParams, useNavigate } from "react-router-dom";
import { useTranscription } from "../../hooks/useTranscription";
import { useDeleteJob } from "../../hooks/useDeleteJob";
import { STATUS_LABEL } from "../../utils/status";
import { formatDate } from "../../utils/time";
import { formatTimestamp } from "../../utils/format";

export function TranscriptView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { job, loading, error } = useTranscription(id);
  const { deleteJob } = useDeleteJob(() => navigate("/5"));

  if (loading) {
    return <p className="text-sm text-gray-400">Loading...</p>;
  }

  if (error || !job) {
    return <p className="text-sm text-red-500">{error ?? "Not found"}</p>;
  }

  const statusParts = [
    STATUS_LABEL[job.status],
    job.media_type,
    `${job.attempt_count} attempt${job.attempt_count === 1 ? "" : "s"}`,
    formatDate(job.created_at),
  ];

  return (
    <div>
      <button
        onClick={() => navigate("/5")}
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8 inline-block"
      >
        &larr; Back
      </button>

      <h1 className="text-xl font-medium text-gray-900">
        {job.source_filename}
      </h1>

      <p className="text-sm text-gray-400 mt-1 mb-8">
        {statusParts.join(" \u00B7 ")}
      </p>

      {(job.status === "pending" || job.status === "processing") && (
        <p className="text-gray-400 italic mb-8">
          This transcription is being processed...
        </p>
      )}

      {job.status === "failed" && job.error && (
        <p className="text-red-500 text-sm mb-8">{job.error}</p>
      )}

      {job.segments_json?.segments && job.segments_json.segments.length > 0 ? (
        <div>
          {job.segments_json.segments.map((segment, i) => (
            <p key={i} className="mb-6">
              <span className="font-mono text-sm text-gray-400 mr-2">
                [{formatTimestamp(segment.start)}]
              </span>
              <span
                className="text-lg leading-loose text-gray-800"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
              >
                {segment.text}
              </span>
            </p>
          ))}
        </div>
      ) : job.transcript_text ? (
        <p
          className="text-lg leading-loose text-gray-800 whitespace-pre-wrap"
          style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
        >
          {job.transcript_text}
        </p>
      ) : null}

      <div className="mt-16 pt-8 border-t border-gray-100">
        <button
          onClick={() => deleteJob(job.id)}
          className="text-xs text-gray-400 hover:text-red-400 cursor-pointer transition-colors"
        >
          Delete transcription
        </button>
      </div>
    </div>
  );
}
