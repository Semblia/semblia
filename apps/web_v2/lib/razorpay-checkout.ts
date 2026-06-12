export const RAZORPAY_CHECKOUT_SCRIPT_SRC =
  "https://checkout.razorpay.com/v1/checkout.js";

let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay can only load in a browser"));
  }

  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_CHECKOUT_SCRIPT_SRC}"]`,
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => {
          scriptPromise = null;
          reject(new Error("Razorpay script failed to load"));
        },
        { once: true },
      );
      return;
    }

    const tag = document.createElement("script");
    tag.src = RAZORPAY_CHECKOUT_SCRIPT_SRC;
    tag.async = true;
    tag.onload = () => resolve();
    tag.onerror = () => {
      scriptPromise = null;
      reject(new Error("Razorpay script failed to load"));
    };
    document.head.appendChild(tag);
  });

  return scriptPromise;
}

export type OpenSubscriptionCheckoutInput = {
  subscriptionId: string;
  razorpayKeyId: string;
  shortUrl: string | null;
  prefill?: {
    name?: string;
    email?: string;
  };
  notes?: Record<string, string>;
  onDismiss?: () => void;
};

export async function openSubscriptionCheckout(
  input: OpenSubscriptionCheckoutInput,
): Promise<void> {
  try {
    await loadRazorpayScript();
  } catch (error) {
    if (input.shortUrl && typeof window !== "undefined") {
      globalThis.location.assign(input.shortUrl);
      return;
    }
    throw error;
  }

  const Razorpay = window.Razorpay;
  if (!Razorpay) {
    if (input.shortUrl) {
      globalThis.location.assign(input.shortUrl);
      return;
    }
    throw new Error("Razorpay Checkout unavailable");
  }

  const checkout = new Razorpay({
    key: input.razorpayKeyId,
    subscription_id: input.subscriptionId,
    name: "Semblia",
    description: "Subscription",
    prefill: input.prefill,
    notes: input.notes,
    modal: {
      ondismiss: () => input.onDismiss?.(),
    },
    theme: {
      color: "#0F172A",
    },
  });

  checkout.open();
}
