import { useWorkers } from "../../hooks/useWorkers";
import { WORKER_STATUS_LABEL } from "../../utils/status";
import { timeAgo } from "../../utils/time";
import type { WorkerStatus } from "../../types";

const DOT_COLOR: Record<WorkerStatus, string> = {
  idle: "bg-emerald-400",
  processing: "bg-violet-400",
  stale: "bg-rose-400",
};

const DOT_GLOW: Record<WorkerStatus, string> = {
  idle: "shadow-[0_0_6px_rgba(52,211,153,0.6)]",
  processing: "shadow-[0_0_6px_rgba(167,139,250,0.6)]",
  stale: "shadow-[0_0_6px_rgba(251,113,133,0.6)]",
};

const TEXT_COLOR: Record<WorkerStatus, string> = {
  idle: "text-emerald-400",
  processing: "text-violet-400",
  stale: "text-rose-400",
};

export function WorkerList() {
  const { workers, loading, error, refresh } = useWorkers();

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Workers</h2>
        <button
          onClick={refresh}
          className="text-indigo-400 hover:text-indigo-300 transition-colors text-lg"
          aria-label="Refresh workers"
        >
          &#8635;
        </button>
      </div>

      {loading && workers.length === 0 ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-rose-400 text-sm">{error}</p>
      ) : workers.length === 0 ? (
        <p className="text-slate-400 text-sm">No workers registered</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {workers.map((worker) => (
            <div
              key={worker.id}
              className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 flex items-center gap-4"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${DOT_COLOR[worker.status]} ${DOT_GLOW[worker.status]}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-slate-200 font-medium truncate">
                  {worker.label ?? worker.id.slice(0, 8)}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`text-xs font-medium ${TEXT_COLOR[worker.status]}`}
                  >
                    {WORKER_STATUS_LABEL[worker.status]}
                  </span>
                  <span className="text-xs text-slate-500">
                    {timeAgo(worker.last_heartbeat)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
