"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { apiGetSubscription, apiSwitchPlan } from "@/lib/api";
import { CheckIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// ── Plan definitions ───────────────────────────────────────────────────────────

interface PlanDef {
  id: string;
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
    features: [
      "1 project",
      "50 testimonials",
      "5 widgets",
      "Community support",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    price: "₹799",
    interval: "/month",
    features: [
      "10 projects",
      "5,000 testimonials",
      "50 widgets",
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
      "Unlimited projects",
      "Unlimited testimonials",
      "Unlimited widgets",
      "Dedicated support",
      "Custom branding",
      "SSO & SAML",
    ],
  },
];

// ── Plan switcher ──────────────────────────────────────────────────────────────

export function PlanSwitcher() {
  const qc = useQueryClient();

  const { data: sub, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: apiGetSubscription,
  });

  const [confirmPlan, setConfirmPlan] = React.useState<PlanDef | null>(null);

  const { mutate: switchPlan, isPending: switching } = useMutation({
    mutationFn: (planId: string) => apiSwitchPlan(planId),
    onSuccess: (updated) => {
      qc.setQueryData(["subscription"], updated);
      toast.success(`Switched to ${updated.userPlan} plan.`);
      setConfirmPlan(null);
    },
    onError: () => toast.error("Failed to switch plan."),
  });

  if (isLoading || !sub) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  const currentPlanId = sub.userPlan;

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
                  disabled={isCurrent || switching}
                  onClick={() => setConfirmPlan(plan)}
                  className="w-full"
                >
                  {isCurrent ? "Current plan" : `Switch to ${plan.name}`}
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
        title={`Switch to ${confirmPlan?.name}?`}
        description={
          confirmPlan
            ? `Your plan will change to ${confirmPlan.name} (${confirmPlan.price}${confirmPlan.interval}). Razorpay checkout will be integrated once the billing API is ready.`
            : ""
        }
        confirmLabel={switching ? "Switching…" : "Switch plan"}
        onConfirm={() => confirmPlan && switchPlan(confirmPlan.id)}
      />
    </>
  );
}
