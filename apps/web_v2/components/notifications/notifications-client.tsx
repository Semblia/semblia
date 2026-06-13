"use client";

import * as React from "react";
import Link from "next/link";
import { Bell as BellIcon } from "@phosphor-icons/react";
import type { V2NotificationDTO } from "@workspace/types";
import { toast } from "sonner";
import { PageBody, RefreshingDataBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationPreferences,
  useNotificationsList,
  useUnreadNotificationCount,
  useUpdateNotificationPreferences,
} from "@/hooks/api";
import { cn } from "@/lib/utils";
import { formatNotificationTime, notificationIcon } from "./notification-utils";

const PAGE_SIZE = 20;

export function NotificationsClient() {
  const [pageSize, setPageSize] = React.useState(PAGE_SIZE);
  const notificationsQuery = useNotificationsList({ pageSize });
  const unreadQuery = useUnreadNotificationCount();
  const preferencesQuery = useNotificationPreferences();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const updatePreferences = useUpdateNotificationPreferences();

  const notifications = notificationsQuery.data?.items ?? [];
  const hasMore = notificationsQuery.data?.hasNext ?? false;
  const isLoadingMore =
    notificationsQuery.isFetching &&
    pageSize > PAGE_SIZE &&
    !notificationsQuery.isLoading;
  const unread = unreadQuery.data?.count ?? 0;
  const isInitialLoading = notificationsQuery.isLoading;
  const isRefreshing =
    notificationsQuery.isFetching && !notificationsQuery.isLoading;
  const emailEnabled = preferencesQuery.data?.emailEnabled;

  const toggleEmail = (checked: boolean) =>
    updatePreferences.mutate(
      { emailEnabled: checked },
      {
        onSuccess: () =>
          toast.success(
            checked
              ? "Email notifications turned on."
              : "Email notifications turned off.",
          ),
        onError: () => toast.error("Failed to update email preference."),
      },
    );

  return (
    <PageBody contained padding="default" contentClassName="space-y-4">
      <div
        className="settings-section-enter flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3"
        style={{ animationDelay: "0ms" }}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium">Inbox</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {unread > 0
              ? `${unread} unread notification${unread === 1 ? "" : "s"}`
              : "All caught up"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {isRefreshing && <RefreshingDataBadge label="Refreshing data" />}
          {emailEnabled !== undefined && (
            <div className="flex items-center gap-2">
              <Label
                htmlFor="email-notifications"
                className="text-xs font-normal text-muted-foreground"
              >
                Email alerts
              </Label>
              <Switch
                id="email-notifications"
                checked={emailEnabled}
                disabled={updatePreferences.isPending}
                onCheckedChange={toggleEmail}
              />
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={unread === 0 || markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            Mark all read
          </Button>
        </div>
      </div>

      {isInitialLoading ? (
        <NotificationListSkeleton />
      ) : notifications.length === 0 ? (
        <Empty
          className="settings-section-enter min-h-[320px] border-dashed"
          style={{ animationDelay: "60ms" }}
        >
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BellIcon />
            </EmptyMedia>
            <EmptyTitle>No notifications yet</EmptyTitle>
            <EmptyDescription>
              New feedback, export issues, security events, and agent actions
              will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div
          className="settings-section-enter space-y-3"
          style={{ animationDelay: "60ms" }}
        >
          <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
            {notifications.map((notification) => (
              <NotificationListItem
                key={notification.id}
                notification={notification}
                onMarkRead={() => markRead.mutate(notification.id)}
              />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled={isLoadingMore}
                onClick={() => setPageSize((size) => size + PAGE_SIZE)}
              >
                {isLoadingMore ? "Loading…" : "Show more"}
              </Button>
            </div>
          )}
        </div>
      )}
    </PageBody>
  );
}

function NotificationListItem({
  notification,
  onMarkRead,
}: {
  notification: V2NotificationDTO;
  onMarkRead: () => void;
}) {
  const cfg = notificationIcon[notification.type];

  return (
    <div className="flex gap-3 px-4 py-3">
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
          cfg.tone,
        )}
      >
        <cfg.Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-medium">{notification.title}</p>
          {!notification.isRead && (
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
          )}
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {formatNotificationTime(notification.createdAt)}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {notification.message}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {notification.link && (
            <Button asChild variant="ghost" size="sm">
              <Link href={notification.link}>Open</Link>
            </Button>
          )}
          {!notification.isRead && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onMarkRead}
            >
              Mark read
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationListSkeleton() {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex gap-3 px-4 py-3">
          <div className="size-8 rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-40 rounded bg-muted" />
            <div className="h-3 w-full max-w-md rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
