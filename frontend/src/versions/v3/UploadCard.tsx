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
        group relative overflow-hidden rounded-xl bg-white shadow-sm
        border-2 border-dashed transition-all duration-300 ease-out
        ${
          dragActive
            ? "border-blue-400 bg-blue-50/40 shadow-md shadow-blue-100/50 scale-[1.01]"
            : "border-stone-200 hover:border-blue-300 hover:shadow-md"
        }
        ${uploading ? "pointer-events-none" : "cursor-pointer"}
      `}
    >
      <div className="flex flex-col items-center justify-center px-8 py-14">
        {/* Cloud upload icon */}
        <div
          className={`
            mb-5 flex h-16 w-16 items-center justify-center rounded-2xl
            transition-all duration-300 ease-out
            ${
              dragActive
                ? "bg-blue-100 scale-110"
                : "bg-stone-100 group-hover:bg-blue-50 group-hover:scale-105"
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
              h-8 w-8 transition-all duration-300
              ${
                dragActive
                  ? "text-blue-500 -translate-y-0.5"
                  : "text-stone-400 group-hover:text-blue-500"
              }
            `}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 3.75 3.75 0 013.572 5.408A4.5 4.5 0 0118 19.5H6.75z"
            />
          </svg>
        </div>

        <p className="text-base font-medium text-stone-700">
          {dragActive ? "Drop your file here" : "Drop your file here or click to browse"}
        </p>
        <p className="mt-2 text-sm text-stone-400">
          Supports audio and video files
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
        <div className="border-t border-stone-100 px-8 py-5">
          <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-600">
              Uploading... {progress.percent}%
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cancel();
              }}
              className="text-sm text-stone-400 transition-colors hover:text-red-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border-t border-red-100 bg-red-50/50 px-8 py-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
