"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { fmtRelative } from "@/lib/format";
import type { V2ActorType, V2ProjectActionAuditDTO } from "@workspace/types";
import {
  UserIcon,
  KeyIcon,
  RobotIcon,
  GearSixIcon,
  GavelIcon,
  NotePencilIcon,
  ChatCircleIcon,
  ShieldCheckIcon,
  ArrowsClockwiseIcon,
  PaperPlaneTiltIcon,
  UserPlusIcon,
  UserMinusIcon,
  UsersThreeIcon,
  GlobeSimpleIcon,
  WebhooksLogoIcon,
  PlugsConnectedIcon,
  DownloadSimpleIcon,
  ProhibitIcon,
  FlagIcon,
  PulseIcon,
  ArrowsLeftRightIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { ItemRow } from "@/components/shared";

/* ─── Actor presentation ──────────────────────────────────────────────────── */

const ACTOR_CONFIG: Record<
  V2ActorType,
  { label: string; icon: PhosphorIcon; className: string }
> = {
  user: {
    label: "User",
    icon: UserIcon,
    className: "border-brand/40 bg-brand-muted text-brand-foreground",
  },
  api_key: {
    label: "API key",
    icon: KeyIcon,
    className: "border-border bg-muted text-foreground/80",
  },
  agent_key: {
    label: "Agent",
    icon: RobotIcon,
    className: "border-border bg-muted text-foreground/80",
  },
  system: {
    label: "System",
    icon: GearSixIcon,
    className: "border-border bg-muted text-foreground/80",
  },
};

function ActorChip({ actorType }: { actorType: V2ActorType }) {
  const cfg = ACTOR_CONFIG[actorType] ?? ACTOR_CONFIG.system;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em]",
        cfg.className,
      )}
    >
      <Icon className="size-3" weight="fill" aria-hidden />
      {cfg.label}
    </span>
  );
}

/* ─── Action → icon ───────────────────────────────────────────────────────── */

/** Exact-action glyphs, so each distinct event reads at a glance. */
const ACTION_ICONS: Record<string, PhosphorIcon> = {
  "submission.moderated": GavelIcon,
  "submission.annotated": NotePencilIcon,
  "signing_secret.rotated": ArrowsClockwiseIcon,
  "signing_secret.cleared": ShieldCheckIcon,
  "member.invite_sent": PaperPlaneTiltIcon,
  "member.invite_accepted": UserPlusIcon,
  "member.invite_revoked": UserMinusIcon,
  "project.ownership_transfer_requested": ArrowsLeftRightIcon,
  "project.ownership_transfer_accepted": ShieldCheckIcon,
  "project.ownership_transfer_declined": UserMinusIcon,
  "project.ownership_transfer_cancelled": ProhibitIcon,
  "allowed_origins.replaced": GlobeSimpleIcon,
  "outbound_webhook.secret_rotated": ArrowsClockwiseIcon,
  "api_key.created": KeyIcon,
  "api_key.rotated": ArrowsClockwiseIcon,
  "api_key.revoked": ProhibitIcon,
  "export.csv_requested": DownloadSimpleIcon,
  "integration_export.queued": DownloadSimpleIcon,
  flag: FlagIcon,
};

/** Category fallbacks keyed by the prefix before the first dot. */
const ACTION_PREFIX_ICONS: Record<string, PhosphorIcon> = {
  submission: ChatCircleIcon,
  signing_secret: ShieldCheckIcon,
  member: UsersThreeIcon,
  project: ArrowsLeftRightIcon,
  allowed_origins: GlobeSimpleIcon,
  outbound_webhook: WebhooksLogoIcon,
  integration_connection: PlugsConnectedIcon,
  integration_export: DownloadSimpleIcon,
  api_key: KeyIcon,
  export: DownloadSimpleIcon,
};

function actionIcon(action: string): PhosphorIcon {
  return (
    ACTION_ICONS[action] ??
    ACTION_PREFIX_ICONS[action.split(".")[0] ?? ""] ??
    PulseIcon
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

export function humanizeAuditAction(action: string): string {
  return action
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanizeTargetType(targetType: string): string {
  return targetType
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Human-readable actor. Users resolve to a member name/email via `actorName`;
 * everything else falls back to the actor-type label — never a raw id.
 */
function actorDisplay(
  event: V2ProjectActionAuditDTO,
  actorName: string | null | undefined,
): string {
  if (event.actorType === "user") {
    return actorName ?? "Unknown user";
  }
  return ACTOR_CONFIG[event.actorType]?.label ?? "System";
}

/* ─── Row skeleton ────────────────────────────────────────────────────────── */

export function AuditEventRowSkeleton() {
  return (
    <ItemRow
      padding="default"
      leading={<Skeleton className="size-8 rounded-lg animate-shimmer" />}
      title={<Skeleton className="h-3.5 w-40 animate-shimmer" />}
      subtitle={<Skeleton className="h-3 w-28 animate-shimmer" />}
      trailing={<Skeleton className="h-5 w-14 rounded-md animate-shimmer" />}
    />
  );
}

/* ─── Row ─────────────────────────────────────────────────────────────────── */

export const AuditEventRow = React.memo(function AuditEventRow({
  event,
  actorName,
}: {
  event: V2ProjectActionAuditDTO;
  /** Resolved member display name/email for user actors. */
  actorName?: string | null;
}) {
  const createdLabel = fmtRelative(new Date(event.createdAt));
  const actor = actorDisplay(event, actorName);
  const target =
    event.targetType != null ? humanizeTargetType(event.targetType) : null;

  return (
    <ItemRow
      padding="default"
      leading={
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/30">
          {React.createElement(actionIcon(event.action), {
            className: "size-4 text-muted-foreground",
            weight: "regular",
            "aria-hidden": true,
          })}
        </div>
      }
      title={
        <span className="truncate text-[13px] font-medium text-foreground">
          {humanizeAuditAction(event.action)}
        </span>
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="truncate font-medium text-foreground/80">
            {actor}
          </span>
          {target && (
            <>
              <span aria-hidden>·</span>
              <span>{target}</span>
            </>
          )}
          <span aria-hidden>·</span>
          <span>{createdLabel}</span>
        </span>
      }
      trailing={<ActorChip actorType={event.actorType} />}
    />
  );
});
