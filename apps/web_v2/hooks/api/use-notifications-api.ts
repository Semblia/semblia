"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  fetchNotificationPreferences,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
  type NotificationListParams,
} from "@/lib/semblia-api";
import { queryKeys } from "./keys";
import { liveQueryOptions, type ApiQueryOptions } from "./query-options";

export function useNotificationsList(
  params?: NotificationListParams,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: async () => {
      const token = await getToken();
      return fetchNotifications(token, params);
    },
    enabled: isSignedIn === true,
    ...liveQueryOptions(options),
  });
}

export function useUnreadNotificationCount(options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: async () => {
      const token = await getToken();
      return fetchUnreadNotificationCount(token);
    },
    enabled: isSignedIn === true,
    ...liveQueryOptions(options),
  });
}

export function useMarkNotificationRead() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const token = await getToken();
      return markNotificationRead(token, notificationId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return markAllNotificationsRead(token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useNotificationPreferences(options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.notifications.preferences,
    queryFn: async () => {
      const token = await getToken();
      return fetchNotificationPreferences(token);
    },
    enabled: isSignedIn === true,
    ...liveQueryOptions(options),
  });
}

export function useUpdateNotificationPreferences() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      body: Parameters<typeof updateNotificationPreferences>[1],
    ) => {
      const token = await getToken();
      return updateNotificationPreferences(token, body);
    },
    onSuccess: (preferences) => {
      qc.setQueryData(queryKeys.notifications.preferences, preferences);
    },
  });
}
