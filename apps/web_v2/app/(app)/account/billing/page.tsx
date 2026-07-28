"use client";

/**
 * Billing — subscription, usage, plans, cards, invoices, and address.
 *
 * Composition only. Every section owns its own query and its own data state, so
 * a billing call that fails replaces that section alone; the page never blanks
 * because one of six requests didn't land.
 *
 * Two sections here are deliberately *not* settings fieldsets, because both
 * compose primitives that are specified to sit on the page background:
 *
 *   • Usage is a `MetricRow`, whose tiles carry their own background and would
 *     paint a second surface on top of a card
 *   • Plans is a card grid, and a plan tile *is* the entity, so the tile keeps
 *     its border — which means its wrapper must not have one
 *
 * Both therefore render an unbounded `Section`. Everything else on this page is
 * a `SettingsSection`.
 */

import { PageHeader, PageBody } from "@/components/shared";
import { SubscriptionSummary } from "@/components/account/subscription-summary";
import { UsageSummary } from "@/components/account/usage-summary";
import { PlanSwitcher } from "@/components/account/plan-switcher";
import { PaymentMethodsSection } from "@/components/account/payment-method-row";
import { InvoiceHistory } from "@/components/account/invoice-history";
import { BillingAddressForm } from "@/components/account/billing-address-form";

export default function BillingPage() {
  return (
    <>
      <PageHeader title="Billing" />
      <PageBody measure padding="default" className="space-y-8">
        <SubscriptionSummary />
        <UsageSummary />
        <PlanSwitcher />
        <PaymentMethodsSection />
        <InvoiceHistory />
        <BillingAddressForm />
      </PageBody>
    </>
  );
}
