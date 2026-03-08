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
    <div className="flex h-full flex-col items-center justify-center px-6">
      <div className="w-full max-w-xl">
        {/* Heading */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800">
            New Transcription
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Upload an audio or video file to begin transcribing.
          </p>
        </div>

        {/* Drop zone */}
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
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 py-16 transition-all duration-200 ${
            dragActive
              ? "border-indigo-400 bg-indigo-50/60 ring-4 ring-indigo-100"
              : "border-slate-200 bg-slate-50/50 hover:border-indigo-300 hover:bg-indigo-50/30"
          } ${uploading ? "pointer-events-none opacity-70" : "cursor-pointer"}`}
        >
          {/* Upload icon */}
          <div
            className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full transition-colors duration-200 ${
              dragActive ? "bg-indigo-100" : "bg-slate-100"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className={`h-7 w-7 transition-colors duration-200 ${
                dragActive ? "text-indigo-600" : "text-slate-400"
              }`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>

          <p className="text-sm font-medium text-slate-700">
            {dragActive ? "Drop your file here" : "Drag & drop a file here"}
          </p>
          <p className="mt-1.5 text-xs text-slate-400">
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

        {/* Progress */}
        {uploading && progress && (
          <div className="mt-6 space-y-2.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-300 ease-out"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">
                Uploading... {progress.percent}%
              </span>
              <button
                type="button"
                onClick={cancel}
                className="text-slate-400 transition-colors hover:text-red-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
