import { afterEach, describe, expect, it, vi } from "vitest";

// The /design showcase is an internal engineering reference. The gate is a
// runtime NODE_ENV branch, so it needs a runtime assertion — typecheck and
// build cannot prove a production request 404s.
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/app/design/design-content", () => ({
  DesignSystemContent: () => null,
}));

describe("/design production gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // Order matters: the module graph (including React's JSX runtime) must be
  // imported under the default test env. The production case then only
  // exercises the notFound() throw, which happens before any JSX is created.
  it("renders outside production", async () => {
    const { default: DesignPage } = await import("@/app/design/page");
    expect(() => DesignPage()).not.toThrow();
  });

  it("404s in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { default: DesignPage } = await import("@/app/design/page");
    expect(() => DesignPage()).toThrow("NEXT_NOT_FOUND");
  });
});
