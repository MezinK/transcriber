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
        group relative overflow-hidden rounded-lg border transition-all duration-300 ease-out
        ${
          dragActive
            ? "border-zinc-400 bg-zinc-800/80 shadow-lg shadow-zinc-500/10 ring-2 ring-zinc-500/30"
            : "border-zinc-700 bg-zinc-900 hover:border-zinc-500 hover:bg-zinc-800/50 hover:shadow-lg hover:shadow-zinc-500/5"
        }
        ${uploading ? "pointer-events-none" : "cursor-pointer"}
      `}
    >
      <div className="flex flex-col items-center justify-center px-8 py-12">
        {/* Upload icon */}
        <div
          className={`
            mb-4 flex h-14 w-14 items-center justify-center rounded-xl
            transition-all duration-300 ease-out
            ${
              dragActive
                ? "bg-zinc-700 scale-110"
                : "bg-zinc-800 group-hover:bg-zinc-700 group-hover:scale-105"
            }
          `}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={`
              h-7 w-7 transition-all duration-300
              ${
                dragActive
                  ? "text-zinc-200 -translate-y-0.5"
                  : "text-zinc-500 group-hover:text-zinc-300"
              }
            `}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        <p className="text-sm font-medium text-zinc-300">
          {dragActive ? "Drop your file here" : "Drop a file here or click to browse"}
        </p>
        <p className="mt-1.5 text-xs text-zinc-600">
          Audio and video files supported
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
        <div className="border-t border-zinc-800 px-6 py-4">
          <div className="mb-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              Uploading... {progress.percent}%
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cancel();
              }}
              className="text-xs text-zinc-600 transition-colors hover:text-red-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border-t border-red-500/20 bg-red-500/5 px-6 py-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
