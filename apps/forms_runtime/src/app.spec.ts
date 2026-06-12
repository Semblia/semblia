import { describe, expect, it } from "vitest";
import { createFormsRuntimeApp } from "./app.js";
import { loadEnv } from "./env.js";
import { createMockRuntimeServices } from "./mock-services.js";

describe("createFormsRuntimeApp", () => {
  const env = loadEnv({
    FORMS_RUNTIME_MODE: "mock",
    FORMS_RUNTIME_PUBLIC_BASE_DOMAIN: "collect.semblia.com",
  });

  it("serves health checks", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request("http://acme.collect.semblia.com/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("serves the loud v4 stub page in mock mode (renderer not yet implemented)", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request("http://acme.collect.semblia.com/");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");
    expect(response.headers.get("content-security-policy")).toContain(
      "default-src 'none'",
    );
    expect(response.headers.get("strict-transport-security")).toContain(
      "max-age=31536000",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(html).toContain("Acme Launchpad");
    expect(html).toContain("data-semblia-forms-v4-stub");
  });

  it("renders the mock form on localhost for local visual checks", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request("http://localhost:3007/");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("Acme Launchpad");
  });

  it("uses the CloudFront original host header when present", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request("https://lambda-url.example.com/", {
      headers: {
        host: "lambda-url.example.com",
        "x-semblia-original-host": "acme.collect.semblia.com",
      },
    });
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("Acme Launchpad");
  });

  it("locks the CSP down to zero scripts while the stub is live", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request("http://acme.collect.semblia.com/");
    const csp = response.headers.get("content-security-policy") ?? "";

    expect(csp).toContain("script-src 'none'");
    expect(csp).toContain("style-src 'unsafe-inline'");
    expect(csp).not.toContain("fonts.googleapis.com");
  });

  it("the stub ships no script tags at all", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request("http://acme.collect.semblia.com/");
    const html = await response.text();

    expect(html).not.toContain("<script");
    expect(html).toContain("SEMBLIA FORMS V4 STUB");
  });

  it("serves the embed fragment with CORS + edge caching for <semblia-form>", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request(
      "http://acme.collect.semblia.com/__embed",
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");
    // A fragment for Shadow DOM mounting, not a document.
    expect(html).not.toContain("<!doctype");
    expect(html).toContain("data-semblia-forms-v4-stub");
    expect(html).toContain("Acme Launchpad");
    expect(html).not.toContain("<script");
  });

  it("resolves form-scoped embed paths", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request(
      "http://acme.collect.semblia.com/feedback/__embed",
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("data-semblia-forms-v4-stub");
  });

  it("redirects mock submissions back to submitted state", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request(
      "http://acme.collect.semblia.com/__submit",
      {
        method: "POST",
        body: "answers%5Bcontent%5D=Great",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
      },
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/?submitted=1");
  });
});
