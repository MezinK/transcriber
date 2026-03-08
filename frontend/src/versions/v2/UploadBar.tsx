import { useCallback, useRef, useState, type DragEvent } from "react";
import { useUpload } from "../../hooks/useUpload";

const BAR_WIDTH = 20;

function renderProgressBar(percent: number): string {
  const filled = Math.round((percent / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  return "\u2588".repeat(filled) + "\u2591".repeat(empty);
}

export function UploadBar({ onSuccess }: { onSuccess?: () => void }) {
  const { upload, uploading, progress, error } = useUpload(onSuccess);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      upload(file).then(() => {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      });
    },
    [upload],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
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
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`bg-neutral-900 py-3 px-4 border cursor-pointer select-none transition-colors ${
        dragOver ? "border-green-400" : "border-neutral-800"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        onChange={handleInputChange}
      />
      {uploading && progress ? (
        <span className="text-green-400">
          &gt; uploading... [{renderProgressBar(progress.percent)}]{" "}
          {progress.percent}%
        </span>
      ) : showSuccess ? (
        <span className="text-green-300">&gt; upload complete.</span>
      ) : error ? (
        <span>
          <span className="text-red-400">&gt; error:</span>{" "}
          <span className="text-red-400/80">{error}</span>
        </span>
      ) : (
        <span className="text-green-400">&gt; upload_file</span>
      )}
    </div>
  );
}
