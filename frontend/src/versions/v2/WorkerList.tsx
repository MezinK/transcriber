import { useWorkers } from "../../hooks/useWorkers";
import { WORKER_STATUS_DOT, WORKER_STATUS_LABEL } from "../../utils/status";
import { timeAgo, formatDate } from "../../utils/time";

export function WorkerList() {
  const { workers, loading, error, refresh } = useWorkers();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Workers</h2>
        <button
          onClick={refresh}
          className="text-indigo-500 hover:text-indigo-600 transition-colors text-lg"
          title="Refresh"
        >
          &#8635;
        </button>
      </div>

      {loading && (
        <p className="text-sm text-slate-400">Loading workers...</p>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {!loading && workers.length === 0 && !error && (
        <p className="text-sm text-slate-400">No workers found</p>
      )}

      {workers.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="pb-3 pr-6 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="pb-3 pr-6 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Label
                </th>
                <th className="pb-3 pr-6 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Started
                </th>
                <th className="pb-3 pr-6 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Last Heartbeat
                </th>
                <th className="pb-3 pr-6 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Current Job
                </th>
                <th className="pb-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Last Error
                </th>
              </tr>
            </thead>
            <tbody>
              {workers.map((worker) => (
                <tr
                  key={worker.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 pr-6">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${WORKER_STATUS_DOT[worker.status]}`}
                      />
                      <span className="text-slate-700">
                        {WORKER_STATUS_LABEL[worker.status]}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-6 text-slate-700">
                    {worker.label ?? <span className="text-slate-300">&mdash;</span>}
                  </td>
                  <td className="py-3 pr-6 text-slate-500" title={formatDate(worker.started_at)}>
                    {timeAgo(worker.started_at)}
                  </td>
                  <td className="py-3 pr-6 text-slate-500" title={formatDate(worker.last_heartbeat)}>
                    {timeAgo(worker.last_heartbeat)}
                  </td>
                  <td className="py-3 pr-6 font-mono text-xs text-indigo-500">
                    {worker.current_transcription_id ? (
                      <span title={worker.current_transcription_id}>
                        {worker.current_transcription_id.slice(0, 8)}...
                      </span>
                    ) : (
                      <span className="text-slate-300">&mdash;</span>
                    )}
                  </td>
                  <td className="py-3 text-red-400 max-w-xs truncate">
                    {worker.last_error ?? <span className="text-slate-300">&mdash;</span>}
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
