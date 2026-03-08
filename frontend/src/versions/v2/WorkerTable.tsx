import { useWorkers } from "../../hooks/useWorkers";
import { timeAgo } from "../../utils/time";
import type { WorkerStatus } from "../../types";

const WORKER_COLOR: Record<WorkerStatus, string> = {
  idle: "text-green-400",
  processing: "text-yellow-300",
  stale: "text-red-400",
};

export function WorkerTable() {
  const { workers, loading, refresh } = useWorkers();

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <span className="text-green-400">&gt; workers</span>
        <button
          onClick={refresh}
          className="text-green-400 hover:text-green-300 transition-colors text-sm"
        >
          [REFRESH]
        </button>
      </div>

      {loading && workers.length === 0 ? (
        <p className="text-neutral-500 py-4">
          &gt; loading...<span className="v2-blink">_</span>
        </p>
      ) : workers.length === 0 ? (
        <p className="text-neutral-500 py-4">&gt; no workers registered.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800">
              <th className="text-left text-xs uppercase tracking-wider text-green-400/60 pb-2 font-normal">
                LABEL
              </th>
              <th className="text-left text-xs uppercase tracking-wider text-green-400/60 pb-2 font-normal">
                STATUS
              </th>
              <th className="text-left text-xs uppercase tracking-wider text-green-400/60 pb-2 font-normal">
                HEARTBEAT
              </th>
              <th className="text-left text-xs uppercase tracking-wider text-green-400/60 pb-2 font-normal">
                CURRENT_JOB
              </th>
            </tr>
          </thead>
          <tbody>
            {workers.map((worker) => (
              <tr key={worker.id} className="border-b border-neutral-800/50">
                <td className="py-3 pr-4 text-green-200">
                  {worker.label || worker.id.slice(0, 8)}
                </td>
                <td className="py-3 pr-4 whitespace-nowrap">
                  <span className={WORKER_COLOR[worker.status]}>
                    {worker.status === "processing" && (
                      <span className="v2-blink-dot mr-1">{"\u25CF"}</span>
                    )}
                    [{worker.status.toUpperCase()}]
                  </span>
                </td>
                <td className="py-3 pr-4 text-neutral-500">
                  {timeAgo(worker.last_heartbeat)}
                </td>
                <td className="py-3 text-neutral-500">
                  {worker.current_transcription_id
                    ? worker.current_transcription_id.slice(0, 8)
                    : "\u2014"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
