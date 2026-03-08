import { NavLink } from "react-router-dom";
import type { Transcription } from "../../types";
import { timeAgo } from "../../utils/time";

/* Status dot colors — vibrant on deep dark */
const DOT_COLOR: Record<Transcription["status"], string> = {
  pending: "bg-[#6b6f8a]",
  processing: "bg-[#fbbf24]",
  completed: "bg-[#34d399]",
  failed: "bg-[#f87171]",
};

const DOT_GLOW: Record<Transcription["status"], string> = {
  pending: "",
  processing: "shadow-[0_0_6px_rgba(251,191,36,0.5)]",
  completed: "shadow-[0_0_6px_rgba(52,211,153,0.4)]",
  failed: "shadow-[0_0_6px_rgba(248,113,113,0.4)]",
};

interface SidebarItemProps {
  job: Transcription;
  onDelete: (id: string) => void;
}

export function SidebarItem({ job, onDelete }: SidebarItemProps) {
  return (
    <NavLink
      to={`/2/${job.id}`}
      className={({ isActive }) =>
        [
          "group relative flex items-start gap-2.5 rounded-md px-3 py-2.5 transition-all duration-200",
          isActive
            ? "bg-[rgba(129,140,248,0.08)] border-l-2 border-l-[#818cf8] shadow-[inset_0_0_12px_rgba(129,140,248,0.04)]"
            : "border-l-2 border-l-transparent hover:bg-[rgba(129,140,248,0.06)]",
        ].join(" ")
      }
    >
      {/* Status dot */}
      <span className="relative mt-[7px] flex-shrink-0">
        <span
          className={[
            "block h-[7px] w-[7px] rounded-full",
            DOT_COLOR[job.status],
            DOT_GLOW[job.status],
          ].join(" ")}
        />
        {job.status === "processing" && (
          <span
            className={[
              "absolute inset-0 h-[7px] w-[7px] animate-ping rounded-full opacity-75",
              DOT_COLOR[job.status],
            ].join(" ")}
          />
        )}
      </span>

      {/* Text content */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-['DM_Sans',sans-serif] text-[13px] font-medium leading-snug text-[#e2e4f0]">
          {job.file_name}
        </p>
        <p className="mt-0.5 font-['JetBrains_Mono',monospace] text-[10px] text-[#6b6f8a]">
          {timeAgo(job.created_at)}
        </p>
      </div>

      {/* Delete button — appears on hover */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(job.id);
        }}
        className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded text-[#4a4d65] opacity-0 transition-all duration-150 hover:bg-[rgba(248,113,113,0.1)] hover:text-[#f87171] group-hover:opacity-100"
        aria-label={`Delete ${job.file_name}`}
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3 w-3"
        >
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </NavLink>
  );
}
