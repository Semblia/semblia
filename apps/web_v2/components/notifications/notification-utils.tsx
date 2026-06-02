"use client";

import * as React from "react";
import {
  ChatText as MessageSquareTextIcon,
  ShieldWarning as ShieldAlertIcon,
  CheckCircle as CircleCheckIcon,
  Export as ExportIcon,
  Robot as RobotIcon,
  EnvelopeSimple as EnvelopeSimpleIcon,
} from "@phosphor-icons/react";
import type { V2NotificationType } from "@workspace/types";

export const notificationIcon: Record<
  V2NotificationType,
  { Icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  SUBMISSION_CREATED: {
    Icon: MessageSquareTextIcon,
    tone: "text-brand bg-brand/12",
  },
  SUBMISSION_MODERATED: {
    Icon: CircleCheckIcon,
    tone: "text-success bg-success/12",
  },
  SUBMISSION_FLAGGED: {
    Icon: ShieldAlertIcon,
    tone: "text-warning bg-warning/15",
  },
  SUBMISSION_APPROVED: {
    Icon: CircleCheckIcon,
    tone: "text-success bg-success/12",
  },
  SUBMISSION_REJECTED: {
    Icon: ShieldAlertIcon,
    tone: "text-destructive bg-destructive/10",
  },
  EXPORT_DELIVERY_FAILED: {
    Icon: ExportIcon,
    tone: "text-warning bg-warning/15",
  },
  EXPORT_DELIVERY_READY: {
    Icon: ExportIcon,
    tone: "text-success bg-success/12",
  },
  AGENT_ACTION_CREATED: {
    Icon: RobotIcon,
    tone: "text-brand bg-brand/12",
  },
  PROJECT_INVITE_RECEIVED: {
    Icon: EnvelopeSimpleIcon,
    tone: "text-brand bg-brand/12",
  },
  PROJECT_INVITE_ACCEPTED: {
    Icon: CircleCheckIcon,
    tone: "text-success bg-success/12",
  },
  OUTBOUND_WEBHOOK_DELIVERY_FAILED: {
    Icon: ShieldAlertIcon,
    tone: "text-warning bg-warning/15",
  },
  SECURITY_ALERT: {
    Icon: ShieldAlertIcon,
    tone: "text-destructive bg-destructive/10",
  },
};

export function formatNotificationTime(value: string) {
  const createdAt = new Date(value).getTime();
  if (!Number.isFinite(createdAt)) return "Recently";

  const seconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function unreadNotificationLabel(count: number) {
  if (count === 0) return "Notifications";
  return `${count} unread notification${count === 1 ? "" : "s"}`;
}
