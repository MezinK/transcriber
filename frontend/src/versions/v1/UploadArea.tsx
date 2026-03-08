import { useCallback, useRef, useState } from "react";
import { useUpload } from "../../hooks/useUpload.ts";

interface UploadAreaProps {
  onSuccess: () => void;
}

export function UploadArea({ onSuccess }: UploadAreaProps) {
  const { upload, uploading, progress, error } = useUpload(onSuccess);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
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

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile],
  );

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${dragOver ? "border-slate-400" : "border-slate-200"}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*"
          onChange={handleInputChange}
          className="hidden"
        />

        {uploading && progress ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Uploading… {progress.percent}%
            </p>
            <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-600 rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">
            Drop an audio or video file here, or click to browse
          </p>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
