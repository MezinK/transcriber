import { useState, useRef, useEffect, useCallback } from "react";
import { useWorkers } from "../hooks/useWorkers";
import { WORKER_STATUS_LABEL } from "../utils/status";
import { timeAgo } from "../utils/time";
import type { WorkerStatus as WStatus } from "../types";

const DOT_COLOR: Record<WStatus, string> = {
  idle: "bg-emerald-500",
  processing: "bg-amber-500",
  stale: "bg-red-500",
};

const TEXT_COLOR: Record<WStatus, string> = {
  idle: "text-emerald-500",
  processing: "text-amber-500",
  stale: "text-red-500",
};

function summarize(workers: { status: WStatus }[]): {
  color: string;
  label: string;
} {
  if (workers.length === 0) return { color: "bg-zinc-600", label: "No workers" };
  const processing = workers.filter((w) => w.status === "processing").length;
  const stale = workers.filter((w) => w.status === "stale").length;
  if (stale > 0) return { color: "bg-red-500", label: `${stale} stale` };
  if (processing > 0)
    return { color: "bg-amber-500", label: `${processing} busy` };
  return { color: "bg-emerald-500", label: "All idle" };
}

export function WorkerStatusIcon() {
  const { workers, loading, error, refresh } = useWorkers();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, handleClickOutside]);

  const summary = summarize(workers);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
        aria-label="Worker status"
      >
        <span className={`w-2 h-2 rounded-full ${summary.color}`} />
        <span className="hidden sm:inline">
          {loading ? "…" : `${workers.length} worker${workers.length !== 1 ? "s" : ""}`}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <span className="text-xs text-zinc-400 uppercase tracking-wider">
              Workers
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                refresh();
              }}
              className="text-emerald-500 hover:text-emerald-400 transition-colors text-sm"
              aria-label="Refresh workers"
            >
              &#8635;
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading && workers.length === 0 ? (
              <p className="text-zinc-500 text-sm px-4 py-3">Loading…</p>
            ) : error ? (
              <p className="text-red-400 text-sm px-4 py-3">{error}</p>
            ) : workers.length === 0 ? (
              <p className="text-zinc-500 text-sm px-4 py-3">
                No workers registered
              </p>
            ) : (
              workers.map((worker) => (
                <div
                  key={worker.id}
                  className="px-4 py-2.5 flex items-center gap-3 border-b border-zinc-800/50 last:border-0"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_COLOR[worker.status]}`}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-zinc-200 truncate block">
                      {worker.label ?? worker.id.slice(0, 8)}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {timeAgo(worker.last_heartbeat)}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium ${TEXT_COLOR[worker.status]}`}
                  >
                    {WORKER_STATUS_LABEL[worker.status]}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
