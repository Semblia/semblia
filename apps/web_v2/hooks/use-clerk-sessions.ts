"use client";

/**
 * Active sessions for the signed-in user, read from Clerk's client SDK.
 *
 * Lives here rather than inside the component for the same reason every other
 * query does: `app/` and `components/` never call `useQuery` directly, so the
 * cache key, the enable condition, and the invalidation for a resource are
 * stated in exactly one place. `SessionsList` was the last surface still
 * holding its own query, which the live-query policy test catches.
 *
 * Not in `hooks/api/` — that directory is the Semblia API. This reads Clerk.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { useUser } from "@clerk/nextjs";

/**
 * Clerk's user resource, derived from the SDK rather than imported from
 * `@clerk/types` — that package is not a direct dependency here, and pinning
 * to the hook's own return type means a Clerk upgrade cannot silently drift
 * this away from what the app actually receives.
 */
type ClerkUser = NonNullable<ReturnType<typeof useUser>["user"]>;

function sessionsKey(userId: string | null) {
  return ["account", "sessions", userId] as const;
}

export function useClerkSessions(
  user: ClerkUser | null | undefined,
  isLoaded: boolean,
) {
  return useQuery({
    queryKey: sessionsKey(user?.id ?? null),
    queryFn: () => (user as ClerkUser).getSessions(),
    // Clerk resolving to no user leaves this disabled forever; the caller
    // reports that as its own state rather than as a load that never lands.
    enabled: isLoaded && Boolean(user),
  });
}

/** Invalidate after revoking, so the list reflects the revocation. */
export function useRefreshClerkSessions(
  user: ClerkUser | null | undefined,
): () => void {
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  return () => {
    void queryClient.invalidateQueries({ queryKey: sessionsKey(userId) });
  };
}
