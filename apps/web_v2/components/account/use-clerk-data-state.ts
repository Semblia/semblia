"use client";

/**
 * Clerk-backed surfaces, on the app's one data-state system.
 *
 * `useUser()` is not a react-query result, so every account surface used to
 * hand-write the ladder the system forbids:
 *
 *     !isLoaded ? <Skeleton /> : <Form value={user.firstName} />
 *
 * which carries the same hole as the list version it mirrors — when the session
 * resolves to no user at all, that renders an empty, editable form whose save
 * can never succeed. Adapting Clerk's two-field signal onto the fields
 * `useDataState` reads gives the account area the same designed states as every
 * query-backed surface (cold load, error, ready) instead of a second state
 * vocabulary that lives only here.
 *
 * Retry is a reload: Clerk owns the session and exposes no refetch for a user
 * it could not resolve, so re-running the load is the only honest recovery.
 */

import * as React from "react";
import {
  useDataState,
  type DataStateResult,
  type UseDataStateOptions,
} from "@/components/shared";

/** The exact slice of a query result `useDataState` reads. */
type DataStateQuery = Parameters<typeof useDataState>[0];

/**
 * Separates "still loading" from "loaded, and there is no user". A plain Error
 * (rather than an `ApiError`) is deliberate: there is no HTTP status behind a
 * missing session, so it classifies as a generic failure with a retry, not as
 * a permanent forbidden/not-found that must never offer one.
 */
const SESSION_UNAVAILABLE = new Error(
  "Clerk resolved no user for this session",
);

/**
 * Clerk hands back the live session object, never a cached copy, so its data is
 * never "stale on mount". A timestamp that always beats the mount time says
 * exactly that — and keeps this hook pure, which reading the clock during
 * render would not.
 */
const ALWAYS_FRESH = Number.MAX_SAFE_INTEGER;

export function useClerkDataState<T>(
  value: T | null | undefined,
  isLoaded: boolean,
  options: UseDataStateOptions = {},
): DataStateResult {
  const resolved = value ?? undefined;
  const failed = isLoaded && resolved === undefined;

  const query = React.useMemo(
    () => ({
      data: isLoaded ? resolved : undefined,
      dataUpdatedAt: isLoaded ? ALWAYS_FRESH : 0,
      error: failed ? SESSION_UNAVAILABLE : null,
      isError: failed,
      isFetching: !isLoaded,
      isPending: !isLoaded,
      isRefetching: false,
      refetch: reloadSession,
    }),
    [failed, isLoaded, resolved],
  );

  // `useDataState` types its input as a react-query result; the object above
  // carries every field it actually reads, and nothing it doesn't.
  return useDataState(query as unknown as DataStateQuery, options);
}

function reloadSession() {
  if (typeof window !== "undefined") window.location.reload();
}
