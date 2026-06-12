import { migrateFormDoc } from "@workspace/forms-core/schema";
import {
  renderFormStubFragmentHtml,
  renderFormStubPageHtml,
} from "@workspace/forms-core/render";
import { Hono } from "hono";
import type { Context } from "hono";
import { createApiRuntimeServices } from "./api-services.js";
import type { FormsRuntimeEnv } from "./env.js";
import { createMockRuntimeServices } from "./mock-services.js";
import {
  resolveRequestContext,
  toEmbeddedFormPath,
  toSubmittedFormPath,
} from "./request-context.js";
import type { FormsRuntimeServices } from "./types.js";

const maxBodyBytes = 64 * 1024;
const securityHeaders = {
  "content-security-policy": [
    "default-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' https: data:",
    // The v4 stub page carries one inline <style> block and nothing else.
    // When the preset renderers land, scripts return as CSP hashes and fonts
    // become an explicit theme opt-in.
    "style-src 'unsafe-inline'",
    "font-src 'self'",
    "script-src 'none'",
    "connect-src 'none'",
  ].join("; "),
  "permissions-policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

function applySecurityHeaders(c: Context): void {
  for (const [name, value] of Object.entries(securityHeaders)) {
    c.header(name, value);
  }
}

function isLocalDevHost(host: string): boolean {
  if (host.startsWith("[::1]")) return true;
  const hostname = host.split(":")[0]?.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function resolveRuntimeHost(
  originalHost: string | undefined,
  headerHost: string | undefined,
  url: URL,
  env: FormsRuntimeEnv,
): string {
  const host = originalHost ?? headerHost ?? url.host;
  if (env.FORMS_RUNTIME_MODE === "mock" && isLocalDevHost(host)) {
    return `demo.${env.FORMS_RUNTIME_PUBLIC_BASE_DOMAIN}`;
  }

  return host;
}

export function createFormsRuntimeApp(
  env: FormsRuntimeEnv,
  services: FormsRuntimeServices = env.FORMS_RUNTIME_MODE === "mock"
    ? createMockRuntimeServices()
    : createApiRuntimeServices(env),
) {
  const app = new Hono();

  app.use("*", async (c, next) => {
    await next();
    applySecurityHeaders(c);
  });

  app.onError((error, c) => {
    applySecurityHeaders(c);
    console.error("forms_runtime request failed", error);
    return c.text("Hosted form is temporarily unavailable", 503);
  });

  app.get("/health", (c) => c.json({ ok: true }));

  app.post("*", async (c, next) => {
    const url = new URL(c.req.url);
    const host = resolveRuntimeHost(
      c.req.header("x-semblia-original-host"),
      c.req.header("host"),
      url,
      env,
    );
    if (!url.pathname.endsWith("/__submit")) {
      await next();
      return;
    }

    const formPath = toSubmittedFormPath(url.pathname);
    const context = resolveRequestContext({
      host,
      url: formPath,
      baseDomain: env.FORMS_RUNTIME_PUBLIC_BASE_DOMAIN,
    });
    const body = await c.req.text();
    if (new TextEncoder().encode(body).byteLength > maxBodyBytes) {
      return c.text("Request body too large", 413);
    }

    const result = await services.submitForm({
      context,
      contentType: c.req.header("content-type") ?? "",
      body,
      metadata: {
        userAgent: c.req.header("user-agent"),
        forwardedFor: c.req.header("x-forwarded-for"),
      },
    });

    return c.redirect(result.redirectTo ?? `${formPath}?submitted=1`, 303);
  });

  // Embed fragment — fetched cross-origin by the <semblia-form> loader and
  // mounted into a Shadow DOM root on the host page. One round trip: markup,
  // styles, and (once renderers land) config travel together.
  app.get("*", async (c, next) => {
    const url = new URL(c.req.url);
    if (!url.pathname.endsWith("/__embed")) {
      await next();
      return;
    }
    const host = resolveRuntimeHost(
      c.req.header("x-semblia-original-host"),
      c.req.header("host"),
      url,
      env,
    );
    const context = resolveRequestContext({
      host,
      url: toEmbeddedFormPath(url.pathname),
      baseDomain: env.FORMS_RUNTIME_PUBLIC_BASE_DOMAIN,
    });
    const resolved = await services.resolveForm(context, {
      userAgent: c.req.header("user-agent"),
      forwardedFor: c.req.header("x-forwarded-for"),
    });
    const doc = migrateFormDoc(resolved.form.config);
    const fragment = renderFormStubFragmentHtml({
      brandName: doc.content.brandName || resolved.project.name,
    });

    return c.html(fragment, 200, {
      // Public embed surface: any site may fetch it; the edge may cache it.
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET",
      "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
      vary: "accept-encoding",
    });
  });

  app.get("*", async (c) => {
    const url = new URL(c.req.url);
    const host = resolveRuntimeHost(
      c.req.header("x-semblia-original-host"),
      c.req.header("host"),
      url,
      env,
    );
    const context = resolveRequestContext({
      host,
      url: `${url.pathname}${url.search}`,
      baseDomain: env.FORMS_RUNTIME_PUBLIC_BASE_DOMAIN,
    });
    const resolved = await services.resolveForm(context, {
      userAgent: c.req.header("user-agent"),
      forwardedFor: c.req.header("x-forwarded-for"),
    });

    // Forms v4: the preset renderers are not implemented yet, so every form
    // serves the loud rebuild stub. Config still flows through the migration
    // boundary so unmigratable rows fail here, not silently at render time.
    const doc = migrateFormDoc(resolved.form.config);
    const html = renderFormStubPageHtml({
      brandName: doc.content.brandName || resolved.project.name,
    });

    return c.html(html, 200, {
      "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
    });
  });

  app.notFound((c) => c.text("Not found", 404));

  return app;
}
