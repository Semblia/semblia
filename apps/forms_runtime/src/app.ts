import { readFile } from "node:fs/promises";
import { Hono } from "hono";
import type { Context } from "hono";
import type { PublicSnapshot } from "@workspace/forms-core";
import { buildFormStylesheet } from "@workspace/forms-renderer";
import {
  renderFormToStaticMarkup,
  renderFormToString,
} from "@workspace/forms-renderer/server";
import { createApiRuntimeServices } from "./api-services.js";
import type { FormsRuntimeEnv } from "./env.js";
import { createMockRuntimeServices } from "./mock-services.js";
import {
  normalizeOrigin,
  resolveRequestContext,
  resolveRuntimeHost,
} from "./request-context.js";
import type {
  FormsRuntimeServices,
  RuntimeForwardMetadata,
  RuntimeRequestContext,
} from "./types.js";

type RuntimeVariables = {
  securityHeaders?: Record<string, string>;
};

type RuntimeContext = Context<{ Variables: RuntimeVariables }>;

const maxBodyBytes = 64 * 1024;
const maxUploadIntentBytes = 4 * 1024;
const snapshotCacheTtlMs = 60_000;
const clientAssetPath = new URL("./browser.js", import.meta.url);
const fallbackClientScript =
  "console.warn('Semblia forms runtime client asset is unavailable');\n";

const phase8Placeholder = `// TODO(Phase 8): packages/forms-embed is intentionally absent during the forms rebuild.
// This placeholder preserves the public script URL and correct content type.
console.warn("Semblia forms embed loader is being rebuilt in Phase 8.");
`;

type CacheEntry = {
  snapshot: PublicSnapshot;
  expiresAt: number;
};

type RateEntry = {
  count: number;
  resetAt: number;
};

let clientAssetCache: string | null = null;

function getHeader(c: RuntimeContext, name: string): string | undefined {
  return c.req.header(name) ?? c.req.header(name.toLowerCase());
}

function clientIp(c: RuntimeContext): string {
  const forwarded =
    getHeader(c, "x-semblia-original-forwarded-for") ??
    getHeader(c, "x-forwarded-for");
  return forwarded?.split(",")[0]?.trim().slice(0, 45) || "unknown";
}

function readForwardMetadata(c: RuntimeContext): RuntimeForwardMetadata {
  return {
    origin: normalizeOrigin(getHeader(c, "origin")) ?? undefined,
    userAgent:
      getHeader(c, "x-semblia-original-user-agent") ?? getHeader(c, "user-agent"),
    forwardedFor:
      getHeader(c, "x-semblia-original-forwarded-for") ??
      getHeader(c, "x-forwarded-for"),
    idempotencyKey: getHeader(c, "idempotency-key"),
    signature: getHeader(c, "x-semblia-signature"),
    timestamp: getHeader(c, "x-semblia-timestamp"),
  };
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function jsonForHtml(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function buildSecurityHeaders(input: {
  surface: "hosted" | "embed" | "script" | "plain";
  snapshot?: PublicSnapshot;
  connectSrc?: string;
}): Record<string, string> {
  const frameAncestors =
    input.surface === "embed"
      ? frameAncestorsFor(input.snapshot)
      : "frame-ancestors 'none'";
  const scriptSrc =
    input.surface === "hosted"
      ? "script-src 'self'"
      : "script-src 'none'";
  const connectSrc =
    input.surface === "hosted"
      ? `connect-src 'self'${input.connectSrc ? ` ${input.connectSrc}` : ""}`
      : "connect-src 'none'";

  return {
    "content-security-policy": [
      "default-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      frameAncestors,
      "img-src 'self' https: data:",
      "style-src 'unsafe-inline'",
      "font-src 'self' data:",
      scriptSrc,
      connectSrc,
    ].join("; "),
    "permissions-policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "x-content-type-options": "nosniff",
    ...(input.surface === "hosted" || input.surface === "plain"
      ? { "x-frame-options": "DENY" }
      : {}),
  };
}

function frameAncestorsFor(snapshot: PublicSnapshot | undefined): string {
  const origins = snapshot?.security.allowedOrigins ?? [];
  if (origins.length === 0) return "frame-ancestors 'none'";
  return `frame-ancestors ${origins.join(" ")}`;
}

function applyHeaders(c: RuntimeContext, headers: Record<string, string>) {
  for (const [name, value] of Object.entries(headers)) {
    c.header(name, value);
  }
}

function setRouteSecurity(c: RuntimeContext, headers: Record<string, string>) {
  c.set("securityHeaders", headers);
}

function allowedOriginForEmbed(snapshot: PublicSnapshot, origin: string | undefined) {
  if (!snapshot.security.embedAllowed) return false;
  if (!origin) return true;
  return snapshot.security.allowedOrigins.includes(origin);
}

function edgeRateLimit(input: {
  c: RuntimeContext;
  key: string;
  limit: number;
  windowMs: number;
  buckets: Map<string, RateEntry>;
}): Response | null {
  const now = Date.now();
  const entry = input.buckets.get(input.key);
  if (!entry || entry.resetAt <= now) {
    input.buckets.set(input.key, { count: 1, resetAt: now + input.windowMs });
    return null;
  }
  entry.count += 1;
  if (entry.count <= input.limit) return null;

  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  input.c.header("retry-after", String(retryAfter));
  return input.c.text("Too many requests", 429);
}

async function readRequestBody(c: RuntimeContext, maxBytes: number) {
  const raw = await c.req.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    return { error: c.text("Request body too large", 413) };
  }
  return { raw };
}

function normalizePresignBody(raw: string, signed: boolean): string | null {
  if (signed) return raw;
  try {
    const parsed = JSON.parse(raw || "{}") as Record<string, unknown>;
    return JSON.stringify({
      purpose: "SUBMISSION_ATTACHMENT",
      ...parsed,
    });
  } catch {
    return null;
  }
}

function renderUnavailableDocument(message: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Form unavailable</title>
    <style>
      html, body { margin: 0; min-height: 100%; font-family: Inter, system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
      body { display: grid; place-items: center; padding: 32px; }
      main { max-width: 420px; text-align: center; }
      h1 { font-size: 1.35rem; margin: 0 0 8px; }
      p { color: #475569; line-height: 1.6; margin: 0; }
    </style>
  </head>
  <body>
    <main>
      <h1>Form unavailable</h1>
      <p>${htmlEscape(message)}</p>
    </main>
  </body>
</html>`;
}

function routeUrl(path: string, context: RuntimeRequestContext) {
  const search = new URLSearchParams({ projectId: context.projectId });
  return `${path}?${search.toString()}`;
}

function renderHostedDocument(snapshot: PublicSnapshot, context: RuntimeRequestContext) {
  const markup = renderFormToString(snapshot);
  const stylesheet = buildFormStylesheet(snapshot);
  const submitUrl = routeUrl(`/f/${encodeURIComponent(context.slug)}/submissions`, context);
  const presignUrl = routeUrl(`/f/${encodeURIComponent(context.slug)}/uploads/presign`, context);
  const title = snapshot.content.title || "Semblia form";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${htmlEscape(title)}</title>
    <style>
      html, body, #semblia-form-root { margin: 0; min-height: 100%; }
      body { background: var(--tf-bg, #ffffff); }
      ${stylesheet}
    </style>
  </head>
  <body>
    <div id="semblia-form-root" data-submit-url="${htmlEscape(submitUrl)}" data-presign-url="${htmlEscape(presignUrl)}">${markup}</div>
    <script id="semblia-form-snapshot" type="application/json">${jsonForHtml(snapshot)}</script>
    <script type="module" src="/forms-runtime-client.js"></script>
  </body>
</html>`;
}

function renderEmbedFragment(snapshot: PublicSnapshot) {
  return renderFormToStaticMarkup(snapshot);
}

async function loadClientAsset() {
  if (clientAssetCache !== null) return clientAssetCache;
  try {
    clientAssetCache = await readFile(clientAssetPath, "utf8");
  } catch {
    clientAssetCache = fallbackClientScript;
  }
  return clientAssetCache;
}

async function cachedSnapshot(
  services: FormsRuntimeServices,
  context: RuntimeRequestContext,
  metadata: RuntimeForwardMetadata,
  cache: Map<string, CacheEntry>,
) {
  const key = `${context.projectId}:${context.slug}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.snapshot;

  const snapshot = await services.getSnapshotBySlug(context, metadata);
  cache.set(key, { snapshot, expiresAt: now + snapshotCacheTtlMs });
  return snapshot;
}

export function createFormsRuntimeApp(
  env: FormsRuntimeEnv,
  services: FormsRuntimeServices = env.FORMS_RUNTIME_MODE === "mock"
    ? createMockRuntimeServices()
    : createApiRuntimeServices(env),
) {
  const app = new Hono<{ Variables: RuntimeVariables }>();
  const snapshotCache = new Map<string, CacheEntry>();
  const rateBuckets = new Map<string, RateEntry>();

  app.use("*", async (c, next) => {
    await next();
    applyHeaders(
      c,
      c.get("securityHeaders") ?? buildSecurityHeaders({ surface: "plain" }),
    );
  });

  app.onError((error, c) => {
    console.error("forms_runtime request failed", error);
    setRouteSecurity(c, buildSecurityHeaders({ surface: "plain" }));
    return c.html(renderUnavailableDocument("The form could not be loaded."), 503);
  });

  app.get("/health", (c) => c.json({ ok: true }));

  app.get("/forms-runtime-client.js", async (c) => {
    setRouteSecurity(c, buildSecurityHeaders({ surface: "script" }));
    return c.text(await loadClientAsset(), 200, {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=300",
    });
  });

  app.get("/embed.js", (c) => {
    setRouteSecurity(c, buildSecurityHeaders({ surface: "script" }));
    return c.text(phase8Placeholder, 200, {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store",
    });
  });

  app.get("/loader.js", (c) => {
    setRouteSecurity(c, buildSecurityHeaders({ surface: "script" }));
    return c.text(phase8Placeholder, 200, {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store",
    });
  });

  app.put("/__mock-upload", (c) => c.body(null, 200));

  app.get("/f/:slug", async (c) => {
    const rateLimited = edgeRateLimit({
      c,
      key: `page:${clientIp(c)}`,
      limit: 120,
      windowMs: env.FORMS_RUNTIME_EDGE_RATE_WINDOW_MS,
      buckets: rateBuckets,
    });
    if (rateLimited) return rateLimited;

    const url = new URL(c.req.url);
    const host = resolveRuntimeHost({
      originalHost: getHeader(c, "x-semblia-original-host"),
      headerHost: getHeader(c, "host"),
      url,
      env,
    });
    const context = resolveRequestContext({
      env,
      host,
      origin: getHeader(c, "origin"),
      slug: c.req.param("slug"),
      url,
      surface: "hosted",
    });
    const snapshot = await cachedSnapshot(
      services,
      context,
      readForwardMetadata(c),
      snapshotCache,
    );
    setRouteSecurity(
      c,
      buildSecurityHeaders({
        surface: "hosted",
        snapshot,
        connectSrc: snapshot.settings.uploadsAllowed
          ? env.FORMS_RUNTIME_UPLOAD_CONNECT_SRC
          : undefined,
      }),
    );

    return c.html(renderHostedDocument(snapshot, context), 200, {
      "cache-control":
        snapshot.status === "published"
          ? "public, s-maxage=60, stale-while-revalidate=300"
          : "no-store",
    });
  });

  app.get("/embed/:slug", async (c) => {
    const rateLimited = edgeRateLimit({
      c,
      key: `embed:${clientIp(c)}`,
      limit: 120,
      windowMs: env.FORMS_RUNTIME_EDGE_RATE_WINDOW_MS,
      buckets: rateBuckets,
    });
    if (rateLimited) return rateLimited;

    const url = new URL(c.req.url);
    const host = resolveRuntimeHost({
      originalHost: getHeader(c, "x-semblia-original-host"),
      headerHost: getHeader(c, "host"),
      url,
      env,
    });
    const context = resolveRequestContext({
      env,
      host,
      origin: getHeader(c, "origin"),
      slug: c.req.param("slug"),
      url,
      surface: "embed",
    });
    const metadata = readForwardMetadata(c);
    const snapshot = await cachedSnapshot(
      services,
      context,
      metadata,
      snapshotCache,
    );
    const origin = metadata.origin;
    setRouteSecurity(c, buildSecurityHeaders({ surface: "embed", snapshot }));

    if (!allowedOriginForEmbed(snapshot, origin)) {
      return c.text("Embed origin is not authorized", 403);
    }

    const headers: Record<string, string> = {
      "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
      vary: "origin, accept-encoding",
    };
    if (origin) headers["access-control-allow-origin"] = origin;
    return c.html(renderEmbedFragment(snapshot), 200, headers);
  });

  app.post("/f/:slug/submissions", async (c) => {
    const metadata = readForwardMetadata(c);
    const rateLimited = edgeRateLimit({
      c,
      key: `submit:browser:${clientIp(c)}:${c.req.param("slug")}`,
      limit: 10,
      windowMs: env.FORMS_RUNTIME_EDGE_RATE_WINDOW_MS,
      buckets: rateBuckets,
    });
    if (rateLimited) return rateLimited;

    const body = await readRequestBody(c, maxBodyBytes);
    if (body.error) return body.error;
    const url = new URL(c.req.url);
    const host = resolveRuntimeHost({
      originalHost: getHeader(c, "x-semblia-original-host"),
      headerHost: getHeader(c, "host"),
      url,
      env,
    });
    const context = resolveRequestContext({
      env,
      host,
      origin: metadata.origin,
      slug: c.req.param("slug"),
      url,
      surface: "proxy",
    });
    const result = await services.submitForm({
      context,
      rawBody: body.raw,
      metadata,
    });
    return c.json(result, 201);
  });

  app.post("/f/:slug/uploads/presign", async (c) => {
    const metadata = readForwardMetadata(c);
    const rateLimited = edgeRateLimit({
      c,
      key: `presign:browser:${clientIp(c)}:${c.req.param("slug")}`,
      limit: 20,
      windowMs: env.FORMS_RUNTIME_EDGE_RATE_WINDOW_MS,
      buckets: rateBuckets,
    });
    if (rateLimited) return rateLimited;

    const body = await readRequestBody(c, maxUploadIntentBytes);
    if (body.error) return body.error;
    const normalizedBody = normalizePresignBody(body.raw, false);
    if (!normalizedBody) return c.json({ error: "invalid_body" }, 400);

    const url = new URL(c.req.url);
    const host = resolveRuntimeHost({
      originalHost: getHeader(c, "x-semblia-original-host"),
      headerHost: getHeader(c, "host"),
      url,
      env,
    });
    const context = resolveRequestContext({
      env,
      host,
      origin: metadata.origin,
      slug: c.req.param("slug"),
      url,
      surface: "proxy",
    });
    const result = await services.presignUpload({
      context,
      rawBody: normalizedBody,
      metadata,
    });
    return c.json(result, 200);
  });

  app.notFound((c) => {
    setRouteSecurity(c, buildSecurityHeaders({ surface: "plain" }));
    return c.text("Not found", 404);
  });

  return app;
}
