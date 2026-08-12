import { describe, expect, it } from "vitest";
import type { V2FormRequestRecipientDTO } from "@workspace/types";
import {
  MAX_REQUEST_RECIPIENTS,
  mergeEmailChips,
  parseEmailTokens,
  validateRequestEmail,
} from "@/components/requests/email-chips";
import { recipientStateMeta } from "@/components/requests/delivery-status";

/**
 * These pin the two pure helpers the request composer and the requests list
 * both depend on: turning pasted/typed text into deduplicated email chips,
 * and turning a recipient's delivery + submission facts into one honest
 * label — never "sent" for a suppressed or failed send, and never silence for
 * a status this build doesn't know yet.
 */

function recipient(
  overrides: Partial<V2FormRequestRecipientDTO> = {},
): V2FormRequestRecipientDTO {
  return {
    id: "recipient_1",
    email: "rowan@meridianlabs.test",
    delivery: null,
    submittedAt: null,
    responseId: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("parseEmailTokens", () => {
  it("splits on comma, semicolon, whitespace, and newlines", () => {
    expect(
      parseEmailTokens("a@x.com, b@x.com;c@x.com\nd@x.com   e@x.com"),
    ).toEqual(["a@x.com", "b@x.com", "c@x.com", "d@x.com", "e@x.com"]);
  });

  it("drops the empty tokens a trailing separator leaves behind", () => {
    expect(parseEmailTokens("  a@x.com ,, ;  b@x.com  ")).toEqual([
      "a@x.com",
      "b@x.com",
    ]);
  });

  it("returns nothing for blank input", () => {
    expect(parseEmailTokens("   ")).toEqual([]);
  });
});

describe("mergeEmailChips", () => {
  it("dedupes case-insensitively, keeping the first-seen casing", () => {
    expect(mergeEmailChips(["Rowan@x.com"], "rowan@x.com, new@x.com")).toEqual([
      "Rowan@x.com",
      "new@x.com",
    ]);
  });

  it("caps at the API's recipient limit, dropping tokens past the cap", () => {
    const existing = Array.from(
      { length: MAX_REQUEST_RECIPIENTS - 1 },
      (_, i) => `p${i}@x.com`,
    );
    const merged = mergeEmailChips(existing, "a@x.com, b@x.com");

    expect(merged).toHaveLength(MAX_REQUEST_RECIPIENTS);
    expect(merged).toContain("a@x.com");
    expect(merged).not.toContain("b@x.com");
  });

  it("keeps an invalid token as a chip instead of dropping it silently", () => {
    expect(mergeEmailChips([], "not-an-email")).toEqual(["not-an-email"]);
  });
});

describe("validateRequestEmail", () => {
  it("rejects blank and malformed addresses", () => {
    expect(validateRequestEmail("")).toBeTruthy();
    expect(validateRequestEmail("not-an-email")).toBeTruthy();
    expect(validateRequestEmail("rowan@meridianlabs")).toBeTruthy();
    expect(validateRequestEmail(`${"a".repeat(320)}@x.com`)).toBeTruthy();
  });

  it("accepts a complete address, trimmed", () => {
    expect(validateRequestEmail(" rowan@meridianlabs.test ")).toBeNull();
  });
});

describe("recipientStateMeta", () => {
  it("treats a submission as the win state regardless of delivery status", () => {
    const meta = recipientStateMeta(
      recipient({
        submittedAt: "2026-08-02T00:00:00.000Z",
        delivery: { status: "FAILED", suppressionReason: null, sentAt: null },
      }),
    );
    expect(meta).toMatchObject({
      label: "Submitted",
      tone: "positive",
      submitted: true,
    });
  });

  it("reads a null delivery as recorded, not sent", () => {
    const meta = recipientStateMeta(recipient({ delivery: null }));
    expect(meta).toMatchObject({
      label: "Recorded",
      tone: "muted",
      submitted: false,
    });
  });

  it.each(["PENDING", "ENQUEUED", "SENDING"] as const)(
    "marks %s as still moving",
    (status) => {
      const meta = recipientStateMeta(
        recipient({
          delivery: { status, suppressionReason: null, sentAt: null },
        }),
      );
      expect(meta.transitional).toBe(true);
      expect(meta.submitted).toBe(false);
    },
  );

  it("names the suppression reason honestly instead of saying 'sent'", () => {
    const unsubscribed = recipientStateMeta(
      recipient({
        delivery: {
          status: "SUPPRESSED",
          suppressionReason: "RECIPIENT_SUPPRESSED",
          sentAt: null,
        },
      }),
    );
    expect(unsubscribed.label.toLowerCase()).toContain("unsubscribed");
    expect(unsubscribed.tone).toBe("attention");

    const deliveryOff = recipientStateMeta(
      recipient({
        delivery: {
          status: "SUPPRESSED",
          suppressionReason: "DELIVERY_DISABLED",
          sentAt: null,
        },
      }),
    );
    expect(deliveryOff.label.toLowerCase()).toContain("delivery off");
  });

  it.each(["FAILED", "EXHAUSTED"] as const)(
    "reports %s as a failure, not a send",
    (status) => {
      const meta = recipientStateMeta(
        recipient({
          delivery: { status, suppressionReason: null, sentAt: null },
        }),
      );
      expect(meta.tone).toBe("critical");
      expect(meta.label.toLowerCase()).toContain("failed");
    },
  );

  it("falls back to a readable state for a status this build doesn't know", () => {
    const meta = recipientStateMeta(
      recipient({
        delivery: {
          status: "SOMETHING_NEW" as never,
          suppressionReason: null,
          sentAt: null,
        },
      }),
    );
    expect(meta.label).toBe("Recorded");
    expect(meta.tone).toBe("muted");
  });
});
