import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type {
  V2SubscriptionDTO,
  V2UserDTO,
  V2UserPlan,
} from "@workspace/types";
import { PlanSwitcher } from "@/components/account/plan-switcher";
import {
  billingQueryKeys,
  useCancelSubscription,
  useCreateCheckoutSession,
  useSubscription,
  useSwitchPlan,
} from "@/hooks/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { openSubscriptionCheckout } from "@/lib/razorpay-checkout";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/razorpay-checkout", () => ({
  openSubscriptionCheckout: vi.fn(),
}));

vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock("@/hooks/api", () => ({
  billingQueryKeys: {
    subscription: ["account", "subscription"],
    usage: ["account", "usage"],
  },
  useSubscription: vi.fn(),
  useCreateCheckoutSession: vi.fn(),
  useSwitchPlan: vi.fn(),
  useCancelSubscription: vi.fn(),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function subscription(overrides: Partial<V2SubscriptionDTO> = {}) {
  return {
    id: "local_sub_1",
    userId: "user_1",
    status: "active",
    userPlan: "FREE",
    currentPeriodStart: "2026-05-01T00:00:00.000Z",
    currentPeriodEnd: "2026-06-01T00:00:00.000Z",
    cancelAtPeriodEnd: false,
    amount: 0,
    currency: "INR",
    interval: "month",
    ...overrides,
  } satisfies V2SubscriptionDTO;
}

/**
 * The full slice `useDataState` reads. Supplied in full so a failed
 * subscription request cannot pass for a loaded one — the plan grid is gated on
 * knowing which plan is current, and offering a switch without that is offering
 * an action the API would refuse.
 */
function subscriptionQuery(plan: V2UserPlan) {
  return {
    data: subscription({
      userPlan: plan,
      amount: plan === "FREE" ? 0 : 79900,
    }),
    dataUpdatedAt: Date.now(),
    error: null,
    isError: false,
    isFetching: false,
    isPending: false,
    isRefetching: false,
    refetch: vi.fn(),
  };
}

function scheduledCancelQuery() {
  return {
    ...subscriptionQuery("PRO"),
    data: subscription({
      userPlan: "PRO",
      amount: 79900,
      cancelAtPeriodEnd: true,
    }),
  };
}

function failedSubscriptionQuery() {
  return {
    data: undefined,
    dataUpdatedAt: 0,
    error: new Error("network"),
    isError: true,
    isFetching: false,
    isPending: false,
    isRefetching: false,
    refetch: vi.fn(),
  };
}

const currentUser: V2UserDTO = {
  id: "user_1",
  email: "ada@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
  avatar: null,
  plan: "FREE",
  onboardingStep: "COMPLETED",
  onboardingData: null,
  onboardingCompletedAt: "2026-05-01T00:00:00.000Z",
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

describe("PlanSwitcher billing transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCreateCheckoutSession).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({
        subscriptionId: "rzp_sub_123",
        shortUrl: "https://rzp.io/i/sub_123",
        razorpayKeyId: "rzp_test_key",
        planId: "PRO",
      }),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateCheckoutSession>);
    vi.mocked(useSwitchPlan).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(subscription({ userPlan: "PRO" })),
      isPending: false,
    } as unknown as ReturnType<typeof useSwitchPlan>);
    vi.mocked(useCancelSubscription).mockReturnValue({
      mutateAsync: vi
        .fn()
        .mockResolvedValue(
          subscription({ userPlan: "PRO", cancelAtPeriodEnd: true }),
        ),
      isPending: false,
    } as unknown as ReturnType<typeof useCancelSubscription>);
    vi.mocked(useCurrentUser).mockReturnValue({
      data: currentUser,
    } as unknown as ReturnType<typeof useCurrentUser>);
    vi.mocked(openSubscriptionCheckout).mockResolvedValue(undefined);
  });

  it("opens Razorpay Checkout when moving from FREE to a paid plan", async () => {
    vi.mocked(useSubscription).mockReturnValue(
      subscriptionQuery("FREE") as unknown as ReturnType<
        typeof useSubscription
      >,
    );

    render(<PlanSwitcher />, { wrapper });

    await userEvent.click(
      screen.getByRole("button", { name: "Switch to Pro" }),
    );
    expect(
      await screen.findByText(/redirected to Razorpay Checkout/i),
    ).toBeTruthy();

    await userEvent.click(
      screen.getByRole("button", { name: "Continue to Razorpay" }),
    );

    await waitFor(() =>
      expect(useCreateCheckoutSession().mutateAsync).toHaveBeenCalledWith(
        "PRO",
      ),
    );
    expect(openSubscriptionCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: "rzp_sub_123",
        razorpayKeyId: "rzp_test_key",
        shortUrl: "https://rzp.io/i/sub_123",
        prefill: {
          name: "Ada Lovelace",
          email: "ada@example.com",
        },
      }),
    );
    expect(useSwitchPlan().mutateAsync).not.toHaveBeenCalled();
    expect(useCancelSubscription().mutateAsync).not.toHaveBeenCalled();
  });

  it("schedules a plan switch without loading Razorpay when moving between paid plans", async () => {
    vi.mocked(useSubscription).mockReturnValue(
      subscriptionQuery("PRO") as unknown as ReturnType<typeof useSubscription>,
    );

    render(<PlanSwitcher />, { wrapper });

    await userEvent.click(
      screen.getByRole("button", { name: "Switch to Business" }),
    );
    expect(await screen.findByText(/No charge today/i)).toBeTruthy();

    await userEvent.click(
      screen.getByRole("button", { name: "Schedule plan switch" }),
    );

    await waitFor(() =>
      expect(useSwitchPlan().mutateAsync).toHaveBeenCalledWith("BUSINESS"),
    );
    expect(openSubscriptionCheckout).not.toHaveBeenCalled();
    expect(useCreateCheckoutSession().mutateAsync).not.toHaveBeenCalled();
  });

  it("cancels the subscription when moving from a paid plan to FREE", async () => {
    vi.mocked(useSubscription).mockReturnValue(
      subscriptionQuery("PRO") as unknown as ReturnType<typeof useSubscription>,
    );

    render(<PlanSwitcher />, { wrapper });

    await userEvent.click(
      screen.getByRole("button", { name: "Cancel subscription" }),
    );
    expect(await screen.findByText(/will cancel at the end/i)).toBeTruthy();

    await userEvent.click(
      screen.getAllByRole("button", { name: "Cancel subscription" }).at(-1)!,
    );

    await waitFor(() =>
      expect(useCancelSubscription().mutateAsync).toHaveBeenCalledWith(),
    );
    expect(useSwitchPlan().mutateAsync).not.toHaveBeenCalled();
    expect(openSubscriptionCheckout).not.toHaveBeenCalled();
    expect(billingQueryKeys.subscription).toEqual(["account", "subscription"]);
  });

  it("offers no plan transition when the subscription request fails", async () => {
    vi.mocked(useSubscription).mockReturnValue(
      failedSubscriptionQuery() as unknown as ReturnType<
        typeof useSubscription
      >,
    );

    render(<PlanSwitcher />, { wrapper });

    expect(screen.getByText("Couldn't load the plan catalogue")).toBeTruthy();
    // Without the current plan there is no knowable transition, so no tile
    // offers one.
    expect(screen.queryByRole("button", { name: "Switch to Pro" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Cancel subscription" }),
    ).toBeNull();
  });

  it("refuses a second cancel once one is already scheduled, and says why", async () => {
    vi.mocked(useSubscription).mockReturnValue(
      scheduledCancelQuery() as unknown as ReturnType<typeof useSubscription>,
    );

    render(<PlanSwitcher />, { wrapper });

    const cancel = screen.getByRole("button", { name: "Cancel subscription" });
    // The API sets `cancelAtPeriodEnd` on cancel *and* on a paid → paid switch,
    // and refuses the second call either way.
    expect(cancel.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/Cancellation is already scheduled/i)).toBeTruthy();

    await userEvent.click(cancel);
    expect(useCancelSubscription().mutateAsync).not.toHaveBeenCalled();

    // A switch between paid plans is still a request the API accepts.
    expect(
      screen
        .getByRole("button", { name: "Switch to Business" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });
});
