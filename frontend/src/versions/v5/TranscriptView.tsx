import { useParams, useNavigate } from "react-router-dom";
import { useTranscription } from "../../hooks/useTranscription";
import { useDeleteJob } from "../../hooks/useDeleteJob";
import { STATUS_LABEL } from "../../utils/status";
import { formatTimestamp } from "../../utils/format";

export function TranscriptView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { job, loading, error } = useTranscription(id);
  const { deleteJob } = useDeleteJob(() => navigate("/5"));

  if (loading) {
    return <p className="text-gray-600 text-sm">loading&hellip;</p>;
  }

  if (error || !job) {
    return <p className="text-red-400 text-sm">{error ?? "not found."}</p>;
  }

  const segments = job.segments_json?.segments;
  const hasSegments = segments && segments.length > 0;

  return (
    <div>
      {/* Back */}
      <span
        onClick={() => navigate("/5")}
        className="text-gray-600 hover:text-gray-300 cursor-pointer inline-block mb-8 transition-colors"
      >
        &larr;
      </span>

      {/* Title */}
      <h2 className="text-lg font-medium text-gray-100 mb-1">
        {job.source_filename}
      </h2>

      {/* Status */}
      <p className="text-xs text-gray-500 mb-8">
        {STATUS_LABEL[job.status]}
        {job.status === "failed" && job.error && (
          <span className="text-red-400 ml-2">&mdash; {job.error}</span>
        )}
      </p>

      {/* Content */}
      {job.status === "completed" && hasSegments ? (
        <div className="space-y-4">
          {segments.map((seg, i) => (
            <p key={i} className="text-base leading-loose text-gray-300" style={{ fontFamily: "'Literata', serif" }}>
              <span className="text-xs text-gray-600 font-mono mr-2">
                [{formatTimestamp(seg.start)}]
              </span>
              {seg.text}
            </p>
          ))}
        </div>
      ) : job.status === "completed" && job.transcript_text ? (
        <p
          className="text-base leading-loose text-gray-300 whitespace-pre-wrap"
          style={{ fontFamily: "'Literata', serif" }}
        >
          {job.transcript_text}
        </p>
      ) : job.status === "processing" ? (
        <p className="text-gray-500 italic">transcribing&hellip;</p>
      ) : job.status === "pending" ? (
        <p className="text-gray-500 italic">waiting&hellip;</p>
      ) : null}

      {/* Delete */}
      <span
        onClick={() => deleteJob(job.id)}
        className="text-xs text-gray-700 hover:text-red-400 cursor-pointer inline-block mt-16 transition-colors"
      >
        delete
      </span>
    </div>
  );
}
