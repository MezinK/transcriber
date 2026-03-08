import { useWorkers } from "../../hooks/useWorkers";
import { WORKER_STATUS_LABEL, WORKER_STATUS_DOT } from "../../utils/status";
import { timeAgo } from "../../utils/time";

export function WorkerGrid() {
  const { workers, loading, refresh } = useWorkers();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-800">Workers</h2>
        <button
          onClick={refresh}
          className="rounded-full bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading && workers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-stone-400">
          Loading...
        </div>
      ) : workers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-stone-400">
          No workers registered
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workers.map((w) => (
            <div
              key={w.id}
              className="bg-white rounded-xl shadow-sm p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${WORKER_STATUS_DOT[w.status]}`}
                />
                <span className="font-medium text-stone-800">
                  {w.label || w.id.slice(0, 8)}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    w.status === "idle"
                      ? "bg-green-100 text-green-700"
                      : w.status === "processing"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {WORKER_STATUS_LABEL[w.status]}
                </span>
                <span className="text-stone-400">
                  Last seen: {timeAgo(w.last_heartbeat)}
                </span>
              </div>

              {w.current_transcription_id && (
                <p className="mt-2 text-xs text-stone-400 truncate">
                  Job: {w.current_transcription_id}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
