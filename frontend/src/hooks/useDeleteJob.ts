import { useCallback, useState } from "react";
import { deleteTranscription } from "../api/client";

export function useDeleteJob(onSuccess?: () => void) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteJob = useCallback(
    async (id: string) => {
      if (!confirm("Delete this transcription? This cannot be undone.")) return;

      setDeleting(true);
      setError(null);
      try {
        await deleteTranscription(id);
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete");
      } finally {
        setDeleting(false);
      }
    },
    [onSuccess],
  );

  return { deleteJob, deleting, error };
}
