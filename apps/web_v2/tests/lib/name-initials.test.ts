import { describe, expect, it } from "vitest";
import { nameInitials } from "@/lib/format";

describe("nameInitials", () => {
  it("takes the first letter of the first two words, uppercased", () => {
    expect(nameInitials("Ada Lovelace")).toBe("AL");
    expect(nameInitials("grace hopper the third")).toBe("GH");
    expect(nameInitials("cher")).toBe("C");
  });

  it("collapses extra and leading whitespace", () => {
    expect(nameInitials("  John   Smith ")).toBe("JS");
  });

  it("returns the fallback for empty or blank names", () => {
    expect(nameInitials(null, "?")).toBe("?");
    expect(nameInitials("   ", "?")).toBe("?");
    expect(nameInitials(undefined)).toBe("");
  });
});
