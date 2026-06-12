"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  fetchResponses,
  fetchResponse,
  createResponseAnnotation,
  moderateResponse,
} from "@/lib/semblia-api";
import { queryKeys } from "./keys";
import { liveQueryOptions, type ApiQueryOptions } from "./query-options";

export function useResponsesList(
  slug: string,
  params?: {
    page?: number;
    pageSize?: number;
    moderationStatus?: string;
    search?: string;
    sort?: string;
  },
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.responses.list(slug, params),
    queryFn: async () => {
      const token = await getToken();
      return fetchResponses(token, slug, params);
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

export function useResponse(
  slug: string,
  responseId: string,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.responses.detail(slug, responseId),
    queryFn: async () => {
      const token = await getToken();
      return fetchResponse(token, slug, responseId);
    },
    enabled: isSignedIn === true && !!slug && !!responseId,
    ...liveQueryOptions(options),
  });
}

export function useCreateResponseAnnotation(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      responseId,
      ...body
    }: {
      responseId: string;
      note?: string;
      labels?: string[];
      sentiment?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const token = await getToken();
      return createResponseAnnotation(token, slug, responseId, body);
    },
    onSuccess: (_data, { responseId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.responses.detail(slug, responseId),
      });
    },
  });
}

/**
 * Moderation is the single workflow action on a response: it sets the
 * `moderationStatus` (APPROVED / REJECTED / FLAGGED / PENDING). The legacy
 * testimonial approve/reject/publish endpoints collapsed into this one call
 * when the pipeline moved to canonical submissions.
 */
export function useModerateResponse(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      responseId,
      ...body
    }: {
      responseId: string;
      moderationStatus: string;
      reason?: string;
    }) => {
      const token = await getToken();
      return moderateResponse(token, slug, responseId, body);
    },
    onSuccess: (_data, { responseId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.responses.list(slug) });
      qc.invalidateQueries({
        queryKey: queryKeys.responses.detail(slug, responseId),
      });
    },
  });
}
