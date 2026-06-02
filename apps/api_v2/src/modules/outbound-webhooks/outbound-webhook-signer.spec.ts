import { describe, expect, it } from "vitest";
import {
  buildOutboundWebhookHeaders,
  signOutboundWebhookBody,
} from "./outbound-webhook-signer.js";

describe("outbound webhook signer", () => {
  it("signs timestamp and raw body with deterministic HMAC headers", () => {
    const timestamp = "2026-05-08T12:00:00.000Z";
    const rawBody = JSON.stringify({ event: "submission.moderated" });
    const secret = "whsec_test_secret";

    expect(signOutboundWebhookBody({ timestamp, rawBody, secret })).toBe(
      "22582da46e9d636e5b06c54db9a1f9c8684e4b91eeb4ea6a13826478188b5cf8",
    );

    expect(
      buildOutboundWebhookHeaders({
        eventType: "submission.moderated",
        deliveryId: "del_123",
        timestamp,
        rawBody,
        secret,
      }),
    ).toEqual({
      "Content-Type": "application/json",
      "X-Tresta-Event": "submission.moderated",
      "X-Tresta-Delivery": "del_123",
      "X-Tresta-Timestamp": timestamp,
      "X-Tresta-Signature":
        "v1=22582da46e9d636e5b06c54db9a1f9c8684e4b91eeb4ea6a13826478188b5cf8",
    });
  });
});
