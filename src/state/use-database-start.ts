import { useCallback, useEffect, useRef, useState } from "react";

import { initializeDatabase } from "./database-ready";

export type DatabaseStatus = "opening" | "failed" | "ready";

export interface DatabaseStart {
  status: DatabaseStatus;
  retrying: boolean;
  retry: () => void;
}

/**
 * Owns the start-up: opens the data once on mount and lets a failed attempt be repeated by hand.
 * The error is dropped on purpose: it may hold a path or a player name (principle 5).
 */
export function useDatabaseStart(): DatabaseStart {
  const [status, setStatus] = useState<DatabaseStatus>("opening");
  const [retrying, setRetrying] = useState(false);
  // Refs, not state: two presses in the same render must see the attempt of the first one.
  const statusRef = useRef<DatabaseStatus>("opening");
  const runningRef = useRef(false);
  const mountedRef = useRef(false);

  const attempt = useCallback((): void => {
    runningRef.current = true;
    const finish = (next: DatabaseStatus): void => {
      runningRef.current = false;
      statusRef.current = next;
      if (!mountedRef.current) return;
      setRetrying(false);
      setStatus(next);
    };
    initializeDatabase().then(
      () => finish("ready"),
      () => finish("failed"),
    );
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    attempt();
    return () => {
      mountedRef.current = false;
    };
  }, [attempt]);

  const retry = useCallback((): void => {
    if (statusRef.current !== "failed" || runningRef.current) return;
    setRetrying(true);
    attempt();
  }, [attempt]);

  return { status, retrying, retry };
}
