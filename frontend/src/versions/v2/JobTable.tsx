import { useNavigate } from "react-router-dom";
import { useTranscriptions } from "../../hooks/useTranscriptions";
import { useDeleteJob } from "../../hooks/useDeleteJob";
import { formatDate } from "../../utils/time";
import type { TranscriptionStatus } from "../../types";

const STATUS_COLOR: Record<TranscriptionStatus, string> = {
  pending: "text-neutral-400",
  processing: "text-yellow-300",
  completed: "text-green-400",
  failed: "text-red-400",
};

export function JobTable() {
  const { jobs, loading, refresh } = useTranscriptions();
  const { deleteJob } = useDeleteJob(refresh);
  const navigate = useNavigate();

  if (loading && jobs.length === 0) {
    return (
      <p className="text-neutral-500 py-4">
        &gt; loading...<span className="v2-blink">_</span>
      </p>
    );
  }

  if (jobs.length === 0) {
    return (
      <p className="text-neutral-500 py-4">&gt; no records found.</p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-neutral-800">
          <th className="text-left text-xs uppercase tracking-wider text-green-400/60 pb-2 font-normal">
            FILENAME
          </th>
          <th className="text-left text-xs uppercase tracking-wider text-green-400/60 pb-2 font-normal">
            STATUS
          </th>
          <th className="text-left text-xs uppercase tracking-wider text-green-400/60 pb-2 font-normal">
            CREATED
          </th>
          <th className="text-right text-xs uppercase tracking-wider text-green-400/60 pb-2 font-normal">
            ACTIONS
          </th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => (
          <tr key={job.id} className="border-b border-neutral-800/50">
            <td className="py-3 pr-4">
              <button
                onClick={() => navigate(`/2/${job.id}`)}
                className="text-green-200 hover:text-green-400 transition-colors truncate max-w-xs block text-left"
                title={job.source_filename}
              >
                {job.source_filename}
              </button>
            </td>
            <td className="py-3 pr-4 whitespace-nowrap">
              <span className={STATUS_COLOR[job.status]}>
                {job.status === "processing" && (
                  <span className="v2-blink-dot mr-1">{"\u25CF"}</span>
                )}
                [{job.status.toUpperCase()}]
              </span>
            </td>
            <td className="py-3 pr-4 text-neutral-500 whitespace-nowrap">
              {formatDate(job.created_at)}
            </td>
            <td className="py-3 text-right">
              <button
                onClick={() => deleteJob(job.id)}
                className="text-neutral-600 hover:text-red-400 transition-colors"
              >
                [DEL]
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
