"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { fmtNum, fmtRelative } from "@/lib/format";
import type { V2ApiKeyDTO } from "@workspace/types";
import {
  ArrowSquareOutIcon,
  ArrowsClockwiseIcon,
  ProhibitIcon,
  KeyIcon,
} from "@phosphor-icons/react";
import { CopyButton } from "@/components/ui/copy-button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  ItemRow,
  ItemCard,
  ItemActionRow,
  type ItemAction,
} from "@/components/shared";

/* ─── Shared helpers ─────────────────────────────────────────────────────── */

const MODULE_NOW = Date.now();

function KeyTypeBadge({ type }: { type: V2ApiKeyDTO["keyType"] }) {
  const isPublishable = type === "PUBLISHABLE";
  return (
    <span
      className={cn(
        "shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em]",
        isPublishable
          ? "border-brand/30 bg-brand-muted text-brand-foreground"
          : "border-foreground/10 bg-foreground/5 text-foreground",
      )}
    >
      {isPublishable ? "PK" : "SK"}
    </span>
  );
}

function StatusChip({
  isActive,
  isExpired,
}: {
  isActive: boolean;
  isExpired: boolean;
}) {
  if (!isActive)
    return (
      <span className="rounded-md border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-destructive">
        revoked
      </span>
    );
  if (isExpired)
    return (
      <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-amber-700 dark:text-amber-400">
        expired
      </span>
    );
  return null;
}

function MaskedKey({
  prefix,
  lastFour,
}: {
  prefix: string;
  lastFour: string | null;
}) {
  const masked = `${prefix}••••${lastFour ?? "****"}`;
  return (
    <span className="flex items-center gap-1">
      <span className="font-mono text-[11px] text-muted-foreground">
        {masked}
      </span>
      <CopyButton value={prefix} label="Copy prefix" />
    </span>
  );
}

/* ─── Row skeleton ────────────────────────────────────────────────────────── */

export function ApiKeyListItemSkeleton() {
  return (
    <ItemRow
      padding="default"
      leading={<Skeleton className="size-6 rounded animate-shimmer" />}
      title={<Skeleton className="h-3.5 w-32 animate-shimmer" />}
      subtitle={<Skeleton className="h-3 w-48 animate-shimmer" />}
      metrics={
        <div className="flex gap-2">
          <Skeleton className="h-3 w-16 animate-shimmer" />
          <Skeleton className="h-3 w-20 animate-shimmer" />
        </div>
      }
      trailing={<Skeleton className="h-5 w-14 rounded-full animate-shimmer" />}
    />
  );
}

/* ─── Card skeleton ───────────────────────────────────────────────────────── */

export function ApiKeyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton className="h-[48px] w-full animate-shimmer" />
      <div className="space-y-2 px-4 pb-3 pt-3">
        <Skeleton className="h-3.5 w-28 animate-shimmer" />
        <Skeleton className="h-3 w-40 animate-shimmer" />
        <Skeleton className="mt-2 h-7 w-full animate-shimmer" />
      </div>
    </div>
  );
}

/* ─── Shared action builder ───────────────────────────────────────────────── */

interface ApiKeyActions {
  slug: string;
  keyId: string;
  /** Rotate/Revoke only apply to a live key — a revoked key is terminal. */
  isActive: boolean;
  onRevoke: () => void;
  onRotate: () => void;
}

function useKeyActions({
  slug,
  keyId,
  isActive,
  onRevoke,
  onRotate,
}: ApiKeyActions): ItemAction[] {
  const router = useRouter();
  const actions: ItemAction[] = [
    {
      id: "view",
      label: "View details",
      icon: ArrowSquareOutIcon,
      pinned: true,
      onSelect: () => router.push(`/projects/${slug}/developers/keys/${keyId}`),
    },
  ];
  if (isActive) {
    actions.push(
      {
        id: "rotate",
        label: "Rotate",
        icon: ArrowsClockwiseIcon,
        tone: "warning",
        onSelect: onRotate,
      },
      {
        id: "revoke",
        label: "Revoke",
        icon: ProhibitIcon,
        tone: "danger",
        pinned: true,
        onSelect: onRevoke,
      },
    );
  }
  return actions;
}

/* ─── Row variant ─────────────────────────────────────────────────────────── */

export const ApiKeyRow = React.memo(function ApiKeyRow({
  entry,
  slug,
  onRevoke,
  onRotate,
}: {
  entry: V2ApiKeyDTO;
  slug: string;
  onRevoke: () => void;
  onRotate: () => void;
}) {
  const [revokeOpen, setRevokeOpen] = React.useState(false);
  const [rotateOpen, setRotateOpen] = React.useState(false);
  const inactive = !entry.isActive;
  const isExpired =
    entry.expiresAt != null && new Date(entry.expiresAt).getTime() < MODULE_NOW;

  const actions = useKeyActions({
    slug,
    keyId: entry.id,
    isActive: entry.isActive,
    onRevoke: () => setRevokeOpen(true),
    onRotate: () => setRotateOpen(true),
  });

  const expiryLabel = isExpired ? "Expired" : null;

  return (
    <>
      <ItemRow
        inactive={inactive}
        padding="default"
        leading={
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/30",
              inactive && "opacity-40",
            )}
          >
            <KeyIcon className="size-3.5 text-muted-foreground" weight="bold" />
          </div>
        }
        title={
          <div className="min-w-0">
            <span
              className={cn(
                "truncate text-sm font-medium",
                inactive && "text-muted-foreground",
              )}
            >
              {entry.name}
            </span>
          </div>
        }
        subtitle={
          <MaskedKey prefix={entry.keyPrefix} lastFour={entry.lastFour} />
        }
        metrics={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tabular-nums text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">
                {fmtNum(entry.usageCount)}
              </span>
              {entry.usageLimit ? ` / ${fmtNum(entry.usageLimit)}` : ""} calls
            </span>
            <span className="text-border">·</span>
            <span>{entry.rateLimit}/min</span>
            {entry.lastUsedAt && (
              <>
                <span className="text-border">·</span>
                <span>{fmtRelative(new Date(entry.lastUsedAt))}</span>
              </>
            )}
          </div>
        }
        trailing={
          <div className="flex items-baseline gap-2">
            <KeyTypeBadge type={entry.keyType} />
            {(!entry.isActive || expiryLabel) && (
              <StatusChip isActive={entry.isActive} isExpired={isExpired} />
            )}
          </div>
        }
        actions={
          <ItemActionRow
            actions={actions}
            collapseUnder={480}
            visibleWhenCollapsed={2}
          />
        }
      />

      <ConfirmationDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        intent="danger"
        title={<>Revoke &ldquo;{entry.name}&rdquo;?</>}
        description="This key stops working immediately. You can't undo it."
        cancelLabel="Keep key"
        confirmLabel="Revoke key"
        onConfirm={onRevoke}
      />
      <ConfirmationDialog
        open={rotateOpen}
        onOpenChange={setRotateOpen}
        intent="warning"
        title={<>Rotate &ldquo;{entry.name}&rdquo;?</>}
        description="Rotating replaces the secret immediately. The old secret stops working right away — update your servers before continuing."
        cancelLabel="Cancel"
        confirmLabel="Rotate key"
        onConfirm={onRotate}
      />
    </>
  );
});

/* ─── Card variant ────────────────────────────────────────────────────────── */

export const ApiKeyCard = React.memo(function ApiKeyCard({
  entry,
  slug,
  onRevoke,
  onRotate,
}: {
  entry: V2ApiKeyDTO;
  slug: string;
  onRevoke: () => void;
  onRotate: () => void;
}) {
  const [revokeOpen, setRevokeOpen] = React.useState(false);
  const [rotateOpen, setRotateOpen] = React.useState(false);
  const inactive = !entry.isActive;
  const isExpired =
    entry.expiresAt != null && new Date(entry.expiresAt).getTime() < MODULE_NOW;

  const actions = useKeyActions({
    slug,
    keyId: entry.id,
    isActive: entry.isActive,
    onRevoke: () => setRevokeOpen(true),
    onRotate: () => setRotateOpen(true),
  });

  return (
    <>
      <ItemCard
        inactive={inactive}
        preview={
          <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-4 py-3">
            <KeyTypeBadge type={entry.keyType} />
            <MaskedKey prefix={entry.keyPrefix} lastFour={entry.lastFour} />
            {(!entry.isActive || isExpired) && (
              <div className="ml-auto">
                <StatusChip isActive={entry.isActive} isExpired={isExpired} />
              </div>
            )}
          </div>
        }
        footer={
          <div className="px-4 pb-3">
            <ItemActionRow
              actions={actions}
              collapseUnder={280}
              visibleWhenCollapsed={2}
              className="border-t border-border/60 pt-2"
            />
          </div>
        }
      >
        <div className="flex flex-col gap-1 px-4 py-3">
          <span
            className={cn(
              "truncate text-sm font-medium",
              inactive && "text-muted-foreground",
            )}
          >
            {entry.name}
          </span>

          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10.5px] tabular-nums text-muted-foreground/80">
            <span>
              <span className="font-semibold text-foreground">
                {fmtNum(entry.usageCount)}
              </span>
              {entry.usageLimit ? ` / ${fmtNum(entry.usageLimit)}` : ""} calls
            </span>
            <span className="text-border">·</span>
            <span>{entry.rateLimit}/min</span>
            {entry.lastUsedAt && (
              <>
                <span className="text-border">·</span>
                <span>{fmtRelative(new Date(entry.lastUsedAt))}</span>
              </>
            )}
          </div>
        </div>
      </ItemCard>

      <ConfirmationDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        intent="danger"
        title={<>Revoke &ldquo;{entry.name}&rdquo;?</>}
        description="This key stops working immediately. You can't undo it."
        cancelLabel="Keep key"
        confirmLabel="Revoke key"
        onConfirm={onRevoke}
      />
      <ConfirmationDialog
        open={rotateOpen}
        onOpenChange={setRotateOpen}
        intent="warning"
        title={<>Rotate &ldquo;{entry.name}&rdquo;?</>}
        description="Rotating replaces the secret immediately. The old secret stops working right away — update your servers before continuing."
        cancelLabel="Cancel"
        confirmLabel="Rotate key"
        onConfirm={onRotate}
      />
    </>
  );
});
