"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  fetchResponses,
  updateResponseStatus,
  updateResponsePublish,
  deleteResponse,
} from "@/lib/semblia-api";
import { type ApiQueryOptions, liveQueryOptions } from "./query-options";

const responsesKey = (slug: string) => ["v2", "responses", slug] as const;

export interface ResponsesListParams {
  reviewStatus?: string;
  publishStatus?: string;
  sort?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Paginated, filterable responses list — the moderation inbox (Manage step of
 * the Collect → Manage → Display pipeline).
 */
export function useResponses(
  slug: string,
  params: ResponsesListParams,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: [...responsesKey(slug), "list", params],
    queryFn: async () => {
      const token = await getToken();
      return fetchResponses(token, slug, params);
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

/**
 * Approved + published responses for a project, used to populate the widget
 * studio preview with real testimonials (falls back to curated demo content
 * when a project has too few). Capped to a small page — preview fodder, not the
 * moderation inbox.
 */
export function useApprovedResponses(slug: string, options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: [...responsesKey(slug), "approved-preview"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetchResponses(token, slug, {
        reviewStatus: "APPROVED",
        publishStatus: "PUBLISHED",
        pageSize: 12,
      });
      return res.items;
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

export function useUpdateResponseStatus(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      responseId: string;
      status: string;
      reason?: string | null;
    }) => {
      const token = await getToken();
      return updateResponseStatus(token, slug, input.responseId, {
        status: input.status,
        reason: input.reason,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: responsesKey(slug) });
    },
  });
}

export function useUpdateResponsePublish(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { responseId: string; status: string }) => {
      const token = await getToken();
      return updateResponsePublish(token, slug, input.responseId, {
        status: input.status,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: responsesKey(slug) });
    },
  });
}

export function useDeleteResponse(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (responseId: string) => {
      const token = await getToken();
      return deleteResponse(token, slug, responseId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: responsesKey(slug) });
    },
  });
}
