import { useWorkers } from "../../hooks/useWorkers";
import { timeAgo } from "../../utils/time";

export function WorkerList() {
  const { workers, loading, error, refresh } = useWorkers();

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-medium text-gray-700">Workers</h2>
        <button
          onClick={refresh}
          className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading && workers.length === 0 && (
        <p className="text-sm text-gray-400">Loading...</p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && workers.length === 0 && !error && (
        <p className="text-sm text-gray-400 italic">No workers registered.</p>
      )}

      {workers.map((worker) => {
        const label = worker.label || worker.id.slice(0, 8);
        const ago = timeAgo(worker.last_heartbeat);
        const statusText =
          worker.status === "processing" && worker.current_transcription_id
            ? `processing ${worker.current_transcription_id.slice(0, 8)}`
            : worker.status;

        return (
          <p key={worker.id} className="text-sm text-gray-600">
            {label} &mdash; {statusText}, last seen {ago}
          </p>
        );
      })}
    </div>
  );
}
