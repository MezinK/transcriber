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
    <div className="space-y-3">
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
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors duration-150 ${
          dragActive
            ? "border-slate-400 bg-slate-50"
            : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"
        } ${uploading ? "pointer-events-none" : "cursor-pointer"}`}
      >
        {/* Upload icon */}
        <div className="mb-3 rounded-full bg-slate-100 p-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-6 w-6 text-slate-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        <p className="text-sm font-medium text-slate-600">
          {dragActive ? "Drop file here" : "Drag & drop a file here"}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          or click to browse &middot; audio &amp; video supported
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
        <div className="space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-600 transition-all duration-300 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Uploading... {progress.percent}%</span>
            <button
              type="button"
              onClick={cancel}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
