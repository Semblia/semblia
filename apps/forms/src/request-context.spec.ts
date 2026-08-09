import { describe, expect, it } from "vitest";
import type { FormsRuntimeEnv } from "./env.js";
import {
  assertFormSlug,
  normalizeOrigin,
  resolveRequestContext,
  resolveRuntimeHost,
} from "./request-context.js";

const env: FormsRuntimeEnv = {
  FORMS_RUNTIME_MODE: "api",
  FORMS_RUNTIME_API_BASE_URL: "https://api.semblia.test/v2",
  FORMS_RUNTIME_SIGNING_SECRET: "s".repeat(32),
  FORMS_RUNTIME_PUBLIC_BASE_DOMAIN: "forms.semblia.test",
  FORMS_RUNTIME_PROJECT_ID: "project_default",
  FORMS_RUNTIME_PROJECT_ID_BY_HOST: {
    "forms.customer.example": "project_from_host",
  },
  FORMS_RUNTIME_UPLOAD_CONNECT_SRC: "https:",
  FORMS_RUNTIME_API_TIMEOUT_MS: 5000,
  FORMS_RUNTIME_EDGE_RATE_WINDOW_MS: 60_000,
  PORT: 3007,
};

describe("resolveRequestContext", () => {
  it("ignores project bridges for API wildcard requests", () => {
    const url = new URL(
      "https://acme.forms.semblia.test/f/customer-feedback?projectId=project_query",
    );

    expect(
      resolveRequestContext({
        env,
        host: "acme.forms.semblia.test",
        origin: "https://acme.forms.semblia.test/path",
        slug: "customer-feedback",
        url,
        surface: "hosted",
        method: "GET",
      }),
    ).toEqual({
      host: "acme.forms.semblia.test",
      origin: "https://acme.forms.semblia.test",
      routing: {
        kind: "hostname",
        hostname: "acme.forms.semblia.test",
      },
      slug: "customer-feedback",
      path: "/f/customer-feedback",
      surface: "hosted",
    });
  });

  it.each([
    "deep.acme.forms.semblia.test",
    "forms.customer.example",
    "acme.forms.semblia.test.attacker.example",
  ])("rejects non-one-label wildcard host %s", (host) => {
    expect(() =>
      resolveRequestContext({
        env,
        host,
        slug: "customer-feedback",
        url: new URL(`https://${host}/f/customer-feedback`),
        surface: "hosted",
        method: "GET",
      }),
    ).toThrow();
  });

  it("allows an explicit project only on the configured exact legacy host", () => {
    const legacyUrl = new URL(
      "https://forms.semblia.test/f/customer-feedback?projectId=project_legacy",
    );

    expect(
      resolveRequestContext({
        env,
        host: "forms.semblia.test",
        slug: "customer-feedback",
        url: legacyUrl,
        surface: "hosted",
        method: "GET",
      }).routing,
    ).toEqual({
      kind: "legacy-project",
      hostname: "forms.semblia.test",
      projectId: "project_legacy",
    });
  });

  it.each([
    { path: "/f/customer-feedback", surface: "hosted" as const, method: "POST" as const },
    { path: "/embed/customer-feedback", surface: "embed" as const, method: "POST" as const },
    { path: "/f/customer-feedback/unapproved", surface: "proxy" as const, method: "POST" as const },
  ])("rejects unsupported exact-host operation $method $path", ({ path, surface, method }) => {
    expect(() =>
      resolveRequestContext({
        env,
        host: "forms.semblia.test",
        slug: "customer-feedback",
        url: new URL(`https://forms.semblia.test${path}?projectId=project_legacy`),
        surface,
        method,
      }),
    ).toThrow("Invalid legacy runtime request");
  });

  it("rejects the exact host without an explicit API project", () => {
    expect(() =>
      resolveRequestContext({
        env,
        host: "forms.semblia.test",
        slug: "customer-feedback",
        url: new URL("https://forms.semblia.test/f/customer-feedback"),
        surface: "hosted",
        method: "GET",
      }),
    ).toThrow("Invalid legacy runtime request");
  });

  it("normalizes direct context hosts", () => {
    const context = resolveRequestContext({
      env,
      host: "Acme.Forms.Semblia.Test.",
      slug: "customer-feedback",
      url: new URL("https://acme.forms.semblia.test/f/customer-feedback"),
      surface: "hosted",
      method: "GET",
    });
    expect(context.host).toBe("acme.forms.semblia.test");
    expect(context.routing).toEqual({ kind: "hostname", hostname: "acme.forms.semblia.test" });
  });

  it("rejects invalid form slugs", () => {
    expect(() => assertFormSlug("Bad Slug")).toThrow("Invalid form slug");
    expect(assertFormSlug("customer-feedback")).toBe("customer-feedback");
  });

  it("normalizes origins and resolves the CloudFront original host", () => {
    expect(normalizeOrigin("https://customer.example/path?q=1")).toBe(
      "https://customer.example",
    );
    expect(
      resolveRuntimeHost({
        originalHost: "Forms.Customer.Example",
        headerHost: "lambda-url.example",
        url: new URL("https://lambda-url.example/f/customer-feedback"),
        env,
      }),
    ).toBe("forms.customer.example");
  });
});
