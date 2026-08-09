"use client";

import * as React from "react";
import type { ViewMode } from "@/components/shared/view-toggle";

/**
 * Persists the list/grid toggle choice to localStorage per storage key.
 * SSR-safe: returns the default on the server and on first paint, then
 * syncs to the stored value after mount.
 */
export function useViewMode(
  storageKey: string,
  defaultMode: ViewMode = "list",
): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setMode] = React.useState<ViewMode>(defaultMode);

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "list" || stored === "grid") setMode(stored);
    } catch {
      // localStorage unavailable (private mode, security policy) — use default.
    }
  }, [storageKey]);

  const set = React.useCallback(
    (next: ViewMode) => {
      setMode(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        // best-effort persist
      }
    },
    [storageKey],
  );

  return [mode, set];
}
