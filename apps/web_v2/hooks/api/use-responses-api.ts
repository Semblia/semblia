"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import type { V2SendResponseThankYouBody } from "@workspace/types";
import {
  fetchResponse,
  fetchResponses,
  sendResponseThankYou,
  updateResponseStatus,
  updateResponsePublish,
  deleteResponse,
} from "@/lib/semblia-api";
import { type ApiQueryOptions, liveQueryOptions } from "./query-options";
import { queryKeys } from "./keys";

export interface ResponsesListParams {
  reviewStatus?: string;
  publishStatus?: string;
  formId?: string;
  origin?: string;
  sort?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Shared shape of every responses query: Clerk token + signed-in gating. */
function useResponsesQueryOptions() {
  const { getToken, isSignedIn } = useAuth();

  return <T>(input: {
    queryKey: readonly unknown[];
    enabled: boolean;
    options?: ApiQueryOptions;
    fetch: (token: string | null) => Promise<T>;
  }) => ({
    queryKey: input.queryKey,
    queryFn: async () => input.fetch(await getToken()),
    enabled: isSignedIn === true && input.enabled,
    ...liveQueryOptions(input.options),
  });
}

/** Shared shape of every responses mutation: Clerk token + list invalidation. */
function useResponsesMutationOptions() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return <TInput, TResult>(input: {
    slug: string;
    mutate: (token: string | null, input: TInput) => Promise<TResult>;
  }) => ({
    mutationFn: async (vars: TInput) => input.mutate(await getToken(), vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.responses.all(input.slug) });
    },
  });
}

interface StatusInput {
  responseId: string;
  status: string;
  reason?: string | null;
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
  const queryOptions = useResponsesQueryOptions();
  return useQuery(
    queryOptions({
      queryKey: queryKeys.responses.list(slug, params),
      enabled: !!slug,
      options,
      fetch: (token) => fetchResponses(token, slug, params),
    }),
  );
}

/** One response in full — the detail page's record. */
export function useResponse(
  slug: string,
  responseId: string,
  options?: ApiQueryOptions,
) {
  const queryOptions = useResponsesQueryOptions();
  const fetch = (token: string | null) =>
    fetchResponse(token, slug, responseId);
  const queryKey = queryKeys.responses.detail({ slug, responseId });
  const enabled = !!slug && !!responseId;
  return useQuery(queryOptions({ queryKey, enabled, options, fetch }));
}

/**
 * Approved + published responses for a project, used to populate the widget
 * studio preview with real testimonials (falls back to curated demo content
 * when a project has too few). Capped to a small page — preview fodder, not the
 * moderation inbox.
 */
export function useApprovedResponses(slug: string, options?: ApiQueryOptions) {
  const queryOptions = useResponsesQueryOptions();
  const fetch = async (token: string | null) => {
    const res = await fetchResponses(token, slug, {
      reviewStatus: "APPROVED",
      publishStatus: "PUBLISHED",
      pageSize: 12,
    });
    return res.items;
  };
  const queryKey = queryKeys.responses.approvedPreview(slug);
  return useQuery(queryOptions({ queryKey, enabled: !!slug, options, fetch }));
}

export function useUpdateResponseStatus(slug: string) {
  const mutationOptions = useResponsesMutationOptions();
  const mutate = (token: string | null, input: StatusInput) =>
    updateResponseStatus(token, slug, input.responseId, {
      status: input.status,
      reason: input.reason,
    });
  return useMutation(mutationOptions({ slug, mutate }));
}

export function useUpdateResponsePublish(slug: string) {
  const mutationOptions = useResponsesMutationOptions();
  const mutate = (token: string | null, input: Omit<StatusInput, "reason">) =>
    updateResponsePublish(token, slug, input.responseId, {
      status: input.status,
    });
  return useMutation(mutationOptions({ slug, mutate }));
}

export function useDeleteResponse(slug: string) {
  const mutationOptions = useResponsesMutationOptions();
  const mutate = (token: string | null, responseId: string) =>
    deleteResponse(token, slug, responseId);
  return useMutation(mutationOptions({ slug, mutate }));
}

/**
 * Thank the person who left this testimonial. Invalidating the responses tree
 * is what makes the record come back carrying its `thankYou`, so the screen
 * stops offering to send the same message again.
 */
export function useSendResponseThankYou(slug: string, responseId: string) {
  const mutationOptions = useResponsesMutationOptions();
  const mutate = (token: string | null, body: V2SendResponseThankYouBody) =>
    sendResponseThankYou(token, slug, responseId, body);
  return useMutation(mutationOptions({ slug, mutate }));
}
