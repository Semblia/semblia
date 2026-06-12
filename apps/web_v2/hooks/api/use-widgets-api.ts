"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  fetchWidgets,
  fetchWidget,
  createWidget,
  duplicateWidget,
  updateWidget,
  deleteWidget,
  fetchWidgetDraft,
  saveWidgetDraft,
} from "@/lib/semblia-api";
import { queryKeys } from "./keys";
import { liveQueryOptions, type ApiQueryOptions } from "./query-options";

export function useWidgetsList(slug: string, options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.widgets.list(slug),
    queryFn: async () => {
      const token = await getToken();
      return fetchWidgets(token, slug);
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

export function useWidget(
  slug: string,
  widgetId: string,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.widgets.detail(slug, widgetId),
    queryFn: async () => {
      const token = await getToken();
      return fetchWidget(token, slug, widgetId);
    },
    enabled: isSignedIn === true && !!slug && !!widgetId,
    ...liveQueryOptions(options),
  });
}

export function useCreateWidget(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const token = await getToken();
      return createWidget(token, slug, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.widgets.list(slug) });
    },
  });
}

export function useDuplicateWidget(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (widgetId: string) => {
      const token = await getToken();
      return duplicateWidget(token, slug, widgetId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.widgets.list(slug) });
    },
  });
}

export function useUpdateWidget(slug: string, widgetId: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const token = await getToken();
      return updateWidget(token, slug, widgetId, body);
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.widgets.detail(slug, widgetId), data);
      qc.invalidateQueries({ queryKey: queryKeys.widgets.list(slug) });
    },
  });
}

export function useDeleteWidget(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (widgetId: string) => {
      const token = await getToken();
      return deleteWidget(token, slug, widgetId);
    },
    onSuccess: (_data, widgetId) => {
      qc.invalidateQueries({ queryKey: queryKeys.widgets.list(slug) });
      qc.removeQueries({
        queryKey: queryKeys.widgets.detail(slug, widgetId),
      });
    },
  });
}

export function useWidgetDraft(
  slug: string,
  widgetId: string,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.widgets.draft(slug, widgetId),
    queryFn: async () => {
      const token = await getToken();
      return fetchWidgetDraft(token, slug, widgetId);
    },
    enabled: isSignedIn === true && !!slug && !!widgetId,
    ...liveQueryOptions(options),
  });
}

export function useSaveWidgetDraft(slug: string, widgetId: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      draft: Record<string, unknown>;
      expectedVersion: number;
    }) => {
      const token = await getToken();
      return saveWidgetDraft(token, slug, widgetId, body);
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.widgets.draft(slug, widgetId), data);
    },
  });
}
