import { useCallback, useEffect, useRef, useState } from "react";
import { getWorkers } from "../api/client";
import type { Worker } from "../types";

export function useWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWorkers(0, 100);
      if (mountedRef.current) {
        setWorkers(data.items);
        setTotal(data.total);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch workers");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  return { workers, total, loading, error, refresh };
}
