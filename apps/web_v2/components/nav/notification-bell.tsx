"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell as BellIcon,
  ChatText as MessageSquareTextIcon,
  ShieldWarning as ShieldAlertIcon,
  CheckCircle as CircleCheckIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  MOCK_NOTIFICATIONS,
  getUnreadNotificationCount,
  timeAgo,
  type NotificationType,
} from "@/lib/mock-data";

// ── Notification icon mapping ─────────────────────────────────────────────────

const notifIcon: Record<
  NotificationType,
  { Icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  NEW_TESTIMONIAL: {
    Icon: MessageSquareTextIcon,
    tone: "text-brand bg-brand/12",
  },
  TESTIMONIAL_FLAGGED: {
    Icon: ShieldAlertIcon,
    tone: "text-warning bg-warning/15",
  },
  TESTIMONIAL_APPROVED: {
    Icon: CircleCheckIcon,
    tone: "text-success bg-success/12",
  },
  TESTIMONIAL_REJECTED: {
    Icon: ShieldAlertIcon,
    tone: "text-destructive bg-destructive/10",
  },
  SECURITY_ALERT: {
    Icon: ShieldAlertIcon,
    tone: "text-destructive bg-destructive/10",
  },
};

// ── Notification bell ──────────────────────────────────────────────────────────

export function NotificationBell() {
  const unread = getUnreadNotificationCount();
  const recent = [...MOCK_NOTIFICATIONS]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={
            unread > 0 ? `${unread} unread notifications` : "Notifications"
          }
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
        {recent.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-muted-foreground">
              No notifications yet.
            </p>
          </div>
        ) : (
          <ul className="max-h-[360px] divide-y divide-border/60 overflow-y-auto">
            {recent.map((n) => {
              const cfg = notifIcon[n.type];
              return (
                <li key={n.id}>
                  <Link
                    href={n.link ?? "#"}
                    className="flex items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
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
                        <p className="truncate text-xs font-medium">
                          {n.title}
                        </p>
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
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <DropdownMenuSeparator className="m-0" />
        <div className="p-1.5">
          <DropdownMenuItem asChild className="justify-center text-xs">
            <Link href="/notifications">View all notifications</Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
