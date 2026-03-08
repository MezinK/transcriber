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
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, handleClickOutside]);

  const idle = workers.filter((w) => w.status === "idle").length;
  const processing = workers.filter((w) => w.status === "processing").length;
  const stale = workers.filter((w) => w.status === "stale").length;

  const dotColor =
    stale > 0
      ? "bg-red-500"
      : processing > 0
        ? "bg-amber-500"
        : workers.length > 0
          ? "bg-emerald-500"
          : "bg-zinc-600";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
        aria-label="Worker status"
      >
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="hidden sm:inline">
          {loading
            ? "…"
            : `${workers.length} worker${workers.length !== 1 ? "s" : ""}`}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900/95 backdrop-blur-sm border border-zinc-800/80 rounded-lg shadow-2xl shadow-black/40 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/60">
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              {workers.length > 0 ? (
                <>
                  {idle > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {idle}
                    </span>
                  )}
                  {processing > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {processing}
                    </span>
                  )}
                  {stale > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {stale}
                    </span>
                  )}
                </>
              ) : (
                <span>No workers</span>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                refresh();
              }}
              className="text-zinc-600 hover:text-zinc-400 transition-colors text-xs"
              aria-label="Refresh workers"
            >
              ↻
            </button>
          </div>

          {/* List */}
          <div className="max-h-52 overflow-y-auto scrollbar-thin">
            <style>{`
              .scrollbar-thin::-webkit-scrollbar { width: 4px; }
              .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
              .scrollbar-thin::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 2px; }
              .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #52525b; }
            `}</style>
            {loading && workers.length === 0 ? (
              <p className="text-zinc-600 text-xs px-3 py-3">Loading…</p>
            ) : error ? (
              <p className="text-red-400 text-xs px-3 py-3">{error}</p>
            ) : workers.length === 0 ? (
              <p className="text-zinc-600 text-xs px-3 py-3">
                No workers registered
              </p>
            ) : (
              <div className="py-1">
                {workers.map((worker) => (
                  <div
                    key={worker.id}
                    className="px-3 py-1.5 flex items-center gap-2.5"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_COLOR[worker.status]}`}
                    />
                    <span className="text-xs text-zinc-300 truncate flex-1">
                      {worker.label ?? worker.id.slice(0, 8)}
                    </span>
                    <span
                      className={`text-[10px] font-medium ${TEXT_COLOR[worker.status]}`}
                    >
                      {WORKER_STATUS_LABEL[worker.status]}
                    </span>
                    <span className="text-[10px] text-zinc-600 whitespace-nowrap">
                      {timeAgo(worker.last_heartbeat)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
