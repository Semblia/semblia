"use client";

export interface ApiQueryOptions {
  freshOnMount?: boolean;
}

export function liveQueryOptions(options?: ApiQueryOptions) {
  return options?.freshOnMount
    ? ({ staleTime: 0, refetchOnMount: "always" } as const)
    : {};
}
