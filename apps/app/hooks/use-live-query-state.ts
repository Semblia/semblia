"use client";

import * as React from "react";
import type { UseQueryResult } from "@tanstack/react-query";

type LiveQueryLike<TData> = Pick<
  UseQueryResult<TData, unknown>,
  "data" | "dataUpdatedAt" | "isFetching" | "isPending" | "isRefetching"
>;

interface LiveQueryStateOptions {
  /**
   * Treat cached data from before this component mounted as not ready while
   * the query is actively fetching a fresh response.
   */
  requireFreshOnMount?: boolean;
}

export function useLiveQueryState<TData>(
  query: LiveQueryLike<TData>,
  options: LiveQueryStateOptions = {},
) {
  const [mountedAt] = React.useState(() => Date.now());

  const hasData = query.data !== undefined;
  const hasFreshData = hasData && query.dataUpdatedAt >= mountedAt;
  const waitingForInitialData = !hasData && query.isPending;
  const waitingForFreshMountData =
    options.requireFreshOnMount && hasData && !hasFreshData && query.isFetching;
  const isWaitingForLiveData =
    waitingForInitialData || waitingForFreshMountData;

  return {
    hasData,
    hasFreshData,
    isWaitingForLiveData,
    isBackgroundRefreshing:
      hasData && !isWaitingForLiveData && query.isRefetching,
  };
}
