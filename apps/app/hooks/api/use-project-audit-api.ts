"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  fetchProjectActionAudit,
  type ProjectActionAuditParams,
} from "@/lib/semblia-api";
import { queryKeys } from "./keys";
import { liveQueryOptions, type ApiQueryOptions } from "./query-options";

export function useProjectActionAudit(
  slug: string,
  params?: ProjectActionAuditParams,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.projectAudit.list(slug, params),
    queryFn: async () => {
      const token = await getToken();
      return fetchProjectActionAudit(token, slug, params);
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}
