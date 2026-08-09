"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  createIntegrationConnection,
  createNativeIntegrationExport,
  disableIntegrationConnection,
  enableIntegrationConnection,
  fetchIntegrationConnections,
  fetchIntegrationResources,
  revokeIntegrationConnection,
  updateIntegrationConnection,
} from "@/lib/semblia-api";
import type { V2IntegrationProvider } from "@workspace/types";
import { queryKeys } from "./keys";
import { liveQueryOptions, type ApiQueryOptions } from "./query-options";

export function useIntegrationConnections(
  slug: string,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.integrations.connections(slug),
    queryFn: async () => {
      const token = await getToken();
      return fetchIntegrationConnections(token, slug);
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

export function useIntegrationResources(
  slug: string,
  provider: V2IntegrationProvider | null,
  params?: { cursor?: string; query?: string },
  options?: ApiQueryOptions & { enabled?: boolean },
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: provider
      ? queryKeys.integrations.resources(slug, provider, params)
      : queryKeys.integrations.resources(slug, "none", params),
    queryFn: async () => {
      const token = await getToken();
      return fetchIntegrationResources(
        token,
        slug,
        provider as V2IntegrationProvider,
        params,
      );
    },
    enabled:
      options?.enabled !== false && isSignedIn === true && !!slug && !!provider,
    ...liveQueryOptions(options),
  });
}

export function useCreateIntegrationConnection(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      body: Parameters<typeof createIntegrationConnection>[2],
    ) => {
      const token = await getToken();
      return createIntegrationConnection(token, slug, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.integrations.connections(slug),
      });
    },
  });
}

export function useUpdateIntegrationConnection(
  slug: string,
  connectionId: string,
) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      body: Parameters<typeof updateIntegrationConnection>[3],
    ) => {
      const token = await getToken();
      return updateIntegrationConnection(token, slug, connectionId, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.integrations.connections(slug),
      });
    },
  });
}

export function useEnableIntegrationConnection(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const token = await getToken();
      return enableIntegrationConnection(token, slug, connectionId);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.integrations.connections(slug),
      });
    },
  });
}

export function useDisableIntegrationConnection(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const token = await getToken();
      return disableIntegrationConnection(token, slug, connectionId);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.integrations.connections(slug),
      });
    },
  });
}

export function useRevokeIntegrationConnection(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const token = await getToken();
      return revokeIntegrationConnection(token, slug, connectionId);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.integrations.connections(slug),
      });
    },
  });
}

export function useCreateNativeIntegrationExport(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      connectionId,
      body,
    }: {
      connectionId: string;
      body: Parameters<typeof createNativeIntegrationExport>[3];
    }) => {
      const token = await getToken();
      return createNativeIntegrationExport(token, slug, connectionId, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.exports.deliveries(slug) });
    },
  });
}
