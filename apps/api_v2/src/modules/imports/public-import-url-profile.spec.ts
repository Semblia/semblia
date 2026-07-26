import { describe, expect, it } from "vitest";

import {
  canonicalizePublicImportSourceUrl,
  publicImportSourceIdentityHash,
} from "./public-import-url-profile.js";

describe("public import URL profile", () => {
  it("canonicalizes a trailing-dot hostname for source identity", () => {
    const sourceKey = "google-play";
    expect(
      canonicalizePublicImportSourceUrl(
        "https://play.google.com./store/apps/details?id=com.example.app",
        sourceKey,
      ).toString(),
    ).toBe("https://play.google.com/store/apps/details?id=com.example.app");
    expect(
      publicImportSourceIdentityHash(
        "https://play.google.com./store/apps/details?id=com.example.app",
        sourceKey,
      ),
    ).toBe(
      publicImportSourceIdentityHash(
        "https://play.google.com/store/apps/details?id=com.example.app",
        sourceKey,
      ),
    );
  });

  it("orders retained parameters by deterministic code-unit order", () => {
    expect(
      canonicalizePublicImportSourceUrl(
        "https://example.com/posts?order=a&orderby=A&order=Z",
        "wordpress",
      ).toString(),
    ).toBe("https://example.com/posts?order=Z&order=a&orderby=A");
  });
});
