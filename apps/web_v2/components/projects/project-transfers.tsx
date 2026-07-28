"use client";

/**
 * IncomingTransfers — ownership handovers waiting on this user.
 *
 * The old version read `incomingTransfers.data ?? []` and returned `null` on an
 * empty array, with no error branch anywhere. So a 500, a network blip, or an
 * expired token rendered as *no pending transfers at all*: the panel simply did
 * not exist. Paired with the expiry window, an ownership grant could lapse
 * because the user was never shown it. That is the flagship data-state defect
 * — `isError` falling through to empty — with an unusually expensive
 * consequence, so this region owns its state via `DataState`:
 *
 *   • genuinely none        → renders nothing (this is the normal case)
 *   • the request failed    → a compact, named error with a retry
 *   • the request succeeded → rows
 *
 * Two more repairs: the expiry clock ticks instead of freezing at first render,
 * and an expired transfer no longer offers "Accept ownership" — an action the
 * server can only refuse is disabled with the reason in place.
 */

import * as React from "react";
import { toast } from "sonner";
import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import type { V2ProjectOwnershipTransferDTO } from "@workspace/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DataList,
  DataState,
  DefinitionList,
  ItemRow,
  Section,
  StatusBadge,
  useDataState,
  type StatusMeta,
} from "@/components/shared";
import {
  useAcceptProjectTransfer,
  useDeclineProjectTransfer,
  useMyProjectTransfers,
} from "@/hooks/api";
import { fmtDateTime, userDisplayName } from "@/lib/format";

const MINUTE_MS = 60_000;

/** Stated wherever an expired transfer's controls are inactive. */
const EXPIRED_REASON = "This request expired. Ask the owner to send a new one.";

/**
 * Re-renders once a minute so "expires in 2h" is true for as long as the page
 * is open. The previous implementation read `Date.now()` during render with no
 * interval, so a tab left open showed the same countdown indefinitely — and
 * kept offering an action that had already lapsed.
 */
function useMinuteTick(enabled: boolean) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setTick((n) => n + 1), MINUTE_MS);
    return () => window.clearInterval(id);
  }, [enabled]);
}

interface TransferExpiry {
  expired: boolean;
  /** `null` when `expiresAt` doesn't parse — we don't guess in that case. */
  meta: StatusMeta | null;
}

/**
 * An unparseable expiry used to render as "expires soon". "Soon" is a claim,
 * and the code does not know it — so an unknown deadline now renders no badge
 * at all rather than a soft fact.
 */
function transferExpiry(value: string): TransferExpiry {
  const expiresAt = new Date(value).getTime();
  if (!Number.isFinite(expiresAt)) return { expired: false, meta: null };

  const remainingMs = expiresAt - Date.now();
  if (remainingMs <= 0) {
    return { expired: true, meta: { label: "Expired", tone: "muted" } };
  }

  const hours = Math.ceil(remainingMs / (1000 * 60 * 60));
  const label =
    hours < 24
      ? `Expires in ${hours}h`
      : `Expires in ${Math.ceil(hours / 24)}d`;
  return { expired: false, meta: { label, tone: "attention" } };
}

export function IncomingTransfers() {
  const transfersQuery = useMyProjectTransfers({ freshOnMount: true });
  const transfers = React.useMemo(
    () => transfersQuery.data ?? [],
    [transfersQuery.data],
  );
  const state = useDataState(transfersQuery, { count: transfers.length });
  const [reviewing, setReviewing] =
    React.useState<V2ProjectOwnershipTransferDTO | null>(null);

  useMinuteTick(transfers.length > 0);

  // Nothing pending is the normal state, and it is not news: the whole region
  // collapses rather than reserving space or flashing a skeleton for it.
  if (state.kind === "empty-first-run" || state.kind === "loading-initial") {
    return null;
  }

  return (
    <>
      <Section
        title="Ownership requests"
        description="Someone wants to hand a project to you. Accepting makes you its primary owner."
        meta={transfers.length > 0 ? `${transfers.length} waiting` : undefined}
      >
        <DataState
          state={state}
          resource="ownership requests"
          align="start"
          compactError
          skeleton={null}
        >
          <DataList aria-label="Ownership requests">
            {transfers.map((transfer) => (
              <TransferRow
                key={transfer.id}
                transfer={transfer}
                onReview={() => setReviewing(transfer)}
              />
            ))}
          </DataList>
        </DataState>
      </Section>

      <TransferDialog transfer={reviewing} onClose={() => setReviewing(null)} />
    </>
  );
}

function TransferRow({
  transfer,
  onReview,
}: {
  transfer: V2ProjectOwnershipTransferDTO;
  onReview: () => void;
}) {
  const { expired, meta } = transferExpiry(transfer.expiresAt);

  return (
    <ItemRow
      padding="dense"
      title={
        <span className="truncate text-sm font-medium text-foreground">
          {transfer.projectName}
        </span>
      }
      subtitle={
        <p className="text-xs text-muted-foreground">
          {userDisplayName(
            transfer.fromUser.firstName,
            transfer.fromUser.lastName,
            transfer.fromUser.email,
          )}{" "}
          wants you to own this project
        </p>
      }
      trailing={
        <div className="flex items-center gap-3">
          {meta && <StatusBadge {...meta} />}
          {/* A disabled button takes no pointer events, so a `title` on the
              control itself never fires. The reason goes on a wrapper that
              still receives hover, plus an `sr-only` twin — the same shape
              `ItemActionRow` uses for every other disabled row action. */}
          <span
            className="inline-flex items-center"
            title={expired ? EXPIRED_REASON : undefined}
          >
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={onReview}
              disabled={expired}
            >
              Review request
            </Button>
            {expired && <span className="sr-only">{EXPIRED_REASON}</span>}
          </span>
        </div>
      }
    />
  );
}

/**
 * The transfer detail. The previous dialog put a bordered `bg-muted/30` card
 * inside `DialogContent`, which is already a bordered elevated surface — the
 * one true card-in-card in this slice. A record's fields are a `DefinitionList`.
 */
function TransferDialog({
  transfer,
  onClose,
}: {
  transfer: V2ProjectOwnershipTransferDTO | null;
  onClose: () => void;
}) {
  const acceptTransfer = useAcceptProjectTransfer();
  const declineTransfer = useDeclineProjectTransfer();
  const pending = acceptTransfer.isPending || declineTransfer.isPending;
  const expiry = transfer ? transferExpiry(transfer.expiresAt) : null;
  const expired = expiry?.expired ?? false;

  const respond = async (
    run: () => Promise<unknown>,
    done: string,
    failed: string,
  ) => {
    try {
      await run();
      toast.success(done);
      onClose();
    } catch {
      toast.error(failed);
    }
  };

  return (
    <Dialog
      open={transfer !== null}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg" aria-busy={pending}>
        <DialogHeader>
          <DialogTitle>Review ownership transfer</DialogTitle>
          <DialogDescription>
            Accepting makes you the primary owner. The current owner stays on as
            an admin, and billing remains on their account.
          </DialogDescription>
        </DialogHeader>

        {transfer && (
          <DefinitionList
            items={[
              { term: "Project", value: transfer.projectName },
              {
                term: "Requested by",
                value: userDisplayName(
                  transfer.fromUser.firstName,
                  transfer.fromUser.lastName,
                  transfer.fromUser.email,
                ),
              },
              {
                term: "Expires",
                value: expiry?.meta?.label ?? fmtDateTime(transfer.expiresAt),
              },
            ]}
          />
        )}

        {expired && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            This request has expired, so it can no longer be accepted. Ask the
            current owner to send a new one.
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={pending || !transfer}
            onClick={() =>
              transfer &&
              respond(
                () => declineTransfer.mutateAsync(transfer.id),
                "Transfer declined",
                "Couldn't decline this transfer.",
              )
            }
          >
            <XCircleIcon className="size-3.5" aria-hidden />
            Decline transfer
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            // Never offer what the server will refuse: an expired grant cannot
            // be accepted. The reason is stated in the paragraph above rather
            // than in a `title` the disabled control could never fire.
            disabled={pending || expired || !transfer}
            onClick={() =>
              transfer &&
              respond(
                () => acceptTransfer.mutateAsync(transfer.id),
                "Ownership accepted",
                "Couldn't accept this transfer.",
              )
            }
          >
            <CheckCircleIcon className="size-3.5" aria-hidden />
            {acceptTransfer.isPending ? "Accepting…" : "Accept ownership"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
