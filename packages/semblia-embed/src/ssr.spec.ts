// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ensureFormEmbed, ensureWidgetEmbed } from "./index.js";

describe("server-side rendering", () => {
  it("is a no-op without a document", () => {
    expect(() => {
      ensureWidgetEmbed();
      ensureFormEmbed();
    }).not.toThrow();
  });
});
