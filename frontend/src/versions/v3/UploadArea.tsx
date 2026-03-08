import { useCallback, useRef, useState } from "react";
import { useUpload } from "../../hooks/useUpload";

interface UploadAreaProps {
  onSuccess?: () => void;
}

export function UploadArea({ onSuccess }: UploadAreaProps) {
  const { upload, uploading, progress, error } = useUpload(onSuccess);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) upload(file);
    },
    [upload],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload(file);
      e.target.value = "";
    },
    [upload],
  );

  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`bg-white/5 backdrop-blur-md rounded-xl border p-10 text-center cursor-pointer transition-all w-full max-w-md ${
          dragOver
            ? "border-indigo-400 shadow-[0_0_30px_rgba(129,140,248,0.15)]"
            : "border-white/10"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-slate-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          {uploading && progress ? (
            <div className="w-full max-w-xs">
              <p className="text-slate-400 text-sm mb-2">
                Uploading... {progress.percent}%
              </p>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">
              Drop a file to transcribe
            </p>
          )}

          {error && <p className="text-rose-400 text-sm">{error}</p>}
        </div>
      </div>
    </div>
  );
}
