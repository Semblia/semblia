"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import type { V2ApiKeyType, V2UpdateApiKeyBody } from "@workspace/types";
import {
  fetchApiKeys,
  createApiKey,
  rotateApiKey,
  updateApiKey,
  revokeApiKey,
  fetchApiKeyEvents,
  fetchAgentAccessOverview,
  createAgentKey,
  revokeAgentKey,
  fetchAgentActions,
} from "@/lib/semblia-api";
import { queryKeys } from "./keys";
import { liveQueryOptions, type ApiQueryOptions } from "./query-options";

// ── Private API keys ────────────────────────────────────────────────────────

export function useApiKeysList(slug: string, options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.apiKeys.list(slug),
    queryFn: async () => {
      const token = await getToken();
      return fetchApiKeys(token, slug);
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

export function useCreateApiKey(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      name: string;
      scopes?: string[];
      expiresAt?: string;
    }) => {
      const token = await getToken();
      return createApiKey(token, slug, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apiKeys.list(slug) });
    },
  });
}

export function useRotateApiKey(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string) => {
      const token = await getToken();
      return rotateApiKey(token, slug, keyId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apiKeys.list(slug) });
    },
  });
}

export function useUpdateApiKey(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      keyId,
      body,
      keyType,
    }: {
      keyId: string;
      body: V2UpdateApiKeyBody;
      keyType?: Extract<V2ApiKeyType, "SECRET" | "AGENT">;
    }) => {
      const token = await getToken();
      return updateApiKey(token, slug, keyId, body, keyType);
    },
    onSuccess: (_updated, variables) => {
      if (variables.keyType === "AGENT") {
        qc.invalidateQueries({
          queryKey: queryKeys.agentAccess.overview(slug),
        });
        qc.invalidateQueries({
          queryKey: queryKeys.agentAccess.actions(slug),
        });
        return;
      }

      qc.invalidateQueries({ queryKey: queryKeys.apiKeys.list(slug) });
      qc.invalidateQueries({
        queryKey: queryKeys.apiKeys.events(slug, variables.keyId),
      });
    },
  });
}

export function useRevokeApiKey(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string) => {
      const token = await getToken();
      return revokeApiKey(token, slug, keyId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apiKeys.list(slug) });
    },
  });
}

export function useApiKeyEvents(
  slug: string,
  keyId: string,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.apiKeys.events(slug, keyId),
    queryFn: async () => {
      const token = await getToken();
      return fetchApiKeyEvents(token, slug, keyId);
    },
    enabled: isSignedIn === true && !!slug && !!keyId,
    ...liveQueryOptions(options),
  });
}

// ── Agent access ────────────────────────────────────────────────────────────

export function useAgentAccessOverview(
  slug: string,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.agentAccess.overview(slug),
    queryFn: async () => {
      const token = await getToken();
      return fetchAgentAccessOverview(token, slug);
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

export function useCreateAgentKey(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: { name: string; preset: string }) => {
      const token = await getToken();
      return createAgentKey(token, slug, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.agentAccess.overview(slug),
      });
    },
  });
}

export function useRevokeAgentKey(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string) => {
      const token = await getToken();
      return revokeAgentKey(token, slug, keyId);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.agentAccess.overview(slug),
      });
    },
  });
}

export function useAgentActions(slug: string, options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.agentAccess.actions(slug),
    queryFn: async () => {
      const token = await getToken();
      return fetchAgentActions(token, slug);
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}
