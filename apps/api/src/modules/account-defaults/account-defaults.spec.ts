import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACCOUNT_FORM_CONFIG,
  parseAccountDefaults,
} from "./account-defaults.service.js";

// The user-facing `/v2/account/defaults` read/write surface was removed on
// 2026-06-13 (project defaults are platform-governed). Only the canonical
// default-value derivation remains.

describe("parseAccountDefaults", () => {
  it("returns null groups when there is no persisted shape", () => {
    expect(parseAccountDefaults(null)).toEqual({
      form: null,
      moderation: null,
      visibilityAccess: null,
      brand: null,
    });
    expect(parseAccountDefaults(undefined)).toEqual({
      form: null,
      moderation: null,
      visibilityAccess: null,
      brand: null,
    });
    expect(parseAccountDefaults("not-an-object")).toEqual({
      form: null,
      moderation: null,
      visibilityAccess: null,
      brand: null,
    });
  });

  it("validates and preserves a persisted defaults shape", () => {
    const parsed = parseAccountDefaults({
      form: DEFAULT_ACCOUNT_FORM_CONFIG,
      moderation: {
        autoModeration: true,
        autoApproveVerified: false,
        profanityFilterLevel: "MODERATE",
      },
      visibilityAccess: { visibility: "PRIVATE", isActive: true },
      brand: { brandColorPrimary: "#111111", brandColorSecondary: null },
    });

    expect(parsed.form).toEqual(DEFAULT_ACCOUNT_FORM_CONFIG);
    expect(parsed.moderation?.profanityFilterLevel).toBe("MODERATE");
    expect(parsed.visibilityAccess?.visibility).toBe("PRIVATE");
    expect(parsed.brand?.brandColorPrimary).toBe("#111111");
  });
});
