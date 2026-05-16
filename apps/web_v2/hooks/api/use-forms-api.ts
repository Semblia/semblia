"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  fetchForms,
  fetchForm,
  createForm,
  duplicateForm,
  updateForm,
  deleteForm,
  fetchFormDraft,
  saveFormDraft,
} from "@/lib/tresta-api";
import { queryKeys } from "./keys";
import { liveQueryOptions, type ApiQueryOptions } from "./query-options";

export function useFormsList(slug: string, options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.forms.list(slug),
    queryFn: async () => {
      const token = await getToken();
      return fetchForms(token, slug);
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

export function useForm(
  slug: string,
  formId: string,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.forms.detail(slug, formId),
    queryFn: async () => {
      const token = await getToken();
      return fetchForm(token, slug, formId);
    },
    enabled: isSignedIn === true && !!slug && !!formId,
    ...liveQueryOptions(options),
  });
}

export function useCreateForm(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      name: string;
      description?: string;
      config?: unknown;
    }) => {
      const token = await getToken();
      return createForm(token, slug, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.forms.list(slug) });
    },
  });
}

export function useDuplicateForm(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (formId: string) => {
      const token = await getToken();
      return duplicateForm(token, slug, formId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.forms.list(slug) });
    },
  });
}

export function useUpdateForm(slug: string, formId: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const token = await getToken();
      return updateForm(token, slug, formId, body);
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.forms.detail(slug, formId), data);
      qc.invalidateQueries({ queryKey: queryKeys.forms.list(slug) });
    },
  });
}

export function useDeleteForm(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (formId: string) => {
      const token = await getToken();
      return deleteForm(token, slug, formId);
    },
    onSuccess: (_data, formId) => {
      qc.invalidateQueries({ queryKey: queryKeys.forms.list(slug) });
      qc.removeQueries({ queryKey: queryKeys.forms.detail(slug, formId) });
    },
  });
}

export function useFormDraft(
  slug: string,
  formId: string,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.forms.draft(slug, formId),
    queryFn: async () => {
      const token = await getToken();
      return fetchFormDraft(token, slug, formId);
    },
    enabled: isSignedIn === true && !!slug && !!formId,
    ...liveQueryOptions(options),
  });
}

export function useSaveFormDraft(slug: string, formId: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      draft: Record<string, unknown>;
      expectedVersion: number;
    }) => {
      const token = await getToken();
      return saveFormDraft(token, slug, formId, body);
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.forms.draft(slug, formId), data);
    },
  });
}
