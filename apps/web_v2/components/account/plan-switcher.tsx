"use client";

import * as React from "react";
import { toast } from "sonner";
import type { V2UserPlan } from "@workspace/types";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useLiveQueryState } from "@/hooks/use-live-query-state";
import { openSubscriptionCheckout } from "@/lib/razorpay-checkout";
import { CheckIcon } from "@phosphor-icons/react";
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
  return format(new Date(value), "MMM d, yyyy");
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
  const liveState = useLiveQueryState(subscriptionQuery, {
    requireFreshOnMount: true,
  });
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

  if (liveState.isWaitingForLiveData || !sub) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  const currentPlanId = sub.userPlan;
  const isPaid = currentPlanId !== "FREE";
  const currentPlanName = planName(currentPlanId);
  const periodEnd = formatPeriodEnd(sub.currentPeriodEnd);
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
    <>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col overflow-visible",
                plan.popular && "ring-2 ring-brand",
                isCurrent && "ring-2 ring-success/50",
              )}
            >
              {plan.popular && !isCurrent && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-semibold text-white">
                  Popular
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-success/20 px-2.5 py-0.5 text-[10px] font-semibold text-success ring-1 ring-success/30">
                  Current
                </span>
              )}
              <CardContent className="flex flex-1 flex-col gap-4 pt-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {plan.name}
                  </p>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {plan.interval}
                    </span>
                  </div>
                </div>

                <ul className="flex-1 space-y-1.5">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <CheckIcon
                        className="size-3 shrink-0 text-success"
                        weight="bold"
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  size="sm"
                  variant={isCurrent ? "secondary" : "outline"}
                  disabled={isCurrent || confirming}
                  onClick={() => setConfirmPlan(plan)}
                  className="w-full"
                >
                  {buttonLabel(plan, isCurrent, isPaid)}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
    </>
  );
}

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
  if (transition === "free-to-paid") return "Continuing...";
  if (transition === "paid-to-paid") return "Scheduling...";
  return "Cancelling...";
}
