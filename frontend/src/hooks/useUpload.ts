import { useCallback, useRef, useState } from "react";
import { uploadFile, type UploadProgress } from "../api/client";

export function useUpload(onSuccess?: () => void) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setUploading(true);
      setProgress(null);
      setError(null);

      const { promise, abort } = uploadFile(file, setProgress);
      abortRef.current = abort;

      try {
        await promise;
        onSuccess?.();
      } catch (err) {
        if (err instanceof Error && err.message !== "Upload cancelled") {
          setError(err.message);
        }
      } finally {
        setUploading(false);
        setProgress(null);
        abortRef.current = null;
      }
    },
    [onSuccess],
  );

  const cancel = useCallback(() => {
    abortRef.current?.();
  }, []);

  return { upload, uploading, progress, error, cancel };
}
