"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import type { V2CreateFormRequestBody } from "@workspace/types";
import {
  fetchFormRequests,
  createFormRequest,
  type FetchFormRequestsParams,
} from "@/lib/form-requests-api";
import { queryKeys } from "./keys";
import { liveQueryOptions, type ApiQueryOptions } from "./query-options";

export function useFormRequestsList(
  slug: string,
  params?: FetchFormRequestsParams,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.formRequests.list(slug, params),
    queryFn: async () => {
      const token = await getToken();
      return fetchFormRequests(token, slug, params);
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

export function useCreateFormRequest(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: V2CreateFormRequestBody) => {
      const token = await getToken();
      return createFormRequest(token, slug, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.formRequests.all(slug) });
    },
  });
}
