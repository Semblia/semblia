import { beforeEach, describe, expect, it, vi } from "vitest";
import type { V2SendResponseThankYouResultDTO } from "@workspace/types";

// `toast` is a callable function with `.success` / `.error` / `.warning`
// attached — a plain `{ success: vi.fn() }` mock (the pattern elsewhere in
// this suite) can't stand in for the bare `toast(...)` call the "queued"
// branch uses.
const { toastFn } = vi.hoisted(() => {
  const fn = vi.fn() as unknown as ((message: string) => void) & {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
  };
  fn.success = vi.fn();
  fn.error = vi.fn();
  fn.warning = vi.fn();
  return { toastFn: fn };
});

vi.mock("sonner", () => ({ toast: toastFn }));

import { announceThankYouResult } from "@/components/responses/thank-you-dialog";

function result(
  overrides: Partial<V2SendResponseThankYouResultDTO> = {},
): V2SendResponseThankYouResultDTO {
  return {
    sentTo: "rowan@meridianlabs.test",
    kind: "DEFAULT",
    delivery: { status: "SENT", suppressionReason: null, sentAt: null },
    ...overrides,
  };
}

beforeEach(() => {
  toastFn.mockClear();
  toastFn.success.mockClear();
  toastFn.error.mockClear();
  toastFn.warning.mockClear();
});

describe("announceThankYouResult", () => {
  it("says sent, in the success tone, once the provider accepts it", () => {
    announceThankYouResult(
      result({
        delivery: { status: "SENT", suppressionReason: null, sentAt: null },
      }),
    );
    expect(toastFn.success).toHaveBeenCalledWith(
      "Thank-you sent to rowan@meridianlabs.test",
    );
    expect(toastFn.error).not.toHaveBeenCalled();
    expect(toastFn.warning).not.toHaveBeenCalled();
  });

  it.each(["PENDING", "ENQUEUED", "SENDING"] as const)(
    "says queued, in a neutral tone, while delivery is %s — never sent",
    (status) => {
      announceThankYouResult(
        result({ delivery: { status, suppressionReason: null, sentAt: null } }),
      );
      expect(toastFn).toHaveBeenCalledWith(
        "Thank-you queued for rowan@meridianlabs.test",
      );
      expect(toastFn.success).not.toHaveBeenCalled();
    },
  );

  it("warns that delivery is off, without claiming the email was sent", () => {
    announceThankYouResult(
      result({
        delivery: {
          status: "SUPPRESSED",
          suppressionReason: "DELIVERY_DISABLED",
          sentAt: null,
        },
      }),
    );
    expect(toastFn.warning).toHaveBeenCalledWith(
      "Recorded for rowan@meridianlabs.test — email delivery is currently off, so nothing was sent.",
    );
    expect(toastFn.success).not.toHaveBeenCalled();
  });

  it("warns that the recipient unsubscribed, without claiming the email was sent", () => {
    announceThankYouResult(
      result({
        delivery: {
          status: "SUPPRESSED",
          suppressionReason: "RECIPIENT_SUPPRESSED",
          sentAt: null,
        },
      }),
    );
    expect(toastFn.warning).toHaveBeenCalledWith(
      "rowan@meridianlabs.test has unsubscribed, so no email will be sent. The thank-you was recorded.",
    );
    expect(toastFn.success).not.toHaveBeenCalled();
  });

  it.each(["FAILED", "EXHAUSTED"] as const)(
    "reports failure, in the error tone, when the provider reports %s",
    (status) => {
      announceThankYouResult(
        result({ delivery: { status, suppressionReason: null, sentAt: null } }),
      );
      expect(toastFn.error).toHaveBeenCalledWith(
        "Couldn't deliver the thank-you to rowan@meridianlabs.test.",
      );
      expect(toastFn.success).not.toHaveBeenCalled();
    },
  );
});
