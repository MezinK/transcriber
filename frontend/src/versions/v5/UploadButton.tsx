import { useCallback, useRef, useState } from "react";
import { useUpload } from "../../hooks/useUpload";

export function UploadButton() {
  const { upload, uploading, progress, error, cancel } = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (files?.[0]) void upload(files[0]);
    },
    [upload],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div className="flex items-start gap-8">
      {/* Label column */}
      <div className="w-32 shrink-0 pt-10">
        <span className="font-['JetBrains_Mono',monospace] text-[10px] uppercase tracking-[0.2em] text-[#888888]">
          Upload
        </span>
      </div>

      {/* Content column */}
      <div className="flex-1">
        {/* Drop zone — sharp, flat, Swiss */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center border-2 px-8 py-10 transition-colors duration-200 ${
            dragging
              ? "border-[#dc2626] bg-white"
              : "border-[#111111] bg-white hover:bg-[#f5f5f5]"
          }`}
        >
          {/* Geometric upload arrow */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="mb-4"
          >
            <path
              d="M12 3L5 10H9V16H15V10H19L12 3Z"
              fill={dragging ? "#dc2626" : "#111111"}
            />
            <rect
              x="5"
              y="19"
              width="14"
              height="2"
              fill={dragging ? "#dc2626" : "#111111"}
            />
          </svg>

          <span
            className={`font-['DM_Sans',sans-serif] text-lg font-black transition-colors duration-200 ${
              dragging ? "text-[#dc2626]" : "text-[#111111]"
            }`}
          >
            Upload
          </span>

          <span className="mt-2 font-['JetBrains_Mono',monospace] text-[11px] text-[#888888]">
            .mp3 .wav .m4a .mp4 .webm .ogg
          </span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Progress bar — thin black track, red fill, sharp */}
        {uploading && progress && (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="font-['JetBrains_Mono',monospace] text-[11px] text-[#111111]">
                {progress.percent}%
              </span>
              <button
                type="button"
                onClick={cancel}
                className="font-['JetBrains_Mono',monospace] text-[11px] text-[#888888] transition-colors duration-200 hover:text-[#dc2626]"
              >
                Cancel
              </button>
            </div>
            <div className="mt-2 h-[2px] w-full bg-[#e5e5e5]">
              <div
                className="h-full bg-[#dc2626] transition-all duration-200"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-4 font-['JetBrains_Mono',monospace] text-[11px] text-[#dc2626]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
