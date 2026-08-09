"use client";

/**
 * The "Invoice history" settings section.
 *
 * An invoice list is one of the few surfaces that genuinely earns a table:
 * every row shares a shape, amount and date are comparable down their columns,
 * and the task is comparison across periods. What it did *not* earn was the
 * stock table's chrome — a bordered box inside the fieldset — or per-cell
 * alignment decisions. `DataTable` carries the column law instead: numerics
 * right-aligned with `tabular-nums`, the aggregate in the column footer under
 * the numbers it sums, and the empty/error states replacing the headers rather
 * than leaving an empty `<tbody>`.
 */

import {
  DataState,
  EmptyState,
  DataTable,
  RefreshingDataBadge,
  SettingsSection,
  StatusBadge,
  useDataState,
  type DataTableColumn,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReceiptIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import type { V2InvoiceDTO } from "@workspace/types";
import { useInvoices } from "@/hooks/api";
import { invoiceStatusMeta } from "@/components/account/account-status";
import { formatINR } from "@/components/account/billing-format";
import { fmtDate, fmtDateTime, orDash } from "@/lib/format";

export function InvoiceHistory() {
  const invoicesQuery = useInvoices({ freshOnMount: true });
  const invoices = invoicesQuery.data ?? [];
  const state = useDataState(invoicesQuery, { count: invoices.length });

  const paidTotal = invoices
    .filter((invoice) => invoice.status === "paid")
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  const columns: DataTableColumn<V2InvoiceDTO>[] = [
    {
      id: "number",
      header: "Invoice",
      cell: (invoice) => (
        <span className="font-mono text-xs">{orDash(invoice.number)}</span>
      ),
      footer: "Paid to date",
    },
    {
      id: "date",
      header: "Date",
      secondary: true,
      cell: (invoice) => (
        <span
          className="text-muted-foreground"
          title={fmtDateTime(invoice.date)}
        >
          {fmtDate(invoice.date)}
        </span>
      ),
    },
    {
      id: "plan",
      header: "Plan",
      secondary: true,
      cell: (invoice) => orDash(invoice.planName),
    },
    {
      id: "amount",
      header: "Amount",
      numeric: true,
      cell: (invoice) => formatINR(invoice.amount),
      footer: formatINR(paidTotal),
    },
    {
      id: "status",
      header: "Status",
      width: "1%",
      cell: (invoice) => <StatusBadge {...invoiceStatusMeta(invoice.status)} />,
    },
    {
      id: "download",
      header: <span className="sr-only">Download</span>,
      width: "1%",
      cell: (invoice) => <InvoiceDownload invoice={invoice} />,
    },
  ];

  return (
    <SettingsSection
      id="invoices"
      title="Invoice history"
      description="Every invoice Razorpay has issued for this account."
      staggerIndex={3}
      actions={<RefreshingDataBadge show={state.isRefreshing} />}
    >
      <DataState
        state={state}
        resource="your invoices"
        align="start"
        compactError
        skeleton={<InvoiceSkeleton />}
        empty={
          <EmptyState
            icon={ReceiptIcon}
            align="start"
            className="px-2"
            title="No invoices yet"
            // A genuine "nothing has happened" state, not a setup failure —
            // so it reassures and offers no CTA.
            description="Invoices appear here after the first charge on a paid plan."
          />
        }
      >
        {/* The invoices endpoint returns the full list rather than a paginated
            envelope, so there is no page affordance to render. */}
        <DataTable
          aria-label="Invoices"
          columns={columns}
          rows={invoices}
          getKey={(invoice) => invoice.id}
        />
      </DataState>
    </SettingsSection>
  );
}

// ── Download control ───────────────────────────────────────────────────────────

/**
 * Razorpay mints the hosted invoice asynchronously, so `downloadUrl` is null
 * for a window after the charge. Rather than a bare disabled icon explained by
 * a tooltip the control can never receive, the reason rides on a wrapper that
 * still takes hover, with an `sr-only` twin for assistive tech.
 */
function InvoiceDownload({ invoice }: { invoice: V2InvoiceDTO }) {
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
          <DownloadSimpleIcon className="size-3.5" aria-hidden />
        </a>
      </Button>
    );
  }

  return (
    <span
      className="inline-flex items-center"
      title="Razorpay hasn't published this invoice yet"
    >
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={`Invoice ${invoice.number} is not available to download yet`}
        disabled
      >
        <DownloadSimpleIcon className="size-3.5" aria-hidden />
      </Button>
      <span className="sr-only">
        Razorpay hasn&apos;t published this invoice yet.
      </span>
    </span>
  );
}

// ── Cold load ──────────────────────────────────────────────────────────────────

// Four rows on the table's own gutter and row height, so the swap causes no
// shift when the real rows arrive.
function InvoiceSkeleton() {
  return (
    <div aria-hidden className="divide-y divide-border">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-2 py-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="ml-auto h-3 w-16" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}
