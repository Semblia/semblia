"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import type {
  V2AccountDefaultsDTO,
  V2UpdateAccountDefaultsBody,
} from "@workspace/types";
import { fetchAccountDefaults, updateAccountDefaults } from "@/lib/tresta-api";
import { queryKeys } from "./keys";
import { liveQueryOptions, type ApiQueryOptions } from "./query-options";

export function useAccountDefaults(options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.accountDefaults,
    queryFn: async () => {
      const token = await getToken();
      return fetchAccountDefaults(token);
    },
    enabled: isSignedIn === true,
    ...liveQueryOptions(options),
  });
}

export function useUpdateAccountDefaults() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: V2UpdateAccountDefaultsBody) => {
      const token = await getToken();
      return updateAccountDefaults(token, body);
    },
    onSuccess: (defaults: V2AccountDefaultsDTO) => {
      qc.setQueryData(queryKeys.accountDefaults, defaults);
    },
  });
}
