import { useNavigate } from "react-router-dom";
import { useTranscriptions } from "../../hooks/useTranscriptions";
import { useDeleteJob } from "../../hooks/useDeleteJob";
import { SidebarItem } from "./SidebarItem";

export function Sidebar() {
  const navigate = useNavigate();
  const { jobs, loading, error, refresh } = useTranscriptions();
  const { deleteJob } = useDeleteJob(() => {
    void refresh();
    navigate("/2");
  });

  return (
    <aside className="flex w-72 flex-shrink-0 flex-col bg-slate-900 text-white">
      {/* ---- Brand + New button ---- */}
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <h1 className="text-base font-semibold tracking-tight text-white">
          Transcription
        </h1>
        <button
          type="button"
          onClick={() => navigate("/2")}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3.5 w-3.5"
          >
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          New
        </button>
      </div>

      {/* ---- Job list ---- */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Section label */}
        <div className="px-5 pb-2 pt-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Recent
          </h2>
        </div>

        {/* Scrollable list */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4 scrollbar-thin">
          {loading && jobs.length === 0 && (
            <div className="space-y-2 px-2 pt-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 w-3/4 rounded bg-slate-800" />
                  <div className="mt-1.5 h-3 w-1/2 rounded bg-slate-800/70" />
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="px-2 pt-2">
              <p className="text-xs text-red-400">{error}</p>
              <button
                type="button"
                onClick={() => void refresh()}
                className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && jobs.length === 0 && (
            <div className="px-2 pt-6 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-5 w-5 text-slate-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              </div>
              <p className="text-xs text-slate-500">
                No transcriptions yet.
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                Upload a file to get started.
              </p>
            </div>
          )}

          {jobs.map((job) => (
            <SidebarItem
              key={job.id}
              job={job}
              onDelete={(id) => void deleteJob(id)}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}
