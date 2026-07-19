import { describe, expect, it } from "vitest";
import {
  allowedOriginSchema,
  createProjectBodySchema,
  replaceAllowedOriginsBodySchema,
  updateProjectBodySchema,
} from "./projects.dto.js";

describe("allowedOriginSchema", () => {
  it("accepts exact https origins", () => {
    expect(allowedOriginSchema.parse("https://example.com")).toBe(
      "https://example.com",
    );
  });

  it("accepts localhost http origins outside production", () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    expect(allowedOriginSchema.parse("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );

    process.env.NODE_ENV = previous;
  });

  it("rejects non-localhost http origins", () => {
    expect(() => allowedOriginSchema.parse("http://foo.com")).toThrow();
  });

  it("rejects trailing slashes", () => {
    expect(() => allowedOriginSchema.parse("https://example.com/")).toThrow();
    expect(() => allowedOriginSchema.parse("http://localhost:3000/")).toThrow();
  });

  it("rejects paths", () => {
    expect(() =>
      allowedOriginSchema.parse("https://example.com/foo"),
    ).toThrow();
  });

  it("rejects query strings", () => {
    expect(() =>
      allowedOriginSchema.parse("https://example.com?q=1"),
    ).toThrow();
  });

  it("rejects fragments", () => {
    expect(() => allowedOriginSchema.parse("https://example.com#x")).toThrow();
  });

  it("rejects more than 50 origins", () => {
    const origins = Array.from(
      { length: 51 },
      (_, index) => `https://example${index}.com`,
    );

    expect(() => replaceAllowedOriginsBodySchema.parse({ origins })).toThrow();
  });
});

describe("project slug schemas", () => {
  it("rejects an invalid or reserved initial free-host label", () => {
    expect(() =>
      createProjectBodySchema.parse({ name: "Acme", slug: "www" }),
    ).toThrow(/host/i);
    expect(() =>
      createProjectBodySchema.parse({ name: "Acme", slug: "Acme" }),
    ).toThrow(/host/i);
  });

  it("allows a mutable dashboard route slug without applying free-host reservations", () => {
    expect(updateProjectBodySchema.parse({ slug: "www" })).toMatchObject({
      slug: "www",
    });
  });
});
