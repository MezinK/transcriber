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
    <div className="relative flex h-full flex-col items-center justify-center px-6">
      <div className="w-full max-w-lg">
        {/* Heading */}
        <div className="mb-10 text-center">
          <h2 className="font-['Sora',sans-serif] text-2xl font-semibold tracking-tight text-[#e2e4f0]">
            New Transcription
          </h2>
          <p className="mt-2 font-['DM_Sans',sans-serif] text-sm text-[#6b6f8a]">
            Upload an audio or video file to begin transcribing
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
          className={[
            "relative flex flex-col items-center justify-center rounded-xl border px-8 py-16 transition-all duration-300",
            dragActive
              ? "border-[#818cf8] bg-[rgba(129,140,248,0.06)] shadow-[0_0_30px_rgba(129,140,248,0.15)]"
              : "border-[rgba(129,140,248,0.12)] bg-[#12122a] hover:border-[rgba(129,140,248,0.25)] hover:shadow-[0_0_20px_rgba(129,140,248,0.08)]",
            uploading ? "pointer-events-none opacity-60" : "cursor-pointer",
            dragActive ? "animate-[glow-pulse_2s_ease-in-out_infinite]" : "",
          ].join(" ")}
        >
          {/* Upload icon */}
          <div
            className={[
              "mb-5 flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-300",
              dragActive
                ? "border-[#818cf8] bg-[rgba(129,140,248,0.12)] shadow-[0_0_16px_rgba(129,140,248,0.2)]"
                : "border-[rgba(129,140,248,0.1)] bg-[rgba(129,140,248,0.05)]",
            ].join(" ")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className={[
                "h-7 w-7 transition-colors duration-300",
                dragActive ? "text-[#818cf8]" : "text-[#6b6f8a]",
              ].join(" ")}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>

          <p className="font-['Sora',sans-serif] text-sm font-medium text-[#e2e4f0]">
            {dragActive ? "Drop your file here" : "Drop file to transcribe"}
          </p>
          <p className="mt-2 font-['DM_Sans',sans-serif] text-xs text-[#6b6f8a]">
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
          <div className="mt-6 space-y-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(129,140,248,0.1)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#818cf8] to-[#6366f1] shadow-[0_0_12px_rgba(129,140,248,0.4)] transition-all duration-300 ease-out"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-['JetBrains_Mono',monospace] text-xs text-[#818cf8]">
                Uploading... {progress.percent}%
              </span>
              <button
                type="button"
                onClick={cancel}
                className="font-['DM_Sans',sans-serif] text-xs text-[#6b6f8a] transition-colors duration-200 hover:text-[#f87171]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-lg border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.06)] px-4 py-3 font-['DM_Sans',sans-serif] text-sm text-[#f87171]">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
