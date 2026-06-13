"use client";

import * as React from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  PageHeader,
  PageBody,
  SettingsSection,
  RefreshingDataBadge,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { V2InvoiceDTO } from "@workspace/types";
import {
  useBillingUsage,
  useCancelSubscription,
  useInvoices,
  useSubscription,
} from "@/hooks/api";
import { useLiveQueryState } from "@/hooks/use-live-query-state";
import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { PlanSwitcher } from "@/components/account/plan-switcher";
import { PaymentMethodsSection } from "@/components/account/payment-method-row";
import { BillingAddressForm } from "@/components/account/billing-address-form";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatINR(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function statusVariant(
  status: V2InvoiceDTO["status"],
): "success" | "destructive" | "outline" {
  return status === "paid"
    ? "success"
    : status === "void"
      ? "outline"
      : "destructive";
}

function planDisplayName(plan: string) {
  return `${plan.charAt(0)}${plan.slice(1).toLowerCase()} plan`;
}

// ── Plan card ──────────────────────────────────────────────────────────────────

function PlanCard() {
  const subscriptionQuery = useSubscription({ freshOnMount: true });
  const liveState = useLiveQueryState(subscriptionQuery, {
    requireFreshOnMount: true,
  });
  const sub = subscriptionQuery.data;
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);

  const cancelMutation = useCancelSubscription();
  const cancelling = cancelMutation.isPending;
  const cancelSubscription = () =>
    cancelMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Subscription will cancel at period end.");
        setCancelDialogOpen(false);
      },
      onError: () => toast.error("Failed to cancel subscription."),
    });

  if (liveState.isWaitingForLiveData || !sub) {
    return (
      <div className="overflow-hidden rounded-lg border border-border px-4 py-4 space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    );
  }

  const periodEnd = sub.currentPeriodEnd
    ? format(new Date(sub.currentPeriodEnd), "MMM d, yyyy")
    : null;
  const isFree = sub.userPlan === "FREE";

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-start justify-between gap-4 flex-wrap px-4 py-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-foreground">
              {planDisplayName(sub.userPlan)}
            </span>
            <Badge
              variant={sub.status === "active" ? "success" : "destructive"}
              className="text-[10px] capitalize"
            >
              {sub.status}
            </Badge>
            {sub.cancelAtPeriodEnd && (
              <Badge variant="warning" className="text-[10px]">
                Cancels {periodEnd}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isFree ? (
              "₹0 / month · no billing"
            ) : (
              <>
                {formatINR(sub.amount)} / {sub.interval}{" "}
                {!sub.cancelAtPeriodEnd && periodEnd && (
                  <span>· renews {periodEnd}</span>
                )}
              </>
            )}
          </p>
        </div>

        {!isFree && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCancelDialogOpen(true)}
            disabled={cancelling || sub.cancelAtPeriodEnd}
            className={
              sub.cancelAtPeriodEnd
                ? ""
                : "text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
            }
          >
            {cancelling
              ? "Cancelling…"
              : sub.cancelAtPeriodEnd
                ? "Cancellation scheduled"
                : "Cancel subscription"}
          </Button>
        )}
      </div>

      <ConfirmationDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        intent="danger"
        title="Cancel subscription?"
        description={`Cancel your subscription at the end of the current period? You'll keep paid features until ${periodEnd ?? "then"}. To resume, you'll need to start a new subscription.`}
        confirmLabel={cancelling ? "Cancelling…" : "Cancel subscription"}
        onConfirm={cancelSubscription}
      />
    </div>
  );
}

// ── Usage meter ────────────────────────────────────────────────────────────────

function UsageMeter() {
  const usageQuery = useBillingUsage({ freshOnMount: true });
  const liveState = useLiveQueryState(usageQuery, {
    requireFreshOnMount: true,
  });
  const usage = usageQuery.data;

  if (liveState.isWaitingForLiveData || !usage) {
    return (
      <div className="overflow-hidden rounded-lg border border-border divide-y divide-border">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-2 px-4 py-3">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const rows = [
    { label: "Responses collected", value: usage.responses },
    { label: "Widgets published", value: usage.widgets },
    { label: "Projects", value: usage.projects },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-border divide-y divide-border">
      {rows.map(({ label, value }) => {
        const { used, limit } = value;
        const pct =
          limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
        const atLimit = limit > 0 && used >= limit;
        return (
          <div key={label} className="space-y-2 px-4 py-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">{label}</span>
              <span className="flex items-center gap-2.5">
                {atLimit && (
                  <a
                    href="#plans"
                    className="font-medium text-brand transition-colors hover:text-brand/80 hover:underline underline-offset-2"
                  >
                    Upgrade
                  </a>
                )}
                <span
                  className={
                    pct > 90
                      ? "text-destructive font-medium"
                      : pct > 70
                        ? "text-warning font-medium"
                        : "text-foreground"
                  }
                >
                  {used.toLocaleString("en-IN")} /{" "}
                  {limit.toLocaleString("en-IN")}
                </span>
              </span>
            </div>
            <Progress
              value={pct}
              tone={pct > 90 ? "destructive" : pct > 70 ? "warning" : "default"}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Invoice table ──────────────────────────────────────────────────────────────

function InvoiceTable() {
  const invoicesQuery = useInvoices({ freshOnMount: true });
  const liveState = useLiveQueryState(invoicesQuery);
  const invoices = invoicesQuery.data;

  if (invoicesQuery.isPending && !liveState.hasData) {
    return (
      <div className="overflow-hidden rounded-lg border border-border px-4 py-4 space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded" />
        ))}
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex min-h-6 justify-end">
          <RefreshingDataBadge show={liveState.isBackgroundRefreshing} />
        </div>
        <div className="overflow-hidden rounded-lg border border-border py-8 px-4 text-center">
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex min-h-6 justify-end">
        <RefreshingDataBadge show={liveState.isBackgroundRefreshing} />
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono text-xs">
                  {inv.number}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(inv.date), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-xs">{inv.planName}</TableCell>
                <TableCell className="text-right text-xs tabular-nums">
                  {formatINR(inv.amount)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={statusVariant(inv.status)}
                    className="text-[10px] capitalize"
                  >
                    {inv.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <InvoiceDownloadButton invoice={inv} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function InvoiceDownloadButton({ invoice }: { invoice: V2InvoiceDTO }) {
  if (invoice.downloadUrl) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={`Open invoice ${invoice.number}`}
        asChild
      >
        <a href={invoice.downloadUrl} target="_blank" rel="noopener noreferrer">
          <DownloadSimpleIcon className="size-3.5" />
        </a>
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={`Hosted invoice pending for ${invoice.number}`}
              disabled
            >
              <DownloadSimpleIcon className="size-3.5" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Hosted invoice pending</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Billing page ───────────────────────────────────────────────────────────────

export default function BillingPage() {
  return (
    <>
      <PageHeader contained title="Billing" />
      <PageBody
        contained
        padding="default"
        withFooter
        contentClassName="space-y-8"
      >
        <SettingsSection
          id="plan"
          title="Current plan"
          description="Your active subscription and renewal details."
          staggerIndex={0}
        >
          <PlanCard />
        </SettingsSection>

        <SettingsSection
          id="usage"
          title="Usage"
          description="Current usage against your plan limits this billing period."
          staggerIndex={1}
        >
          <UsageMeter />
        </SettingsSection>

        <SettingsSection
          id="plans"
          title="Plans"
          description="Compare plans, start checkout, or schedule plan changes."
          staggerIndex={2}
        >
          <PlanSwitcher />
        </SettingsSection>

        <SettingsSection
          id="payment-methods"
          title="Payment methods"
          description="Cards are saved automatically by Razorpay after a successful charge — there's nothing to add manually."
          staggerIndex={3}
        >
          <PaymentMethodsSection />
        </SettingsSection>

        <SettingsSection
          id="invoices"
          title="Invoice history"
          description="Past invoices for your account."
          staggerIndex={4}
        >
          <InvoiceTable />
        </SettingsSection>

        <SettingsSection
          id="billing-address"
          title="Billing address"
          description="Used on invoices. GSTIN field appears when country is India."
          staggerIndex={5}
        >
          <BillingAddressForm />
        </SettingsSection>
      </PageBody>
    </>
  );
}
