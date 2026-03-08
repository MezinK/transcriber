import { useCallback, useRef, useState } from "react";
import { useUpload } from "../../hooks/useUpload";

interface UploadCardProps {
  onSuccess: () => void;
}

export function UploadCard({ onSuccess }: UploadCardProps) {
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
        group relative overflow-hidden rounded-2xl
        transition-all duration-300 ease-out
        ${
          dragActive
            ? "border-2 border-[#b45309] bg-[#f8f0e3] shadow-[0_4px_30px_rgba(51,38,28,0.12)]"
            : "border-2 border-dashed border-[#e8ddd0] bg-[#fffcf7] shadow-[0_4px_30px_rgba(51,38,28,0.06)] hover:border-[#b45309]/50 hover:shadow-[0_4px_30px_rgba(51,38,28,0.1)]"
        }
        ${uploading ? "pointer-events-none" : "cursor-pointer"}
        ${!uploading && !dragActive ? "animate-[breathe_4s_ease-in-out_infinite]" : ""}
      `}
    >
      {/* Subtle paper texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="flex flex-col items-center justify-center px-8 py-16 sm:py-20">
        {/* Feather / upload icon — thin, elegant */}
        <div
          className={`
            mb-6 flex h-16 w-16 items-center justify-center rounded-2xl
            transition-all duration-300 ease-out
            ${
              dragActive
                ? "bg-[#b45309]/10 scale-110"
                : "bg-[#33261c]/[0.04] group-hover:bg-[#b45309]/10 group-hover:scale-105"
            }
          `}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth={1.2}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`
              h-8 w-8 transition-all duration-300
              ${
                dragActive
                  ? "text-[#b45309] -translate-y-1"
                  : "text-[#8c7a6b] group-hover:text-[#b45309] group-hover:-translate-y-0.5"
              }
            `}
          >
            {/* Feather quill icon */}
            <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
            <line x1="16" y1="8" x2="2" y2="22" />
            <line x1="17.5" y1="15" x2="9" y2="15" />
          </svg>
        </div>

        <p className="font-['Fraunces',serif] text-xl italic text-[#33261c]">
          {dragActive ? "Let it go" : "Share your recording"}
        </p>
        <p className="mt-2.5 font-['DM_Sans',sans-serif] text-sm text-[#8c7a6b]">
          Drop an audio or video file here, or click to browse
        </p>

        {/* Small decorative ornament */}
        <svg
          viewBox="0 0 60 12"
          fill="none"
          className="mt-6 h-3 w-[60px] text-[#e8ddd0]"
        >
          <circle cx="30" cy="6" r="2" fill="currentColor" />
          <line x1="6" y1="6" x2="24" y2="6" stroke="currentColor" strokeWidth="1" />
          <line x1="36" y1="6" x2="54" y2="6" stroke="currentColor" strokeWidth="1" />
        </svg>

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
        <div className="border-t border-[#e8ddd0] bg-[#fffcf7] px-8 py-5">
          <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-[#e8ddd0]/60">
            <div
              className="h-full rounded-full bg-[#b45309] transition-all duration-500 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-['DM_Sans',sans-serif] text-sm font-medium text-[#33261c]">
              Uploading{"\u2026"}{" "}
              <span className="font-['JetBrains_Mono',monospace] text-xs text-[#8c7a6b]">
                {progress.percent}%
              </span>
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cancel();
              }}
              className="font-['DM_Sans',sans-serif] text-sm text-[#8c7a6b] transition-colors duration-200 hover:text-[#b91c1c]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border-t border-[#b91c1c]/10 bg-[#b91c1c]/5 px-8 py-4">
          <p className="font-['DM_Sans',sans-serif] text-sm text-[#b91c1c]">{error}</p>
        </div>
      )}
    </div>
  );
}
