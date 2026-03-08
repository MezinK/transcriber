import { useCallback, useRef } from "react";
import { useUpload } from "../../hooks/useUpload";

export function UploadButton() {
  const { upload, uploading, progress, error, cancel } = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (files?.[0]) void upload(files[0]);
    },
    [upload],
  );

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="text-sm text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-50"
      >
        {uploading ? null : "Upload file"}
      </button>

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

      {uploading && progress && (
        <span className="text-sm text-gray-400">
          Uploading... {progress.percent}%
          <button
            type="button"
            onClick={cancel}
            className="ml-2 text-gray-300 transition-colors hover:text-gray-600"
          >
            Cancel
          </button>
        </span>
      )}

      {error && (
        <span className="text-sm text-red-400">{error}</span>
      )}
    </div>
  );
}
