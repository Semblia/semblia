"use client";

import { useQuery } from "@tanstack/react-query";
import {
  resolvePublicSurface,
  type PublicSurfaceResolutionParams,
} from "@/lib/semblia-api";
import { queryKeys } from "./keys";
import { liveQueryOptions, type ApiQueryOptions } from "./query-options";

export function usePublicSurfaceResolution(
  params: PublicSurfaceResolutionParams,
  options?: ApiQueryOptions,
) {
  return useQuery({
    queryKey: queryKeys.publicSurfaces.resolve(params),
    queryFn: () => resolvePublicSurface(params),
    enabled: !!params.hostname,
    ...liveQueryOptions(options),
  });
}
