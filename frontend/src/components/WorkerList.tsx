import { useWorkers } from "../hooks/useWorkers";
import { WORKER_STATUS_LABEL } from "../utils/status";
import { timeAgo } from "../utils/time";
import type { WorkerStatus } from "../types";

const BORDER_COLOR: Record<WorkerStatus, string> = {
  idle: "border-emerald-500",
  processing: "border-amber-500",
  stale: "border-red-500",
};

const TEXT_COLOR: Record<WorkerStatus, string> = {
  idle: "text-emerald-500",
  processing: "text-amber-500",
  stale: "text-red-500",
};

export function WorkerList() {
  const { workers, loading, error, refresh } = useWorkers();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg text-zinc-100 font-semibold">Workers</h2>
        <button
          onClick={refresh}
          className="text-emerald-500 hover:text-emerald-400 transition-colors text-lg"
          aria-label="Refresh workers"
        >
          &#8635;
        </button>
      </div>

      {loading && workers.length === 0 ? (
        <p className="text-zinc-500 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : workers.length === 0 ? (
        <p className="text-zinc-500 text-sm">No workers registered</p>
      ) : (
        <div className="space-y-2">
          {workers.map((worker) => (
            <div
              key={worker.id}
              className={`bg-zinc-900 rounded-lg p-4 flex items-center gap-4 border-l-4 ${BORDER_COLOR[worker.status]}`}
            >
              <span className="text-zinc-200 font-medium flex-1 truncate">
                {worker.label ?? worker.id.slice(0, 8)}
              </span>

              <span
                className={`text-sm font-medium ${TEXT_COLOR[worker.status]}`}
              >
                {WORKER_STATUS_LABEL[worker.status]}
              </span>

              <span className="text-zinc-500 text-sm whitespace-nowrap">
                {timeAgo(worker.last_heartbeat)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
