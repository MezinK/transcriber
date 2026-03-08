import { useCallback, useState, type DragEvent } from "react";
import { useUpload } from "../../hooks/useUpload";

interface UploadAreaProps {
  onSuccess: () => void;
}

export function UploadArea({ onSuccess }: UploadAreaProps) {
  const { upload, uploading, progress, error } = useUpload(onSuccess);
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) upload(file);
    },
    [upload],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleFileSelect = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*,video/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) upload(file);
    };
    input.click();
  }, [upload]);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleFileSelect}
        className={`
          w-full max-w-lg aspect-square flex flex-col items-center justify-center
          rounded-xl border-2 border-dashed cursor-pointer transition-colors duration-200
          ${
            dragActive
              ? "border-indigo-500 bg-indigo-50"
              : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
          }
        `}
      >
        {uploading && progress ? (
          <div className="w-48 space-y-3 text-center">
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-sm text-slate-500">Uploading... {progress.percent}%</p>
          </div>
        ) : (
          <>
            <div className="text-4xl mb-4 text-slate-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="text-slate-400 text-sm">Drop a file to transcribe</p>
            <p className="text-slate-300 text-xs mt-1">or click to browse</p>
          </>
        )}

        {error && (
          <p className="text-red-500 text-sm mt-4">{error}</p>
        )}
      </div>
    </div>
  );
}
