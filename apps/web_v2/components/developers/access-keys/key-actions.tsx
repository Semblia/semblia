"use client";

/**
 * Rotate and revoke, offered identically wherever a key appears.
 *
 * Both destructive actions used to be written three times over (API key row,
 * API key card, agent key row) plus twice more on the two detail pages, and the
 * copies had drifted: some hid the control on a dead key, some rendered it bare
 * `disabled` with no explanation, and the rotation warning existed in two
 * different wordings. One builder and one pair of dialogs now serve every call
 * site, so "never offer an action the contract will refuse" is decided once.
 */

import * as React from "react";
import {
  ArrowSquareOutIcon,
  ArrowsClockwiseIcon,
  ProhibitIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { ItemAction } from "@/components/shared";
import type { KeyState } from "./key-model";

export type KeyConfirmKind = "rotate" | "revoke";

const REVOKE_COPY =
  "This key stops authenticating immediately, and anything using it starts failing. You can't undo it.";
const ROTATE_COPY =
  "Rotating issues a new secret and retires the current one immediately. Update every server using this key before you continue.";

/**
 * The confirmation gate for both destructive actions.
 *
 * Deliberately a real modal: a non-modal surface can be dismissed by a stray
 * click, and neither of these is recoverable.
 */
export function KeyConfirmDialogs({
  keyName,
  pending,
  onCancel,
  onRotate,
  onRevoke,
}: {
  keyName: string;
  pending: KeyConfirmKind | null;
  onCancel: () => void;
  onRotate?: () => void;
  onRevoke: () => void;
}) {
  const setOpen = (open: boolean) => {
    if (!open) onCancel();
  };

  return (
    <>
      {onRotate && (
        <ConfirmationDialog
          open={pending === "rotate"}
          onOpenChange={setOpen}
          intent="warning"
          title={<>Rotate &ldquo;{keyName}&rdquo;?</>}
          description={ROTATE_COPY}
          cancelLabel="Keep current secret"
          confirmLabel="Rotate key"
          onConfirm={onRotate}
        />
      )}
      <ConfirmationDialog
        open={pending === "revoke"}
        onOpenChange={setOpen}
        intent="danger"
        title={<>Revoke &ldquo;{keyName}&rdquo;?</>}
        description={REVOKE_COPY}
        cancelLabel="Keep key"
        confirmLabel="Revoke key"
        onConfirm={onRevoke}
      />
    </>
  );
}

/**
 * Row actions. `Verb + Noun` labels, because a bare "Revoke" loses its object
 * the moment the row scrolls past the name it belongs to.
 */
export function keyRowActions({
  state,
  detailHref,
  kindLabel,
  busy,
  onRotate,
  onRevoke,
}: {
  state: KeyState;
  detailHref: string;
  /** Reads inside "View API key" / "View agent key". */
  kindLabel: string;
  busy: boolean;
  onRotate?: () => void;
  onRevoke: () => void;
}): ItemAction[] {
  const blocked = busy || !state.actionable;
  // Every disabled state carries its reason: a permanent one from the record,
  // and a transient one while a change on this surface is still in flight.
  const reason = !state.actionable
    ? (state.blockedReason ?? undefined)
    : busy
      ? "A change to these keys is still in progress."
      : undefined;

  const actions: ItemAction[] = [
    {
      id: "open",
      label: `View ${kindLabel}`,
      icon: ArrowSquareOutIcon,
      pinned: true,
      href: detailHref,
    },
  ];

  if (onRotate) {
    actions.push({
      id: "rotate",
      label: "Rotate key",
      icon: ArrowsClockwiseIcon,
      tone: "warning",
      disabled: blocked,
      disabledReason: reason,
      onSelect: onRotate,
    });
  }

  actions.push({
    id: "revoke",
    label: "Revoke key",
    icon: ProhibitIcon,
    tone: "danger",
    pinned: true,
    disabled: blocked,
    disabledReason: reason,
    onSelect: onRevoke,
  });

  return actions;
}

/**
 * The detail page's action cluster.
 *
 * A dead key keeps its controls rather than losing them silently, and the
 * reason sits beside them as readable text — a `title` on a disabled button is
 * unreachable, because a disabled button takes neither pointer nor focus.
 */
export function KeyLifecycleActions({
  state,
  keyName,
  busy = false,
  onRotate,
  onRevoke,
}: {
  state: KeyState;
  keyName: string;
  busy?: boolean;
  onRotate?: () => void;
  onRevoke: () => void;
}) {
  const [pending, setPending] = React.useState<KeyConfirmKind | null>(null);
  const reasonId = React.useId();
  const blocked = busy || !state.actionable;
  const describedBy = state.blockedReason ? reasonId : undefined;

  return (
    <div
      aria-busy={busy || undefined}
      className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5"
    >
      {state.blockedReason && (
        <p
          id={reasonId}
          className="order-last w-full text-right text-xs text-muted-foreground sm:order-first sm:w-auto sm:max-w-xs"
        >
          {state.blockedReason}
        </p>
      )}

      {onRotate && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          disabled={blocked}
          aria-describedby={describedBy}
          onClick={() => setPending("rotate")}
        >
          <ArrowsClockwiseIcon className="size-3.5" weight="bold" aria-hidden />
          Rotate key
        </Button>
      )}

      <Button
        variant="destructive"
        size="sm"
        className="gap-1.5 text-xs"
        disabled={blocked}
        aria-describedby={describedBy}
        onClick={() => setPending("revoke")}
      >
        <ProhibitIcon className="size-3.5" weight="bold" aria-hidden />
        Revoke key
      </Button>

      <KeyConfirmDialogs
        keyName={keyName}
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
    </div>
  );
}
