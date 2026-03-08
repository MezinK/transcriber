import { useWorkers } from "../../hooks/useWorkers.ts";
import { WORKER_STATUS_DOT, WORKER_STATUS_LABEL } from "../../utils/status.ts";
import { timeAgo } from "../../utils/time.ts";

export function WorkerList() {
  const { workers, loading, refresh } = useWorkers();

  if (loading && workers.length === 0) {
    return <p className="text-slate-400 text-sm">Loading…</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-lg font-semibold text-slate-800">Workers</h2>
        <button
          onClick={refresh}
          className="text-slate-400 hover:text-slate-600 transition-colors duration-200 text-lg leading-none"
          title="Refresh"
        >
          &#x21bb;
        </button>
      </div>

      {workers.length === 0 ? (
        <p className="text-slate-400 text-sm">No workers registered.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left text-xs uppercase text-slate-400 font-medium pb-3 pr-6">
                  Label
                </th>
                <th className="text-left text-xs uppercase text-slate-400 font-medium pb-3 pr-6">
                  Status
                </th>
                <th className="text-left text-xs uppercase text-slate-400 font-medium pb-3 pr-6">
                  Last Heartbeat
                </th>
                <th className="text-left text-xs uppercase text-slate-400 font-medium pb-3">
                  Current Job
                </th>
              </tr>
            </thead>
            <tbody>
              {workers.map((worker) => (
                <tr key={worker.id}>
                  <td className="text-sm text-slate-600 py-3 pr-6">
                    {worker.label || worker.id.slice(0, 8)}
                  </td>
                  <td className="text-sm text-slate-600 py-3 pr-6">
                    <span className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${WORKER_STATUS_DOT[worker.status]}`}
                      />
                      {WORKER_STATUS_LABEL[worker.status]}
                    </span>
                  </td>
                  <td className="text-sm text-slate-600 py-3 pr-6">
                    {timeAgo(worker.last_heartbeat)}
                  </td>
                  <td className="text-sm text-slate-600 py-3">
                    {worker.current_transcription_id
                      ? worker.current_transcription_id.slice(0, 8)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
