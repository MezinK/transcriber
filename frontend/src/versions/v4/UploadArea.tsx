import { useCallback, useRef, useState } from "react";
import { useUpload } from "../../hooks/useUpload";

interface UploadAreaProps {
  onSuccess: () => void;
}

/* ---------- Hexagonal Scanner Icon ---------- */
function ScannerIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={`h-12 w-12 transition-all duration-500 ${active ? "scale-110" : ""}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer hexagon */}
      <path
        d="M24 4L42.19 14.5V31.5L24 44L5.81 31.5V14.5L24 4Z"
        stroke={active ? "#22d3ee" : "#5a5a70"}
        strokeWidth="1.2"
        strokeLinejoin="round"
        className="transition-all duration-500"
        opacity={active ? 1 : 0.6}
      />
      {/* Inner diamond */}
      <path
        d="M24 14L32 24L24 34L16 24L24 14Z"
        stroke="url(#scanGrad)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        className="transition-all duration-500"
        opacity={active ? 1 : 0.5}
      />
      {/* Center dot */}
      <circle
        cx="24"
        cy="24"
        r="2"
        fill={active ? "#22d3ee" : "#5a5a70"}
        className="transition-all duration-500"
      />
      {/* Scan lines */}
      <line
        x1="24" y1="4" x2="24" y2="14"
        stroke={active ? "#22d3ee" : "#5a5a70"}
        strokeWidth="0.8"
        opacity={active ? 0.6 : 0.2}
        className="transition-all duration-500"
      />
      <line
        x1="24" y1="34" x2="24" y2="44"
        stroke={active ? "#22d3ee" : "#5a5a70"}
        strokeWidth="0.8"
        opacity={active ? 0.6 : 0.2}
        className="transition-all duration-500"
      />
      <defs>
        <linearGradient id="scanGrad" x1="16" y1="14" x2="32" y2="34">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function UploadArea({ onSuccess }: UploadAreaProps) {
  const { upload, uploading, progress, error, cancel } = useUpload(onSuccess);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (files?.[0]) void upload(files[0]);
    },
    [upload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !uploading && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!uploading) inputRef.current?.click();
        }
      }}
      className={`
        group relative overflow-hidden rounded-2xl border backdrop-blur-xl
        transition-all duration-500 ease-out
        ${
          dragActive
            ? "border-cyan-400/50 bg-cyan-400/[0.04] shadow-[0_0_60px_rgba(6,182,212,0.2),0_8px_32px_rgba(0,0,0,0.3)]"
            : "border-white/[0.06] bg-white/[0.03] shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-white/[0.1] hover:shadow-[0_0_40px_rgba(6,182,212,0.08),0_8px_32px_rgba(0,0,0,0.3)]"
        }
        ${uploading ? "pointer-events-none" : "cursor-pointer"}
      `}
    >
      {/* Animated scanning beam across the top */}
      <div
        className={`
          absolute left-0 top-0 h-[1px] w-full
          bg-gradient-to-r from-transparent via-cyan-400 to-transparent
          transition-opacity duration-500
          ${dragActive ? "animate-pulse opacity-100" : "opacity-0 group-hover:opacity-40"}
        `}
      />

      {/* Pulsing border glow on drag — layered behind content */}
      {dragActive && (
        <div className="pointer-events-none absolute inset-0 animate-pulse rounded-2xl border border-cyan-400/20" />
      )}

      {/* Content */}
      <div className="flex flex-col items-center justify-center px-8 py-14">
        <div className="mb-5">
          <ScannerIcon active={dragActive} />
        </div>

        <p className="font-['Outfit',sans-serif] text-lg font-light tracking-wide text-[#f0f0f5]">
          {dragActive ? "Release to scan" : "Scan your recording"}
        </p>
        <p className="mt-2 font-['DM_Sans',sans-serif] text-sm text-[#5a5a70]">
          Drop an audio or video file, or click to browse
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Progress bar */}
      {uploading && progress && (
        <div className="border-t border-white/[0.06] px-6 py-4">
          {/* Track */}
          <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-all duration-500 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-['JetBrains_Mono',monospace] text-xs text-[#5a5a70]">
              Uploading... {progress.percent}%
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cancel();
              }}
              className="font-['DM_Sans',sans-serif] text-xs text-[#5a5a70] transition-colors duration-300 hover:text-red-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border-t border-red-500/20 bg-red-500/[0.04] px-6 py-3">
          <p className="font-['DM_Sans',sans-serif] text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
