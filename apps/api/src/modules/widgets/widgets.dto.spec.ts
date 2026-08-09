import { describe, expect, it } from "vitest";
import {
  createWidgetBodySchema,
  normalizeWallSlugValue,
  updateWidgetBodySchema,
  wallSlugParamsSchema,
} from "./widgets.dto.js";

describe("createWidgetBodySchema", () => {
  it("applies conservative defaults to lower-case widget input", () => {
    const result = createWidgetBodySchema.parse({
      kind: "wall",
      layout: "grid",
      theme: "dark",
    });

    expect(result).toMatchObject({
      name: "Untitled widget",
      kind: "wall",
      layout: "grid",
      theme: "dark",
      preset: "clean",
      accent: "#0f172a",
      text: "#0a0a0b",
      bg: "#ffffff",
      line: "#e5e7eb",
      surface: "#f7f7f8",
      radius: 12,
      fontFamily: '"Geist", system-ui, sans-serif',
      fontHead: '"Geist", system-ui, sans-serif',
      cardStyle: "bordered",
      density: "default",
      showRating: true,
      showAvatar: true,
      showCompany: true,
      showDate: false,
      showSource: false,
      maxItems: 9,
      autoRotate: true,
      rotateInterval: 5000,
      showBranding: true,
      contentMode: "all",
      pickedIds: [],
      isActive: true,
    });
  });

  it("rejects an explicitly reserved wall slug", () => {
    expect(() =>
      createWidgetBodySchema.parse({
        wallSlug: "Admin",
      }),
    ).toThrow(/reserved/i);
  });
});

describe("updateWidgetBodySchema", () => {
  it("rejects an empty update body", () => {
    expect(() => updateWidgetBodySchema.parse({})).toThrow(/empty/i);
  });
});

describe("wall slug helpers", () => {
  it("normalizes wall slug input", () => {
    expect(normalizeWallSlugValue("  Hello World!!  ")).toBe("hello-world");
    expect(
      wallSlugParamsSchema.parse({ wallSlug: "  Mixed Case Wall  " }),
    ).toEqual({ wallSlug: "mixed-case-wall" });
  });
});
