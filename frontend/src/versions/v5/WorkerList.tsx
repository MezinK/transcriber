import { useWorkers } from "../../hooks/useWorkers";
import { WORKER_STATUS_LABEL } from "../../utils/status";
import { timeAgo } from "../../utils/time";

export function WorkerList() {
  const { workers, loading, error, refresh } = useWorkers();

  return (
    <div>
      <span
        onClick={refresh}
        className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer transition-colors inline-block mb-4"
      >
        refresh
      </span>

      {loading && workers.length === 0 ? (
        <p className="text-gray-600 text-sm">loading&hellip;</p>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : workers.length === 0 ? (
        <p className="text-gray-600 text-sm italic">no workers.</p>
      ) : (
        <div className="space-y-1">
          {workers.map((w) => (
            <p key={w.id} className="text-sm text-gray-400">
              {w.label ?? w.id.slice(0, 8)} &mdash;{" "}
              {WORKER_STATUS_LABEL[w.status].toLowerCase()}, last seen{" "}
              {timeAgo(w.last_heartbeat)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
