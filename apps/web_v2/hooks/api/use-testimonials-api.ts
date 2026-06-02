"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  fetchTestimonials,
  fetchTestimonial,
  approveTestimonial,
  rejectTestimonial,
  publishTestimonial,
} from "@/lib/tresta-api";
import { queryKeys } from "./keys";
import { liveQueryOptions, type ApiQueryOptions } from "./query-options";

export function useTestimonialsList(
  slug: string,
  params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    type?: string;
    search?: string;
    sort?: string;
  },
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.testimonials.list(slug, params),
    queryFn: async () => {
      const token = await getToken();
      return fetchTestimonials(token, slug, params);
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

export function useTestimonial(
  slug: string,
  submissionId: string,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.testimonials.detail(slug, submissionId),
    queryFn: async () => {
      const token = await getToken();
      return fetchTestimonial(token, slug, submissionId);
    },
    enabled: isSignedIn === true && !!slug && !!submissionId,
    ...liveQueryOptions(options),
  });
}

export function useApproveTestimonial(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (submissionId: string) => {
      const token = await getToken();
      return approveTestimonial(token, slug, submissionId);
    },
    onSuccess: (_data, submissionId) => {
      qc.invalidateQueries({ queryKey: queryKeys.testimonials.list(slug) });
      qc.invalidateQueries({
        queryKey: queryKeys.testimonials.detail(slug, submissionId),
      });
    },
  });
}

export function useRejectTestimonial(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (submissionId: string) => {
      const token = await getToken();
      return rejectTestimonial(token, slug, submissionId);
    },
    onSuccess: (_data, submissionId) => {
      qc.invalidateQueries({ queryKey: queryKeys.testimonials.list(slug) });
      qc.invalidateQueries({
        queryKey: queryKeys.testimonials.detail(slug, submissionId),
      });
    },
  });
}

export function usePublishTestimonial(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      published,
    }: {
      submissionId: string;
      published: boolean;
    }) => {
      const token = await getToken();
      return publishTestimonial(token, slug, submissionId, { published });
    },
    onSuccess: (_data, { submissionId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.testimonials.list(slug) });
      qc.invalidateQueries({
        queryKey: queryKeys.testimonials.detail(slug, submissionId),
      });
    },
  });
}
