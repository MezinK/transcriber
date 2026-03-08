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
    <aside className="flex w-64 flex-shrink-0 flex-col bg-[#0a0a18] border-r border-[rgba(129,140,248,0.08)]">
      {/* ── Brand ── */}
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        {/* Waveform icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 text-[#818cf8]"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            d="M3 12h1m2-4v8m4-10v12m4-8v4m4-6v8m2-4h1"
          />
        </svg>
        <span className="font-['Sora',sans-serif] text-[13px] font-semibold tracking-[0.18em] text-[#e2e4f0] uppercase">
          Transcribe
        </span>
      </div>

      {/* ── Upload button ── */}
      <div className="px-4 pb-5">
        <button
          type="button"
          onClick={() => navigate("/2")}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#818cf8] to-[#6366f1] px-4 py-2.5 font-['DM_Sans',sans-serif] text-[13px] font-medium text-white shadow-[0_0_20px_rgba(129,140,248,0.2)] transition-all duration-200 hover:shadow-[0_0_25px_rgba(129,140,248,0.35)] hover:brightness-110 active:scale-[0.98]"
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
          </svg>
          Upload File
        </button>
      </div>

      {/* ── Section label ── */}
      <div className="px-5 pb-2">
        <span className="font-['DM_Sans',sans-serif] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6b6f8a]">
          Transcriptions
        </span>
      </div>

      {/* ── Job list ── */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4 [scrollbar-width:thin] [scrollbar-color:rgba(129,140,248,0.15)_transparent]">
        {loading && jobs.length === 0 && (
          <div className="space-y-1.5 px-2 pt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-md bg-[#12122a] p-3">
                <div className="h-3.5 w-3/4 rounded bg-[rgba(129,140,248,0.06)]" />
                <div className="mt-2 h-2.5 w-1/2 rounded bg-[rgba(129,140,248,0.04)]" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="px-3 pt-3">
            <p className="font-['DM_Sans',sans-serif] text-xs text-[#f87171]">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-1.5 font-['DM_Sans',sans-serif] text-xs text-[#818cf8] transition-colors duration-200 hover:text-[#a5b4fc]"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div className="flex flex-col items-center px-3 pt-10 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#12122a] border border-[rgba(129,140,248,0.08)]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-5 w-5 text-[#6b6f8a]"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <p className="font-['DM_Sans',sans-serif] text-xs text-[#6b6f8a]">
              No transcriptions yet
            </p>
            <p className="mt-0.5 font-['DM_Sans',sans-serif] text-[11px] text-[#4a4d65]">
              Upload a file to get started
            </p>
          </div>
        )}

        <div className="space-y-0.5">
          {jobs.map((job) => (
            <SidebarItem
              key={job.id}
              job={job}
              onDelete={(id) => void deleteJob(id)}
            />
          ))}
        </div>
      </nav>
    </aside>
  );
}
