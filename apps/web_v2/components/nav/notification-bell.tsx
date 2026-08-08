"use client";

import * as React from "react";
import Link from "next/link";
import { Bell as BellIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { accountNotificationsPath } from "@/lib/routes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useMarkNotificationRead,
  useNotificationsList,
  useUnreadNotificationCount,
} from "@/hooks/api";
import { cn } from "@/lib/utils";
import {
  formatNotificationTime,
  notificationIcon,
  unreadNotificationLabel,
} from "@/components/notifications/notification-utils";
import { DataState, useDataState } from "@/components/shared/data-state";

// ── Notification bell ──────────────────────────────────────────────────────────

export function NotificationBell() {
  const notificationsQuery = useNotificationsList({ pageSize: 5 });
  const unreadQuery = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const unread = unreadQuery.data?.count ?? 0;
  const recent = notificationsQuery.data?.items ?? [];
  const listState = useDataState(notificationsQuery, {
    count: recent.length,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={unreadNotificationLabel(unread)}
        >
          <BellIcon className="size-4" />
          {unread > 0 && (
            <span
              className="absolute top-1 right-1 size-1.5 rounded-full bg-brand ring-2 ring-background"
              aria-hidden
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-xs font-semibold">Notifications</span>
          {unread > 0 && (
            <span className="rounded-full bg-brand/12 px-1.5 py-0.5 text-[9px] font-semibold text-brand tabular-nums">
              {unread} new
            </span>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <DataState
          state={listState}
          resource="notifications"
          skeleton={
            <div className="px-3 py-6 text-center" aria-hidden>
              <p className="text-xs text-muted-foreground">
                Loading notifications…
              </p>
            </div>
          }
          errorSurface={
            <div className="px-3 py-6 text-center">
              <p className="text-xs text-muted-foreground">
                Couldn&apos;t load notifications.
              </p>
              <button
                type="button"
                onClick={listState.retry}
                className="mt-1.5 text-xs font-medium text-foreground hover:underline"
              >
                Try again
              </button>
            </div>
          }
          empty={
            <div className="px-3 py-6 text-center">
              <p className="text-xs text-muted-foreground">
                No notifications yet.
              </p>
            </div>
          }
        >
          <ul className="max-h-[360px] divide-y divide-border/60 overflow-y-auto">
            {recent.map((n) => {
              const cfg = notificationIcon[n.type];
              const rowClass =
                "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50";
              const body = (
                <>
                  <span
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                      cfg.tone,
                    )}
                  >
                    <cfg.Icon className="size-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-medium">{n.title}</p>
                      {!n.isRead && (
                        <span
                          className="size-1.5 shrink-0 rounded-full bg-brand"
                          aria-hidden
                        />
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                      {n.message}
                    </p>
                    <p className="mt-1 text-[10px] tabular-nums text-muted-foreground/70">
                      {formatNotificationTime(n.createdAt)}
                    </p>
                  </div>
                </>
              );
              const markReadOnClick = () => {
                if (!n.isRead) markRead.mutate(n.id);
              };
              return (
                <li key={n.id}>
                  {n.link ? (
                    <Link
                      href={n.link}
                      onClick={markReadOnClick}
                      className={rowClass}
                    >
                      {body}
                    </Link>
                  ) : (
                    // No destination — clicking still marks it read instead of
                    // navigating to "#" and jumping the page to the top.
                    <button
                      type="button"
                      onClick={markReadOnClick}
                      className={rowClass}
                    >
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </DataState>
        <DropdownMenuSeparator className="m-0" />
        <div className="p-1.5">
          <DropdownMenuItem asChild className="justify-center text-xs">
            <Link href={accountNotificationsPath()}>
              View all notifications
            </Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
