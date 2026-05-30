import { describe, expect, it } from "vitest";
import { createFormsRuntimeApp } from "./app.js";
import { loadEnv } from "./env.js";
import { createMockRuntimeServices } from "./mock-services.js";

describe("createFormsRuntimeApp", () => {
  const env = loadEnv({
    FORMS_RUNTIME_MODE: "mock",
    FORMS_RUNTIME_PUBLIC_BASE_DOMAIN: "collect.tresta.app",
  });

  it("serves health checks", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request("http://acme.collect.tresta.app/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("renders a hosted form in mock mode", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request("http://acme.collect.tresta.app/");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");
    expect(html).toContain("Acme Launchpad");
    expect(html).toContain("How was your experience?");
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
        "x-tresta-original-host": "acme.collect.tresta.app",
      },
    });
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("Acme Launchpad");
  });

  it("redirects mock submissions back to submitted state", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request(
      "http://acme.collect.tresta.app/__submit",
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
