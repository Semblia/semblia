"use client";

/**
 * The "Payment methods" settings section.
 *
 * Cards mirror what Razorpay reports after a successful charge; there is no
 * add, edit, or delete on this surface, so none is offered.
 *
 * Restructured onto the shared system:
 *   • rows are `ItemRow`s in a `DataList` inside the fieldset — the bordered
 *     box that used to wrap them is gone, along with the invisible 28px spacer
 *     that stood in for a menu this surface never had
 *   • `DataState` owns the ladder: "No saved cards yet." used to render just as
 *     readily when the request failed as when the account genuinely had none
 *   • one badge per row, and an unrecognised card brand reads as words rather
 *     than as an empty label
 */

import type { V2PaymentMethodDTO } from "@workspace/types";
import {
  DataList,
  DataState,
  EmptyState,
  ItemRow,
  ListSkeleton,
  RefreshingDataBadge,
  SettingsSection,
  StatusBadge,
  useDataState,
} from "@/components/shared";
import { CreditCardIcon } from "@phosphor-icons/react";
import { usePaymentMethods } from "@/hooks/api";
import { humanizeLabel } from "@/lib/format";

// ── Brand label ────────────────────────────────────────────────────────────────

// Null-prototype so a brand value colliding with an Object member falls through
// to the humanized fallback instead of resolving off the prototype chain.
const BRAND_LABELS: Record<string, string> = Object.assign(
  Object.create(null) as Record<string, string>,
  {
    visa: "Visa",
    mastercard: "Mastercard",
    rupay: "RuPay",
    amex: "Amex",
  },
);

function brandLabel(brand: string): string {
  return BRAND_LABELS[brand] ?? humanizeLabel(brand);
}

// ── Payment methods section ────────────────────────────────────────────────────

export function PaymentMethodsSection() {
  const methodsQuery = usePaymentMethods({ freshOnMount: true });
  const methods = methodsQuery.data ?? [];
  const state = useDataState(methodsQuery, { count: methods.length });

  return (
    <SettingsSection
      id="payment-methods"
      title="Payment methods"
      description="Razorpay saves a card automatically after a successful charge — there is nothing to add here by hand."
      staggerIndex={2}
      flush
      actions={<RefreshingDataBadge show={state.isRefreshing} />}
    >
      <DataState
        state={state}
        resource="your saved cards"
        align="start"
        compactError
        skeleton={
          <ListSkeleton rows={2} leading="square" trailing density="dense" />
        }
        empty={
          <EmptyState
            icon={CreditCardIcon}
            align="start"
            className="px-4"
            title="No saved cards"
            // Nothing for the owner to fix — a free account has never been
            // charged, so this reassures rather than prompting setup.
            description="A card is saved here the first time a charge succeeds on a paid plan."
          />
        }
      >
        {/* The payment-methods endpoint returns every card, not a paginated
            envelope, so there is no page affordance to render. */}
        <DataList aria-label="Saved cards">
          {methods.map((method) => (
            <PaymentRow key={method.id} method={method} />
          ))}
        </DataList>
      </DataState>
    </SettingsSection>
  );
}

// ── Single payment method row ──────────────────────────────────────────────────

function PaymentRow({ method }: { method: V2PaymentMethodDTO }) {
  const label = brandLabel(method.brand);
  const expiry = `${String(method.expMonth).padStart(2, "0")}/${String(
    method.expYear,
  ).slice(-2)}`;

  return (
    <ItemRow
      padding="dense"
      aria-label={`${label} ending ${method.last4}`}
      leading={
        <span
          // A tint step, not a bordered chip: a boundary here would be a second
          // bounded surface inside the fieldset, on a 36px mark.
          className="flex size-9 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground"
          aria-hidden
        >
          {label}
        </span>
      }
      title={
        <span className="block truncate text-sm font-medium text-foreground">
          {label} •••• {method.last4}
        </span>
      }
      subtitle={
        <p className="text-xs tabular-nums text-muted-foreground">
          Expires {expiry}
        </p>
      }
      trailing={
        method.isDefault ? (
          <StatusBadge label="Default" tone="progress" />
        ) : undefined
      }
    />
  );
}
