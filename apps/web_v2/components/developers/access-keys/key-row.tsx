"use client";

/**
 * KeyRow — one credential, in the one row anatomy.
 *
 *   [icon]  Name                        12 requests · 3d ago      [Active]
 *           sk_live_••••4f2a · Secret   [View key] [Rotate key] [Revoke key]
 *
 * What changed from the two rows this replaces:
 *   • one badge, not two. Type / preset was a second pill on the same axis as
 *     status; it is now the descriptor line, where it reads as what it is.
 *   • the icon tile lost its border. A bordered chip inside a bordered card
 *     inside a list was three surfaces deep for one glyph.
 *   • "0 · —" for a key nobody has ever called now reads "Never used".
 */

import * as React from "react";
import { type Icon as PhosphorIcon } from "@phosphor-icons/react";
import { fmtCount } from "@/lib/format";
import { CopyButton } from "@/components/ui/copy-button";
import { ItemRow, ItemActionRow, StatusBadge } from "@/components/shared";
import {
  KeyConfirmDialogs,
  keyRowActions,
  type KeyConfirmKind,
} from "./key-actions";
import {
  lastUsedDisplay,
  maskedKey,
  quotaSuffix,
  type DescribedKey,
} from "./key-model";

export interface KeyRowProps {
  row: DescribedKey;
  icon: PhosphorIcon;
  /** Reads inside "View API key" and the row's accessible name. */
  kindLabel: string;
  /** Second fact under the name — key type, or the agent preset it was cut from. */
  descriptor?: string | null;
  detailHref: string;
  /** Omit on surfaces where rotation isn't part of the contract. */
  onRotate?: () => void;
  onRevoke: () => void;
  /** A mutation is in flight for this surface; every action waits. */
  busy?: boolean;
}

export function KeyRow({
  row,
  icon: Icon,
  kindLabel,
  descriptor,
  detailHref,
  onRotate,
  onRevoke,
  busy = false,
}: KeyRowProps) {
  const [pending, setPending] = React.useState<KeyConfirmKind | null>(null);
  const { entry, state } = row;
  const lastUsed = lastUsedDisplay(entry);

  const actions = keyRowActions({
    state,
    detailHref,
    kindLabel,
    busy,
    onRotate: onRotate ? () => setPending("rotate") : undefined,
    onRevoke: () => setPending("revoke"),
  });

  return (
    <>
      <ItemRow
        inactive={!state.actionable}
        padding="dense"
        aria-label={`${entry.name} — ${kindLabel}`}
        leading={
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/12 text-brand"
            aria-hidden
          >
            <Icon className="size-4" weight="bold" />
          </span>
        }
        title={
          <span className="block truncate text-sm font-medium text-foreground">
            {entry.name}
          </span>
        }
        subtitle={
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="truncate font-mono">{maskedKey(entry)}</span>
            <CopyButton value={entry.keyPrefix} label="key prefix" />
            {descriptor && (
              <>
                <span aria-hidden className="text-border">
                  ·
                </span>
                <span className="truncate">{descriptor}</span>
              </>
            )}
          </span>
        }
        metrics={
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="tabular-nums">
              <span className="font-medium text-foreground">
                {fmtCount(entry.usageCount)}
              </span>
              {quotaSuffix(entry)} requests
            </span>
            <span aria-hidden className="text-border">
              ·
            </span>
            <span className="tabular-nums" title={lastUsed.title}>
              {lastUsed.text}
            </span>
          </span>
        }
        trailing={<StatusBadge {...state.status} />}
        actions={
          <ItemActionRow
            actions={actions}
            collapseUnder={480}
            visibleWhenCollapsed={2}
          />
        }
      />

      <KeyConfirmDialogs
        keyName={entry.name}
        pending={pending}
        onCancel={() => setPending(null)}
        onRotate={
          onRotate
            ? () => {
                setPending(null);
                onRotate();
              }
            : undefined
        }
        onRevoke={() => {
          setPending(null);
          onRevoke();
        }}
      />
    </>
  );
}
