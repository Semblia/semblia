import { describe, expect, it } from "vitest";
import { humanizeLabel } from "@/lib/format";

describe("humanizeLabel", () => {
  it("title-cases dotted identifiers", () => {
    expect(humanizeLabel("member.invite.sent")).toBe("Member Invite Sent");
  });

  it("preserves acronyms instead of title-casing them", () => {
    expect(humanizeLabel("export.csv.requested")).toBe("Export CSV Requested");
    expect(humanizeLabel("api_key.created")).toBe("API Key Created");
    expect(humanizeLabel("webhook.url.updated")).toBe("Webhook URL Updated");
  });

  it("applies fixed mixed-case brand spellings", () => {
    expect(humanizeLabel("github.connected")).toBe("GitHub Connected");
    expect(humanizeLabel("oauth.token.refreshed")).toBe(
      "OAuth Token Refreshed",
    );
  });

  it("handles underscores, dashes, and extra whitespace", () => {
    expect(humanizeLabel("outbound-webhook__revoked")).toBe(
      "Outbound Webhook Revoked",
    );
  });
});
