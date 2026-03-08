import { useRef, useState, useCallback } from "react";
import { useUpload } from "../../hooks/useUpload";

interface UploadHeroProps {
  onSuccess: () => void;
}

export function UploadHero({ onSuccess }: UploadHeroProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { upload, uploading, progress, error, cancel } = useUpload(onSuccess);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      upload(file);
    },
    [upload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [handleFile],
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !uploading && fileInputRef.current?.click()}
      className={`relative w-full rounded-2xl p-8 transition-all duration-300 cursor-pointer
        bg-stone-900 shadow-[0_4px_30px_rgba(245,158,11,0.08)]
        ${
          dragOver
            ? "border-2 border-amber-500/60 shadow-[0_4px_40px_rgba(245,158,11,0.2)]"
            : "border border-stone-800 hover:border-stone-700"
        }
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        onChange={handleInputChange}
      />

      {uploading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-4">
              <p className="text-stone-100 font-medium truncate">{fileName}</p>
              <p className="text-stone-500 text-sm mt-1">
                Uploading... {progress?.percent ?? 0}%
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                cancel();
              }}
              className="text-stone-500 hover:text-stone-300 text-sm transition-colors shrink-0"
            >
              Cancel
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${progress?.percent ?? 0}%`,
                background: "linear-gradient(90deg, #f59e0b, #f97316)",
              }}
            />
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          {/* Upload icon */}
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-stone-800 mb-4">
            <svg
              className="w-5 h-5 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12"
              />
            </svg>
          </div>
          <p className="text-stone-100 font-medium mb-1">
            Drop a file or click to upload
          </p>
          <p className="text-stone-500 text-sm">
            Audio or video files accepted
          </p>
        </div>
      )}

      {error && (
        <p className="text-rose-500 text-sm mt-4 text-center">{error}</p>
      )}
    </div>
  );
}
