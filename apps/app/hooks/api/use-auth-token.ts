"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

/**
 * Returns a stable callback that retrieves the current Clerk session token.
 * Intended to be called inside React Query `queryFn` / `mutationFn`.
 */
export function useAuthToken() {
  const { getToken } = useAuth();
  return useCallback(() => getToken(), [getToken]);
}
