import { useRef } from "react";
import { useUpload } from "../../hooks/useUpload";

export function UploadButton({ onSuccess }: { onSuccess?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, progress, error } = useUpload(onSuccess);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <span className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        onChange={handleChange}
      />
      {uploading ? (
        <span className="text-sm text-gray-400">
          Uploading...{progress ? ` ${progress.percent}%` : ""}
        </span>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
        >
          Upload
        </button>
      )}
      {error && (
        <span className="absolute top-full right-0 mt-1 text-xs text-red-500 whitespace-nowrap">
          {error}
        </span>
      )}
    </span>
  );
}
