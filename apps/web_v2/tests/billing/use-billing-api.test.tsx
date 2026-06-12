import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { billingQueryKeys, useCreateCheckoutSession } from "@/hooks/api";
import { createSubscriptionCheckout } from "@/lib/semblia-api";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/lib/semblia-api", () => ({
  createSubscriptionCheckout: vi.fn(),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("billing API hooks", () => {
  it("creates a checkout session and invalidates the subscription projection", async () => {
    const invalidateSpy = vi.spyOn(QueryClient.prototype, "invalidateQueries");
    vi.mocked(createSubscriptionCheckout).mockResolvedValueOnce({
      subscriptionId: "rzp_sub_123",
      shortUrl: "https://rzp.io/i/sub_123",
      razorpayKeyId: "rzp_test_key",
      planId: "PRO",
    });

    const { result } = renderHook(() => useCreateCheckoutSession(), {
      wrapper,
    });

    result.current.mutate("PRO");

    await waitFor(() =>
      expect(createSubscriptionCheckout).toHaveBeenCalledWith(
        "session-token",
        "PRO",
      ),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: billingQueryKeys.subscription,
    });
    invalidateSpy.mockRestore();
  });
});
