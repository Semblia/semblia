"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  createOutboundWebhookEndpoint,
  disableOutboundWebhookEndpoint,
  fetchOutboundWebhookDeliveries,
  fetchOutboundWebhookDelivery,
  fetchOutboundWebhookEndpoint,
  fetchOutboundWebhookEndpoints,
  retryOutboundWebhookDelivery,
  revokeOutboundWebhookEndpoint,
  rotateOutboundWebhookSecret,
  updateOutboundWebhookEndpoint,
  type OutboundWebhookDeliveriesParams,
} from "@/lib/semblia-api";
import { queryKeys } from "./keys";
import { liveQueryOptions, type ApiQueryOptions } from "./query-options";

export function useOutboundWebhookEndpoints(
  slug: string,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.outboundWebhooks.all(slug),
    queryFn: async () => {
      const token = await getToken();
      return fetchOutboundWebhookEndpoints(token, slug);
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

export function useOutboundWebhookEndpoint(
  slug: string,
  endpointId: string,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.outboundWebhooks.detail(slug, endpointId),
    queryFn: async () => {
      const token = await getToken();
      return fetchOutboundWebhookEndpoint(token, slug, endpointId);
    },
    enabled: isSignedIn === true && !!slug && !!endpointId,
    ...liveQueryOptions(options),
  });
}

export function useCreateOutboundWebhookEndpoint(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      body: Parameters<typeof createOutboundWebhookEndpoint>[2],
    ) => {
      const token = await getToken();
      return createOutboundWebhookEndpoint(token, slug, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.outboundWebhooks.all(slug) });
    },
  });
}

export function useUpdateOutboundWebhookEndpoint(
  slug: string,
  endpointId: string,
) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      body: Parameters<typeof updateOutboundWebhookEndpoint>[3],
    ) => {
      const token = await getToken();
      return updateOutboundWebhookEndpoint(token, slug, endpointId, body);
    },
    onSuccess: (endpoint) => {
      qc.setQueryData(
        queryKeys.outboundWebhooks.detail(slug, endpointId),
        endpoint,
      );
      qc.invalidateQueries({ queryKey: queryKeys.outboundWebhooks.all(slug) });
    },
  });
}

export function useDisableOutboundWebhookEndpoint(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (endpointId: string) => {
      const token = await getToken();
      return disableOutboundWebhookEndpoint(token, slug, endpointId);
    },
    onSuccess: (endpoint) => {
      qc.setQueryData(
        queryKeys.outboundWebhooks.detail(slug, endpoint.id),
        endpoint,
      );
      qc.invalidateQueries({ queryKey: queryKeys.outboundWebhooks.all(slug) });
    },
  });
}

export function useRevokeOutboundWebhookEndpoint(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (endpointId: string) => {
      const token = await getToken();
      return revokeOutboundWebhookEndpoint(token, slug, endpointId);
    },
    onSuccess: (endpoint) => {
      qc.setQueryData(
        queryKeys.outboundWebhooks.detail(slug, endpoint.id),
        endpoint,
      );
      qc.invalidateQueries({ queryKey: queryKeys.outboundWebhooks.all(slug) });
    },
  });
}

export function useRotateOutboundWebhookSecret(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (endpointId: string) => {
      const token = await getToken();
      return rotateOutboundWebhookSecret(token, slug, endpointId);
    },
    onSuccess: (endpoint) => {
      qc.setQueryData(
        queryKeys.outboundWebhooks.detail(slug, endpoint.id),
        endpoint,
      );
      qc.invalidateQueries({ queryKey: queryKeys.outboundWebhooks.all(slug) });
    },
  });
}

export function useOutboundWebhookDeliveries(
  slug: string,
  params?: OutboundWebhookDeliveriesParams,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.outboundWebhooks.deliveries(slug, params),
    queryFn: async () => {
      const token = await getToken();
      return fetchOutboundWebhookDeliveries(token, slug, params);
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

export function useOutboundWebhookDelivery(
  slug: string,
  deliveryId: string,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.outboundWebhooks.delivery(slug, deliveryId),
    queryFn: async () => {
      const token = await getToken();
      return fetchOutboundWebhookDelivery(token, slug, deliveryId);
    },
    enabled: isSignedIn === true && !!slug && !!deliveryId,
    ...liveQueryOptions(options),
  });
}

export function useRetryOutboundWebhookDelivery(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (deliveryId: string) => {
      const token = await getToken();
      return retryOutboundWebhookDelivery(token, slug, deliveryId);
    },
    onSuccess: (delivery) => {
      qc.setQueryData(
        queryKeys.outboundWebhooks.delivery(slug, delivery.id),
        delivery,
      );
      qc.invalidateQueries({
        queryKey: queryKeys.outboundWebhooks.deliveries(slug),
      });
    },
  });
}
