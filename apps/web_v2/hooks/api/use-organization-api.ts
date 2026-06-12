"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { fetchCurrentOrganization } from "@/lib/semblia-api";
import { queryKeys } from "./keys";
import { liveQueryOptions, type ApiQueryOptions } from "./query-options";

export function useCurrentOrganization(options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.organization,
    queryFn: async () => {
      const token = await getToken();
      return fetchCurrentOrganization(token);
    },
    enabled: isSignedIn === true,
    ...liveQueryOptions(options),
  });
}
