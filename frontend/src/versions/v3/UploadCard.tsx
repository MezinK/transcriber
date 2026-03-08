import { useCallback, useRef, useState } from "react";
import { useUpload } from "../../hooks/useUpload";

export function UploadCard({ onSuccess }: { onSuccess?: () => void }) {
  const { upload, uploading, progress, error } = useUpload(onSuccess);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (files && files.length > 0) {
        upload(files[0]);
      }
    },
    [upload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 text-center">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors ${
          dragOver
            ? "border-blue-400 bg-blue-50"
            : "border-stone-200 hover:border-stone-300"
        }`}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-500 text-2xl">
          &uarr;
        </div>
        <p className="text-stone-500">
          {uploading ? "Uploading..." : "Drop a file here or click to browse"}
        </p>

        {uploading && progress && (
          <div className="mt-4 mx-auto max-w-xs">
            <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-stone-400">{progress.percent}%</p>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept="audio/*,video/*"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
