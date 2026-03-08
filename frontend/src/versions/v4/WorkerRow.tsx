import { useWorkers } from "../../hooks/useWorkers";
import { timeAgo } from "../../utils/time";
import { WORKER_STATUS_LABEL } from "../../utils/status";
import type { WorkerStatus } from "../../types";

const WORKER_DOT_COLOR: Record<WorkerStatus, string> = {
  idle: "bg-emerald-500",
  processing: "bg-amber-500",
  stale: "bg-rose-500",
};

const WORKER_RING_COLOR: Record<WorkerStatus, string> = {
  idle: "ring-emerald-500/30",
  processing: "ring-amber-500/30",
  stale: "ring-rose-500/30",
};

export function WorkerRow() {
  const { workers, loading, error, refresh } = useWorkers();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-stone-100 font-semibold text-lg">Workers</h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-amber-500 hover:text-amber-400 transition-colors text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <p className="text-rose-500 text-sm mb-4">{error}</p>
      )}

      {loading && workers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-stone-500 text-sm">Loading workers...</p>
        </div>
      ) : workers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-stone-500 text-sm">No workers registered.</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
          {workers.map((worker) => (
            <div
              key={worker.id}
              className="min-w-[250px] shrink-0 bg-stone-900 rounded-xl p-4 border border-stone-800/60
                transition-all duration-200 hover:border-stone-700/80
                hover:shadow-[0_4px_20px_rgba(245,158,11,0.06)]"
            >
              {/* Status + label */}
              <div className="flex items-center gap-2.5 mb-3">
                <span
                  className={`inline-flex h-2 w-2 rounded-full ring-4 ${WORKER_DOT_COLOR[worker.status]} ${WORKER_RING_COLOR[worker.status]}`}
                />
                <span className="text-stone-200 font-medium text-sm truncate">
                  {worker.label ?? worker.id.slice(0, 8)}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-500">Status</span>
                  <span className="text-stone-300">
                    {WORKER_STATUS_LABEL[worker.status]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Heartbeat</span>
                  <span className="text-stone-300">
                    {timeAgo(worker.last_heartbeat)}
                  </span>
                </div>
                {worker.current_transcription_id && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Active job</span>
                    <span className="text-amber-500 font-mono truncate ml-2 max-w-[120px]">
                      {worker.current_transcription_id.slice(0, 8)}...
                    </span>
                  </div>
                )}
                {worker.last_error && (
                  <div className="mt-2 pt-2 border-t border-stone-800/60">
                    <p className="text-rose-500 truncate" title={worker.last_error}>
                      {worker.last_error}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
