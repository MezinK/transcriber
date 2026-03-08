import { useCallback, useEffect, useRef, useState } from "react";
import { getTranscription } from "../api/client";
import type { Transcription } from "../types";

const POLL_INTERVAL = 3_000;

export function useTranscription(id: string | undefined) {
  const [job, setJob] = useState<Transcription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getTranscription(id);
      if (mountedRef.current) {
        setJob(data);
        setError(null);
        // Stop polling when terminal
        if (data.status === "completed" || data.status === "failed") {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch job");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    mountedRef.current = true;
    if (!id) {
      setJob(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh();
    intervalRef.current = setInterval(refresh, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [id, refresh]);

  return { job, loading, error, refresh };
}
