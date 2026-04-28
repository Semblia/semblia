"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageHeader, PageBody, SettingsSection } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  apiGetSubscription,
  apiCancelSubscription,
  apiGetInvoices,
  type Invoice,
} from "@/lib/api";
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
  status: Invoice["status"],
): "success" | "destructive" | "outline" {
  return status === "paid"
    ? "success"
    : status === "void"
      ? "outline"
      : "destructive";
}

// ── Plan card ──────────────────────────────────────────────────────────────────

function PlanCard() {
  const qc = useQueryClient();

  const { data: sub, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: apiGetSubscription,
  });

  const { mutate: toggleCancel, isPending: cancelling } = useMutation({
    mutationFn: apiCancelSubscription,
    onSuccess: (updated) => {
      qc.setQueryData(["subscription"], updated);
      toast.success(
        updated.cancelAtPeriodEnd
          ? "Subscription will cancel at period end."
          : "Subscription renewal restored.",
      );
    },
    onError: () => toast.error("Failed to update subscription."),
  });

  if (isLoading || !sub) {
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

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-start justify-between gap-4 flex-wrap px-4 py-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-foreground">
              {sub.userPlan} Plan
            </span>
            <Badge
              variant={sub.status === "ACTIVE" ? "success" : "destructive"}
              className="text-[10px]"
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
            {sub.amount != null && sub.currency
              ? `${formatINR(sub.amount)} / ${sub.interval}`
              : "No active billing"}{" "}
            {!sub.cancelAtPeriodEnd && periodEnd && (
              <span>· renews {periodEnd}</span>
            )}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleCancel()}
          disabled={cancelling}
          className={
            sub.cancelAtPeriodEnd
              ? ""
              : "text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          }
        >
          {cancelling
            ? "Updating…"
            : sub.cancelAtPeriodEnd
              ? "Resume subscription"
              : "Cancel subscription"}
        </Button>
      </div>
    </div>
  );
}

// ── Usage meter ────────────────────────────────────────────────────────────────

const USAGE_ITEMS = [
  { label: "Testimonials collected", used: 847, limit: 5000 },
  { label: "Widgets published", used: 12, limit: 50 },
  { label: "Projects", used: 3, limit: 10 },
];

function UsageMeter() {
  return (
    <div className="overflow-hidden rounded-lg border border-border divide-y divide-border">
      {USAGE_ITEMS.map(({ label, used, limit }) => {
        const pct = Math.min(100, Math.round((used / limit) * 100));
        return (
          <div key={label} className="space-y-2 px-4 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{label}</span>
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
            </div>
            <Progress
              value={pct}
              tone={
                pct > 90 ? "destructive" : pct > 70 ? "warning" : "default"
              }
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Invoice table ──────────────────────────────────────────────────────────────

function InvoiceTable() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: apiGetInvoices,
  });

  if (isLoading) {
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
      <div className="overflow-hidden rounded-lg border border-border py-8 px-4 text-center">
        <p className="text-sm text-muted-foreground">No invoices yet.</p>
      </div>
    );
  }

  return (
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
              <TableCell className="font-mono text-xs">{inv.number}</TableCell>
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled
                  title="Download (mock)"
                  onClick={() =>
                    toast.info("Download not available in mock mode.")
                  }
                >
                  <DownloadSimpleIcon className="size-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Billing page ───────────────────────────────────────────────────────────────

export default function BillingPage() {
  return (
    <>
      <PageHeader
        title="Billing"
        description="Manage your subscription, usage, and payment history."
      />
      <PageBody padding="default" withFooter className="space-y-8">
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
          description="Compare and switch plans. Razorpay checkout wires in when the billing API is ready."
          staggerIndex={2}
        >
          <PlanSwitcher />
        </SettingsSection>

        <SettingsSection
          id="payment-methods"
          title="Payment methods"
          description="Saved cards used for subscription billing."
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
