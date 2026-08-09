import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

async function importCheckout() {
  vi.resetModules();
  return import("@/lib/razorpay-checkout");
}

describe("openSubscriptionCheckout", () => {
  beforeEach(() => {
    document
      .querySelectorAll(`script[src="${SCRIPT_SRC}"]`)
      .forEach((node) => node.remove());
    delete window.Razorpay;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens Razorpay Checkout with subscription fields", async () => {
    const open = vi.fn();
    const Razorpay = vi.fn(function RazorpayMock() {
      return { open };
    });
    window.Razorpay = Razorpay;

    const { openSubscriptionCheckout } = await importCheckout();
    const onDismiss = vi.fn();

    await openSubscriptionCheckout({
      subscriptionId: "rzp_sub_123",
      razorpayKeyId: "rzp_test_key",
      shortUrl: null,
      prefill: {
        name: "Ada Lovelace",
        email: "ada@example.com",
      },
      notes: {
        planId: "PRO",
      },
      onDismiss,
    });

    expect(Razorpay).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "rzp_test_key",
        subscription_id: "rzp_sub_123",
        name: "Semblia",
        description: "Subscription",
        prefill: {
          name: "Ada Lovelace",
          email: "ada@example.com",
        },
        notes: {
          planId: "PRO",
        },
        modal: {
          ondismiss: expect.any(Function),
        },
        theme: {
          color: "#0F172A",
        },
      }),
    );
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("falls back to the shortUrl when the script fails to load", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
      queueMicrotask(() => node.dispatchEvent(new Event("error")));
      return node;
    });

    const { openSubscriptionCheckout } = await importCheckout();

    await openSubscriptionCheckout({
      subscriptionId: "rzp_sub_123",
      razorpayKeyId: "rzp_test_key",
      shortUrl: "https://rzp.io/i/sub_123",
    });

    expect(assign).toHaveBeenCalledWith("https://rzp.io/i/sub_123");
  });
});
