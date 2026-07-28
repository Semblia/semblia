"use client";

/**
 * The "Current plan" settings section.
 *
 * Was a bordered box inside `SettingsSection` carrying up to three badges at
 * once — the raw subscription enum (`past_due` rendered as "Past_due"), plus a
 * "Cancels …" pill on the same axis. Now:
 *
 *   • one badge, from the account status vocabulary, with a readable fallback
 *     for a status Razorpay grows before this app knows it
 *   • the money and dates move into a `DefinitionList`, which is what a single
 *     record's fields are for
 *   • a scheduled cancellation removes the Cancel control rather than showing
 *     it disabled and relabelled — the request would refuse it — and says where
 *     the subscription now stands, in the section footer
 */

import * as React from "react";
import { toast } from "sonner";

import {
  DataState,
  DefinitionList,
  SettingsSection,
  StatusBadge,
  useDataState,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCancelSubscription, useSubscription } from "@/hooks/api";
import { subscriptionStatusMeta } from "@/components/account/account-status";
import {
  formatINR,
  planDisplayName,
} from "@/components/account/billing-format";
import { fmtDate, fmtDateTime } from "@/lib/format";
import type { V2SubscriptionDTO } from "@workspace/types";

export function SubscriptionSummary() {
  const subscriptionQuery = useSubscription({ freshOnMount: true });
  const state = useDataState(subscriptionQuery, { requireFreshOnMount: true });
  const sub = subscriptionQuery.data;

  const [cancelOpen, setCancelOpen] = React.useState(false);
  const cancelMutation = useCancelSubscription();
  const cancelling = cancelMutation.isPending;

  const cancelSubscription = () =>
    cancelMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Subscription will cancel at period end.");
        setCancelOpen(false);
      },
      onError: () => toast.error("Failed to cancel subscription."),
    });

  const scheduledEnd = sub?.cancelAtPeriodEnd
    ? fmtDate(sub.currentPeriodEnd)
    : null;

  return (
    <SettingsSection
      id="plan"
      title="Current plan"
      description="What you're on today, what it costs, and when the current period ends."
      staggerIndex={0}
      flush
      footer={
        scheduledEnd
          ? `This subscription cancels on ${scheduledEnd}. Paid features stay available until then; pick a plan below to start a new one.`
          : undefined
      }
    >
      <DataState
        state={state}
        resource="your subscription"
        align="start"
        compactError
        skeleton={<SubscriptionSkeleton />}
      >
        {/* `ready` implies the query resolved; the guard is here for the type,
            not as a state branch. */}
        {sub ? (
          <div className="space-y-4 px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-foreground">
                  {planDisplayName(sub.userPlan)} plan
                </span>
                <StatusBadge {...subscriptionStatusMeta(sub.status)} />
              </div>

              {sub.userPlan !== "FREE" && !sub.cancelAtPeriodEnd && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cancelling}
                  onClick={() => setCancelOpen(true)}
                  className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  {cancelling ? "Cancelling…" : "Cancel subscription"}
                </Button>
              )}
            </div>

            <DefinitionList items={planFacts(sub)} />
          </div>
        ) : null}
      </DataState>

      <ConfirmationDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        intent="danger"
        title="Cancel subscription?"
        description={`Paid features stay available until ${scheduledEnd ?? fmtDate(sub?.currentPeriodEnd)}, then the account moves to Free. Resuming later means starting a new subscription.`}
        confirmLabel={cancelling ? "Cancelling…" : "Cancel subscription"}
        onConfirm={cancelSubscription}
      />
    </SettingsSection>
  );
}

/**
 * The record's fields. The free plan genuinely has no billing and no renewal,
 * which is a different fact from "we don't know" — it says so in words rather
 * than showing an em dash that would read as missing data.
 */
function planFacts(sub: V2SubscriptionDTO) {
  const isFree = sub.userPlan === "FREE";
  const periodEnd = (
    <span title={fmtDateTime(sub.currentPeriodEnd)}>
      {fmtDate(sub.currentPeriodEnd)}
    </span>
  );

  return [
    {
      term: "Price",
      value: isFree
        ? "No charge"
        : `${formatINR(sub.amount)} per ${sub.interval}`,
    },
    {
      term: sub.cancelAtPeriodEnd
        ? "Cancels on"
        : isFree
          ? "Period ends"
          : "Renews on",
      value: periodEnd,
    },
  ];
}

// ── Cold load ──────────────────────────────────────────────────────────────────

// Matches the real block: a title line, a badge, and two definition rows.
function SubscriptionSkeleton() {
  return (
    <div aria-hidden className="space-y-4 px-5 py-5">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}
