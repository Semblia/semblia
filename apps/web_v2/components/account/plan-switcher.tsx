"use client";

/**
 * PlanSwitcher — the plan grid and the transition it commits to.
 *
 * This was one of the last surfaces still using stock ShadCN `Card` scaffolding
 * as page layout, wrapped in a `SettingsSection`: a card grid inside a card,
 * with each tile carrying two accent rings and a pill floating outside its own
 * border. Three corrections:
 *
 *   1. A plan tile *is* the entity, so it keeps its border — which means the
 *      wrapper must not have one. The grid sits in an unbounded `Section`,
 *      never inside a settings fieldset.
 *   2. One badge per tile. "Current" and "Recommended" are the same axis, so
 *      the current plan wins and the recommendation steps aside.
 *   3. `DataState` owns the ladder; a failed subscription request used to fall
 *      through to a skeleton that never resolved.
 *
 * The three transitions themselves are unchanged and load-bearing: FREE → paid
 * opens Razorpay Checkout, paid → paid schedules a switch at the next cycle,
 * and paid → FREE cancels at period end.
 */

import * as React from "react";
import { toast } from "sonner";
import type { V2UserPlan } from "@workspace/types";
import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon } from "@phosphor-icons/react";

import {
  DataState,
  Section,
  StatusBadge,
  useDataState,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  billingQueryKeys,
  useCancelSubscription,
  useCreateCheckoutSession,
  useSubscription,
  useSwitchPlan,
} from "@/hooks/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { openSubscriptionCheckout } from "@/lib/razorpay-checkout";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

// ── Plan definitions ───────────────────────────────────────────────────────────

interface PlanDef {
  id: V2UserPlan;
  name: string;
  price: string;
  interval: string;
  features: string[];
  popular?: boolean;
}

const PLANS: PlanDef[] = [
  {
    id: "FREE",
    name: "Free",
    price: "₹0",
    interval: "/month",
    features: ["1 project", "25 responses", "1 widget", "Community support"],
  },
  {
    id: "PRO",
    name: "Pro",
    price: "₹799",
    interval: "/month",
    features: [
      "5 projects",
      "1,000 responses",
      "10 widgets",
      "Priority support",
      "Custom branding",
    ],
    popular: true,
  },
  {
    id: "BUSINESS",
    name: "Business",
    price: "₹2,499",
    interval: "/month",
    features: [
      "25 projects",
      "10,000 responses",
      "100 widgets",
      "Dedicated support",
      "Custom branding",
      "SSO & SAML",
    ],
  },
];

type PlanTransition = "free-to-paid" | "paid-to-paid" | "paid-to-free";

function planName(planId: V2UserPlan) {
  return PLANS.find((plan) => plan.id === planId)?.name ?? planId;
}

function formatPeriodEnd(value: string | null | undefined) {
  if (!value) return "the end of the current period";
  return fmtDate(value);
}

function currentUserName(user: ReturnType<typeof useCurrentUser>["data"]) {
  if (!user) return undefined;

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : undefined;
}

// ── Plan switcher ──────────────────────────────────────────────────────────────

export function PlanSwitcher() {
  const queryClient = useQueryClient();
  const subscriptionQuery = useSubscription({ freshOnMount: true });
  const currentUserQuery = useCurrentUser();
  const state = useDataState(subscriptionQuery, { requireFreshOnMount: true });
  const sub = subscriptionQuery.data;

  const [confirmPlan, setConfirmPlan] = React.useState<PlanDef | null>(null);

  const checkoutMutation = useCreateCheckoutSession();
  const switchMutation = useSwitchPlan();
  const cancelMutation = useCancelSubscription();
  const activationTargetRef = React.useRef<V2UserPlan | null>(null);
  const activationIntervalRef = React.useRef<number | null>(null);

  const stopActivationPolling = React.useCallback(() => {
    if (activationIntervalRef.current) {
      window.clearInterval(activationIntervalRef.current);
      activationIntervalRef.current = null;
    }
    activationTargetRef.current = null;
  }, []);

  const invalidateActivationQueries = React.useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: billingQueryKeys.subscription,
    });
    void queryClient.invalidateQueries({
      queryKey: billingQueryKeys.usage,
    });
  }, [queryClient]);

  const startActivationPolling = React.useCallback(
    (targetPlan: V2UserPlan) => {
      stopActivationPolling();
      activationTargetRef.current = targetPlan;
      invalidateActivationQueries();

      let ticks = 0;
      activationIntervalRef.current = window.setInterval(() => {
        ticks += 1;
        invalidateActivationQueries();
        if (ticks >= 6) {
          stopActivationPolling();
        }
      }, 5_000);
    },
    [invalidateActivationQueries, stopActivationPolling],
  );

  React.useEffect(() => stopActivationPolling, [stopActivationPolling]);

  React.useEffect(() => {
    if (
      activationTargetRef.current &&
      sub?.userPlan === activationTargetRef.current
    ) {
      stopActivationPolling();
    }
  }, [stopActivationPolling, sub?.userPlan]);

  const currentPlanId = sub?.userPlan ?? null;
  const isPaid = currentPlanId !== null && currentPlanId !== "FREE";
  const currentPlanName = currentPlanId ? planName(currentPlanId) : "";
  const periodEnd = formatPeriodEnd(sub?.currentPeriodEnd);
  // The API sets `cancelAtPeriodEnd` both on a cancel and on a paid → paid
  // switch, and refuses a second cancel either way. "Current plan" removes its
  // Cancel control for exactly this state; the FREE tile is the same request,
  // so it states the scheduled end rather than offering the call again.
  const cancelScheduled = Boolean(sub?.cancelAtPeriodEnd);
  const selectedTransition = confirmPlan
    ? getTransition(isPaid, confirmPlan.id)
    : null;
  const confirming =
    checkoutMutation.isPending ||
    switchMutation.isPending ||
    cancelMutation.isPending;

  const handleConfirm = async () => {
    if (!confirmPlan || !selectedTransition) return;

    try {
      if (selectedTransition === "free-to-paid") {
        const checkout = await checkoutMutation.mutateAsync(confirmPlan.id);
        const user = currentUserQuery.data;

        await openSubscriptionCheckout({
          subscriptionId: checkout.subscriptionId,
          razorpayKeyId: checkout.razorpayKeyId,
          shortUrl: checkout.shortUrl,
          prefill: {
            name: currentUserName(user),
            email: user?.email,
          },
          notes: {
            planId: checkout.planId,
          },
        });
        toast.success("Activating your subscription…");
        startActivationPolling(confirmPlan.id);
        setConfirmPlan(null);
        return;
      }

      if (selectedTransition === "paid-to-paid") {
        await switchMutation.mutateAsync(confirmPlan.id);
        toast.success(`Plan switch to ${confirmPlan.name} scheduled.`);
        setConfirmPlan(null);
        return;
      }

      await cancelMutation.mutateAsync();
      toast.success("Subscription will cancel at period end.");
      setConfirmPlan(null);
    } catch {
      toast.error(
        selectedTransition === "free-to-paid"
          ? "Failed to start checkout."
          : selectedTransition === "paid-to-paid"
            ? "Failed to schedule plan switch."
            : "Failed to cancel subscription.",
      );
    }
  };

  return (
    <Section
      id="plans"
      title="Plans"
      description="Compare what each plan includes. Switching between paid plans takes effect at the start of the next billing cycle."
      className="border-b border-border px-4 py-6 sm:px-6"
    >
      <DataState
        state={state}
        resource="the plan catalogue"
        align="start"
        compactError
        skeleton={<PlanGridSkeleton />}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanTile
              key={plan.id}
              plan={plan}
              isCurrent={plan.id === currentPlanId}
              isPaid={isPaid}
              busy={confirming}
              blockedReason={
                plan.id === "FREE" && isPaid && cancelScheduled
                  ? `Cancellation is already scheduled for ${periodEnd}.`
                  : null
              }
              onSelect={() => setConfirmPlan(plan)}
            />
          ))}
        </div>
      </DataState>

      <ConfirmationDialog
        open={!!confirmPlan}
        onOpenChange={(o) => !o && setConfirmPlan(null)}
        intent="warning"
        title={dialogTitle(confirmPlan, selectedTransition)}
        description={
          confirmPlan && selectedTransition
            ? dialogDescription({
                currentPlanName,
                periodEnd,
                plan: confirmPlan,
                transition: selectedTransition,
              })
            : ""
        }
        confirmLabel={
          confirming
            ? pendingLabel(selectedTransition)
            : confirmLabel(selectedTransition)
        }
        onConfirm={handleConfirm}
      />
    </Section>
  );
}

// ── Plan tile ──────────────────────────────────────────────────────────────────

/**
 * The one sanctioned bordered surface on this section: in a deliberate card
 * grid, the tile *is* the entity. Emphasis is carried by the border colour and
 * a single badge — never by a second ring, and never by a pill floating outside
 * the tile's own boundary.
 */
function PlanTile({
  plan,
  isCurrent,
  isPaid,
  busy,
  blockedReason,
  onSelect,
}: {
  plan: PlanDef;
  isCurrent: boolean;
  isPaid: boolean;
  busy: boolean;
  /** Why this transition can't be taken right now, if it can't. */
  blockedReason?: string | null;
  onSelect: () => void;
}) {
  const reasonId = React.useId();
  const blocked = Boolean(blockedReason);

  return (
    <article
      aria-label={`${plan.name} plan`}
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-card p-5 transition-colors duration-(--duration-base)",
        isCurrent ? "border-brand/50" : "border-border",
      )}
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{plan.name}</p>
          <PlanTileBadge isCurrent={isCurrent} popular={plan.popular} />
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-xl font-bold tabular-nums text-foreground">
            {plan.price}
          </span>
          <span className="text-xs text-muted-foreground">{plan.interval}</span>
        </div>
      </div>

      <ul className="flex-1 space-y-1.5">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <CheckIcon
              className="size-3 shrink-0 text-success"
              weight="bold"
              aria-hidden
            />
            {feature}
          </li>
        ))}
      </ul>

      {/* A blocked transition keeps its label and states the reason underneath:
          a disabled button takes no pointer events, so a tooltip on it could
          never be read. */}
      <div className="space-y-1.5">
        <Button
          size="sm"
          variant={ctaVariant(isCurrent, blocked, plan.popular)}
          disabled={isCurrent || blocked || busy}
          aria-describedby={blocked ? reasonId : undefined}
          onClick={onSelect}
          className="w-full"
        >
          {buttonLabel(plan, isCurrent, isPaid)}
        </Button>
        {blocked && (
          <p
            id={reasonId}
            className="text-xs leading-relaxed text-muted-foreground"
          >
            {blockedReason}
          </p>
        )}
      </div>
    </article>
  );
}

// One badge: current state outranks a recommendation.
function PlanTileBadge({
  isCurrent,
  popular,
}: {
  isCurrent: boolean;
  popular?: boolean;
}) {
  if (isCurrent) return <StatusBadge label="Current plan" tone="positive" />;
  if (popular) return <StatusBadge label="Recommended" tone="progress" />;
  return null;
}

// The current plan is a fact, not a broken button — quiet outline.
// The recommended upgrade is the section's one filled CTA.
function ctaVariant(isCurrent: boolean, blocked: boolean, popular?: boolean) {
  return !isCurrent && !blocked && popular ? "default" : "outline";
}

// ── Cold load ──────────────────────────────────────────────────────────────────

// Three tiles on the real grid, at the real tile height.
function PlanGridSkeleton() {
  return (
    <div
      aria-hidden
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      data-slot="plan-grid-skeleton"
    >
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-56 rounded-xl" />
      ))}
    </div>
  );
}

// ── Transitions ────────────────────────────────────────────────────────────────

function getTransition(
  isPaid: boolean,
  targetPlanId: V2UserPlan,
): PlanTransition {
  if (!isPaid && targetPlanId !== "FREE") return "free-to-paid";
  if (isPaid && targetPlanId === "FREE") return "paid-to-free";
  return "paid-to-paid";
}

function buttonLabel(plan: PlanDef, isCurrent: boolean, isPaid: boolean) {
  if (isCurrent) return "Current plan";
  if (isPaid && plan.id === "FREE") return "Cancel subscription";
  return `Switch to ${plan.name}`;
}

function dialogTitle(plan: PlanDef | null, transition: PlanTransition | null) {
  if (!plan || !transition) return "";
  if (transition === "paid-to-free") return "Cancel subscription?";
  if (transition === "paid-to-paid") return `Schedule switch to ${plan.name}?`;
  return `Switch to ${plan.name}?`;
}

function dialogDescription({
  currentPlanName,
  periodEnd,
  plan,
  transition,
}: {
  currentPlanName: string;
  periodEnd: string;
  plan: PlanDef;
  transition: PlanTransition;
}) {
  if (transition === "free-to-paid") {
    return `You'll be redirected to Razorpay Checkout to complete payment with cards, UPI, or net banking. Your plan switches to ${plan.name} after the first successful charge.`;
  }

  if (transition === "paid-to-paid") {
    return `Your plan will change to ${plan.name} at the start of your next billing cycle (${periodEnd}). No charge today.`;
  }

  return `Your subscription will cancel at the end of the current period (${periodEnd}). You'll keep ${currentPlanName} until then.`;
}

function confirmLabel(transition: PlanTransition | null) {
  if (transition === "free-to-paid") return "Continue to Razorpay";
  if (transition === "paid-to-paid") return "Schedule plan switch";
  return "Cancel subscription";
}

function pendingLabel(transition: PlanTransition | null) {
  if (transition === "free-to-paid") return "Opening Razorpay…";
  if (transition === "paid-to-paid") return "Scheduling…";
  return "Cancelling…";
}
