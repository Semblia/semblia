"use client";

/**
 * AuditEventRow — one recorded mutation in the project activity log.
 *
 * Three things this row is responsible for, all of which are the difference
 * between an audit log and a wall of identifiers:
 *
 *   • the action is humanized (`export.csv_requested` → "Export CSV
 *     Requested"), never the raw dotted enum
 *   • the actor is a *name*, resolved from project members for user actors and
 *     from the actor-type vocabulary for everything else — never a Clerk id
 *   • the time is `timeAgo` with the precise timestamp in `title`, because an
 *     audit entry whose exact moment is unrecoverable is not evidence
 *
 * The actor was previously a bespoke mono-uppercase chip carrying an icon that
 * repeated its own label. It is now one `StatusBadge` per row: colour carries
 * the signal, and nothing duplicates it.
 */

import * as React from "react";
import type { V2ActorType, V2ProjectActionAuditDTO } from "@workspace/types";
import {
  KeyIcon,
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
import { ItemRow, StatusBadge, type StatusMeta } from "@/components/shared";
import { ABSENT, humanizeLabel, timeAgo, fmtDateTime } from "@/lib/format";

/* ─── Actor vocabulary ────────────────────────────────────────────────────── */
//
// Tones are deliberately quiet: an audit log is a record, not an alert stream,
// so no actor type is "critical". `agent_key` reads as attention because an
// autonomous actor mutating a project is the one a human most often audits.

const ACTOR_META: Record<V2ActorType, StatusMeta> = {
  user: { label: "User", tone: "neutral" },
  api_key: { label: "API key", tone: "neutral" },
  agent_key: { label: "Agent", tone: "attention" },
  system: { label: "System", tone: "muted" },
};

/** An actor type the API grows before this app knows it still reads sanely. */
export function actorMeta(actorType: string): StatusMeta {
  return (
    ACTOR_META[actorType as V2ActorType] ?? {
      label: humanizeLabel(actorType),
      tone: "neutral",
    }
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
  "outbound_webhook.delivery_retried": ArrowsClockwiseIcon,
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
  return humanizeLabel(action);
}

/**
 * The actor as a human reads it — never the raw Clerk id, which is both a leak
 * and a dead end. A user actor resolves through the project's member list, and
 * the two ways that can miss are different facts:
 *
 *   `null`      the member list loaded and this actor is no longer in it
 *   `undefined` the member list itself is unavailable, so asserting they left
 *               would be a guess — and repeating "User" here would only
 *               duplicate the badge. An unknown value is an em dash.
 */
function actorDisplay(
  event: V2ProjectActionAuditDTO,
  actorName: string | null | undefined,
): string {
  if (event.actorType !== "user") return actorMeta(event.actorType).label;
  if (actorName) return actorName;
  return actorName === null ? "Former member" : ABSENT;
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
  const action = humanizeAuditAction(event.action);
  const actor = actorDisplay(event, actorName);
  const target = event.targetType ? humanizeLabel(event.targetType) : null;

  return (
    <ItemRow
      role="listitem"
      padding="default"
      aria-label={`${action} by ${actor}`}
      leading={
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/30">
          {/* `createElement` rather than binding the glyph to a capitalized
              local: the icon is chosen per row from a lookup, and a component
              *identity* derived during render is what resets state. */}
          {React.createElement(actionIcon(event.action), {
            className: "size-4 text-muted-foreground",
            weight: "regular",
            "aria-hidden": true,
          })}
        </span>
      }
      title={
        <span className="truncate text-[13px] font-medium text-foreground">
          {action}
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
          <span className="tabular-nums" title={fmtDateTime(event.createdAt)}>
            {timeAgo(event.createdAt)}
          </span>
        </span>
      }
      trailing={<StatusBadge {...actorMeta(event.actorType)} />}
    />
  );
});
