import { createHash } from "node:crypto";
import { FORM_RUNTIME_SCRIPT } from "@workspace/forms-core/render";
import { describe, expect, it } from "vitest";
import { createFormsRuntimeApp } from "./app.js";
import { loadEnv } from "./env.js";
import { createMockRuntimeServices } from "./mock-services.js";

const env = loadEnv({
  FORMS_RUNTIME_MODE: "mock",
  FORMS_RUNTIME_PUBLIC_BASE_DOMAIN: "collect.semblia.com",
});

const expectedScriptHash = `sha256-${createHash("sha256")
  .update(FORM_RUNTIME_SCRIPT, "utf8")
  .digest("base64")}`;

describe("createFormsRuntimeApp", () => {
  it("serves health checks", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request("http://acme.collect.semblia.com/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("renders the real v4 form page with the derived theme and fields", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request("http://acme.collect.semblia.com/");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");
    expect(response.headers.get("strict-transport-security")).toContain(
      "max-age=31536000",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    // Real form, not the stub.
    expect(html).not.toContain("data-semblia-forms-v4-stub");
    expect(html).toContain("Acme Launchpad");
    expect(html).toContain('name="answers[content]"');
    expect(html).toContain('action="/__submit"');
    // Theme comes from the publish-time derived snapshot.
    expect(html).toContain("--tf-accent:");
  });

  it("allows exactly the runtime script via a CSP sha256 hash, nothing broader", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request("http://acme.collect.semblia.com/");
    const csp = response.headers.get("content-security-policy") ?? "";

    expect(csp).toContain(`script-src '${expectedScriptHash}'`);
    expect(csp).not.toContain("'unsafe-inline'; script");
    expect(csp).toContain("style-src 'unsafe-inline'");
    expect(csp).not.toContain("script-src 'none'");
    expect(csp).not.toContain("fonts.googleapis.com");
  });

  it("renders the mock form on localhost for local visual checks", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request("http://localhost:3007/");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("Acme Launchpad");
    expect(html).toContain("<form");
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

  it("server-renders the success state on ?submitted=1 with no script", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request(
      "http://acme.collect.semblia.com/?submitted=1",
    );
    const html = await response.text();
    const csp = response.headers.get("content-security-policy") ?? "";

    expect(html).toContain("sf-success");
    expect(html).not.toContain("<form");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(csp).toContain("script-src 'none'");
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
    expect(html).toContain('part="root"');
    expect(html).toContain("Acme Launchpad");
    expect(html).toContain('name="answers[content]"');
    // The form posts cross-origin back to the collect host in embed mode.
    expect(html).toContain("/__submit?embed=1");
    // No executable script runs in a shadow root.
    expect(html).not.toContain("<script>");
  });

  it("resolves form-scoped embed paths", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request(
      "http://acme.collect.semblia.com/feedback/__embed",
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('part="root"');
    expect(html).toContain("/feedback/__submit?embed=1");
  });

  it("redirects native submissions back to the submitted state", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request(
      "http://acme.collect.semblia.com/__submit",
      {
        method: "POST",
        body: "answers%5Bcontent%5D=Great",
        headers: { "content-type": "application/x-www-form-urlencoded" },
      },
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/?submitted=1");
  });

  it("answers embed submissions with JSON + CORS instead of navigating", async () => {
    const app = createFormsRuntimeApp(env, createMockRuntimeServices());
    const response = await app.request(
      "http://acme.collect.semblia.com/__submit?embed=1",
      {
        method: "POST",
        body: "answers%5Bcontent%5D=Great",
        headers: { "content-type": "application/x-www-form-urlencoded" },
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    await expect(response.json()).resolves.toMatchObject({ ok: true });
  });
});
