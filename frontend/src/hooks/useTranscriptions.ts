import { useCallback, useEffect, useRef, useState } from "react";
import { getTranscriptions } from "../api/client";
import type { Transcription } from "../types";

const POLL_INTERVAL = 3_000;

export function useTranscriptions() {
  const [jobs, setJobs] = useState<Transcription[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getTranscriptions(0, 100);
      if (mountedRef.current) {
        setJobs(data.items);
        setTotal(data.total);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch jobs");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [refresh]);

  return { jobs, total, loading, error, refresh };
}
