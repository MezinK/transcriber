import { useCallback, useRef, useState } from "react";
import { useUpload } from "../../hooks/useUpload";

interface UploadAreaProps {
  onSuccess: () => void;
}

export function UploadArea({ onSuccess }: UploadAreaProps) {
  const { upload, uploading, progress, error, cancel } = useUpload(onSuccess);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (files?.[0]) {
        void upload(files[0]);
      }
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
    <div className="space-y-6">
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
        className={`group relative flex flex-col items-center justify-center border px-8 py-20 transition-all duration-300 ${
          dragActive
            ? "border-[#1a1a1a] bg-[#f5f3ed]"
            : "border-[#e8e4de] bg-transparent hover:border-[#6b6560] hover:bg-[#f5f3ed]"
        } ${uploading ? "pointer-events-none" : "cursor-pointer"}`}
      >
        {/* Minimal upload arrow icon — thin line style */}
        <div className="mb-6 text-[#6b6560] transition-colors duration-300 group-hover:text-[#1a1a1a]">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </div>

        <p
          className={`font-['Playfair_Display',serif] text-xl italic text-[#1a1a1a] transition-opacity duration-300 ${
            dragActive ? "opacity-100" : "opacity-80 group-hover:opacity-100"
          }`}
        >
          {dragActive ? "Release to transcribe" : "Place your recording"}
        </p>
        <p className="mt-2 font-['DM_Sans',sans-serif] text-xs font-normal tracking-wide text-[#6b6560]">
          or click to browse · audio &amp; video supported
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Elegant progress bar */}
      {uploading && progress && (
        <div className="space-y-3 px-1">
          <div className="h-px w-full overflow-hidden bg-[#e8e4de]">
            <div
              className="h-full bg-[#1a1a1a] transition-all duration-300 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-['DM_Sans',sans-serif] text-xs tracking-wide text-[#6b6560]">
              Uploading&ensp;
              <span className="font-['JetBrains_Mono',monospace] text-[11px] text-[#1a1a1a]">
                {progress.percent}%
              </span>
            </span>
            <button
              type="button"
              onClick={cancel}
              className="font-['DM_Sans',sans-serif] text-xs tracking-wide text-[#6b6560] transition-colors duration-300 hover:text-[#c43e1c]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="border-l-2 border-[#c43e1c] py-2 pl-4 font-['DM_Sans',sans-serif] text-sm text-[#c43e1c]">
          {error}
        </div>
      )}
    </div>
  );
}
