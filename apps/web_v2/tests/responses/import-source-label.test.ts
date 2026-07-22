import { describe, expect, it } from "vitest";
import { formatImportSourceLabel } from "@/lib/imports/source-label";

describe("formatImportSourceLabel", () => {
  it.each([
    ["testimonial-to", "Testimonial.to"],
    ["google-business", "Google Business Profile"],
    ["g2", "G2"],
  ] as const)("formats the known source key %s", (source, label) => {
    expect(formatImportSourceLabel(source)).toBe(label);
  });

  it("humanizes an unknown source key deterministically", () => {
    expect(formatImportSourceLabel("new_partner-network")).toBe(
      "New Partner Network",
    );
  });

  it("uses an honest fallback when no source key is present", () => {
    expect(formatImportSourceLabel("  ")).toBe("Imported proof");
  });
});
