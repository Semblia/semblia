import { readFile } from "node:fs/promises";
import { Hono } from "hono";
import type { Context } from "hono";
import type { PublicSnapshot } from "@workspace/forms-core";
import { normalizePublicHostname } from "@workspace/types";
import { buildFormStylesheet } from "@workspace/forms-renderer";
import { renderFormToString } from "@workspace/forms-renderer/server";
import { createApiRuntimeServices } from "./api-services.js";
import { RuntimeApiError } from "./api-client.js";
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
const snapshotCacheMaxEntries = 256;
const rateBucketMaxEntries = 2_048;
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
      getHeader(c, "x-semblia-original-user-agent") ??
      getHeader(c, "user-agent"),
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
  // Hosted pages AND embed documents hydrate (the embed ships inside an
  // iframe and submits first-party); only plain error pages stay script-free.
  const interactive = input.surface === "hosted" || input.surface === "embed";
  const scriptSrc = interactive ? "script-src 'self'" : "script-src 'none'";
  const connectSrc = interactive
    ? `connect-src 'self'${input.connectSrc ? ` ${input.connectSrc}` : ""}`
    : "connect-src 'none'";
  // The in-form recorder (video/audio asks) needs camera+mic on hosted
  // pages. Embeds never carry capture fields (not embed-capable), so they
  // stay locked down.
  const capture = input.surface === "hosted" ? "(self)" : "()";

  return {
    "content-security-policy": [
      "default-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      frameAncestors,
      "img-src 'self' https: data:",
      "style-src 'unsafe-inline'",
      "font-src 'self' data:",
      "media-src 'self' blob:",
      scriptSrc,
      connectSrc,
    ].join("; "),
    "permissions-policy": `camera=${capture}, microphone=${capture}, geolocation=(), payment=(), usb=()`,
    "referrer-policy": "strict-origin-when-cross-origin",
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "x-content-type-options": "nosniff",
    ...(input.surface === "hosted" || input.surface === "plain"
      ? { "x-frame-options": "DENY" }
      : {}),
    ...(input.surface === "hosted" || input.surface === "embed"
      ? { "x-robots-tag": "noindex, nofollow" }
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

function allowedOriginForEmbed(
  snapshot: PublicSnapshot,
  origin: string | undefined,
) {
  if (!snapshot.security.embedAllowed) return false;
  if (!origin) return true;
  return snapshot.security.allowedOrigins.includes(origin);
}

/** Snapshots published before the 2026-07-17 delivery split lack the key. */
function deliveryOf(snapshot: PublicSnapshot): "hosted" | "embed" {
  return snapshot.delivery ?? "hosted";
}

function edgeRateLimit(input: {
  c: RuntimeContext;
  key: string;
  limit: number;
  windowMs: number;
  buckets: Map<string, RateEntry>;
}): Response | null {
  const now = Date.now();
  for (const [key, value] of input.buckets) {
    if (value.resetAt <= now) input.buckets.delete(key);
  }
  const entry = input.buckets.get(input.key);
  if (!entry || entry.resetAt <= now) {
    if (!entry && input.buckets.size >= rateBucketMaxEntries) {
      const oldest = input.buckets.keys().next().value;
      if (oldest) input.buckets.delete(oldest);
    }
    input.buckets.set(input.key, { count: 1, resetAt: now + input.windowMs });
    return null;
  }
  entry.count += 1;
  if (entry.count <= input.limit) return null;

  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  input.c.header("retry-after", String(retryAfter));
  input.c.header("cache-control", "private, no-store");
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
      ...parsed,
      purpose: "SUBMISSION_ATTACHMENT",
    });
  } catch {
    return null;
  }
}

function routeUrl(path: string, context: RuntimeRequestContext) {
  if (context.routing.kind !== "legacy-project") return path;
  const search = new URLSearchParams({ projectId: context.routing.projectId });
  return `${path}?${search.toString()}`;
}

/**
 * One HTML scaffold serves both public form documents; only the head lines,
 * base CSS, and root attributes differ per surface.
 *
 * Hosted: opaque full page with presign wiring for in-form uploads.
 *
 * Embed (2026-07-17): a full hydrated page served inside the host site's
 * iframe. Transparent body — the pack's embed composition earns its own
 * boundary on whatever page it joins; submits run first-party through the
 * same proxy routes as hosted pages; the runtime client reports content
 * height to the parent so the iframe hugs the form.
 */
function renderFormDocument(
  snapshot: PublicSnapshot,
  context: RuntimeRequestContext,
  surface: "hosted" | "embed",
) {
  const embed = surface === "embed";
  const markup = embed
    ? renderFormToString(snapshot, { surface: "embed" })
    : renderFormToString(snapshot);
  const stylesheet = buildFormStylesheet(snapshot);
  const submitUrl = routeUrl(
    `/f/${encodeURIComponent(context.slug)}/submissions`,
    context,
  );
  const titleTag = `<title>${htmlEscape(snapshot.content.title || "Semblia form")}</title>`;
  const headLines = embed
    ? [`<meta name="robots" content="noindex" />`, titleTag]
    : [titleTag, `<meta name="robots" content="noindex, nofollow" />`];
  const surfaceCss = embed
    ? [
        "html, body, #semblia-form-root { margin: 0; }",
        "html, body { background: transparent; }",
      ]
    : [
        "html, body, #semblia-form-root { margin: 0; min-height: 100%; }",
        "body { background: var(--tf-bg, #ffffff); }",
      ];
  const rootAttributes = embed
    ? ` data-surface="embed" data-submit-url="${htmlEscape(submitUrl)}"`
    : ` data-submit-url="${htmlEscape(submitUrl)}" data-presign-url="${htmlEscape(
        routeUrl(
          `/f/${encodeURIComponent(context.slug)}/uploads/presign`,
          context,
        ),
      )}"`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${headLines.join("\n    ")}
    <style>
      ${surfaceCss.join("\n      ")}
      ${stylesheet}
    </style>
  </head>
  <body>
    <div id="semblia-form-root"${rootAttributes}>${markup}</div>
    <script id="semblia-form-snapshot" type="application/json">${jsonForHtml(snapshot)}</script>
    <script type="module" src="/forms-runtime-client.js"></script>
  </body>
</html>`;
}

/**
 * The `<semblia-form>` iframe loader served at /embed.js. Deliberately plain,
 * dependency-free JS: registers the element, injects the embed document in an
 * iframe, and hugs the form's reported height. The shadow-DOM injection
 * loader (loader.js) remains the Phase-8 follow-up.
 */
function embedLoaderScript(): string {
  return `(() => {
  if (customElements.get("semblia-form")) return;
  const script = document.currentScript;
  const origin = script && script.src ? new URL(script.src).origin : "";
  const frames = new WeakMap();

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.type !== "semblia:form-height") return;
    document.querySelectorAll("semblia-form iframe").forEach((frame) => {
      if (frame.contentWindow === event.source && typeof data.height === "number") {
        frame.style.height = Math.max(1, Math.ceil(data.height)) + "px";
      }
    });
  });

  class SembliaForm extends HTMLElement {
    connectedCallback() {
      if (frames.has(this)) return;
      const form = this.getAttribute("form");
      const project = this.getAttribute("project");
      if (!form || !project) return;
      const frame = document.createElement("iframe");
      frame.src = origin + "/embed/" + encodeURIComponent(form) + "?projectId=" + encodeURIComponent(project);
      frame.title = this.getAttribute("title") || "Feedback form";
      frame.loading = "lazy";
      frame.allowTransparency = true;
      frame.style.cssText = "display:block;width:100%;border:0;height:480px;background:transparent";
      frames.set(this, frame);
      this.appendChild(frame);
    }
  }

  customElements.define("semblia-form", SembliaForm);
})();
`;
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
  projectId: string,
) {
  const key = `${context.host}:${projectId}:${context.surface}:${context.slug}`;
  const now = Date.now();
  for (const [cacheKey, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(cacheKey);
  }
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.snapshot;

  const snapshot = await services.getSnapshotBySlug(context, metadata);
  if (snapshot.projectId !== projectId) throw new RuntimeApiError(404);
  if (cache.size >= snapshotCacheMaxEntries) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { snapshot, expiresAt: now + snapshotCacheTtlMs });
  return snapshot;
}

function privateNoStore(c: RuntimeContext) {
  c.header("cache-control", "private, no-store");
}

function opaqueRuntimeError(c: RuntimeContext, error: unknown) {
  const status =
    error instanceof RuntimeApiError
      ? error.status
      : isRejectedViewerRouting(error)
        ? 404
        : 503;
  privateNoStore(c);
  setRouteSecurity(
    c,
    c.get("securityHeaders") ?? buildSecurityHeaders({ surface: "plain" }),
  );
  return c.text(
    status === 429 ? "Too many requests" : "Form unavailable",
    status,
  );
}

function isRejectedViewerRouting(error: unknown) {
  return (
    error instanceof Error &&
    [
      "Invalid runtime host",
      "Invalid runtime hostname",
      "Invalid legacy runtime request",
      "Invalid form slug",
    ].includes(error.message)
  );
}

function validatedCanonicalOrigin(input: {
  canonicalHostname: string;
  canonicalUrl: string;
}) {
  const hostname = normalizePublicHostname(input.canonicalHostname);
  if (!hostname) throw new RuntimeApiError(404);
  try {
    const canonical = new URL(input.canonicalUrl);
    if (
      canonical.protocol !== "https:" ||
      canonical.hostname !== hostname ||
      canonical.port ||
      canonical.pathname !== "/" ||
      canonical.search ||
      canonical.hash ||
      canonical.username ||
      canonical.password
    ) {
      throw new RuntimeApiError(404);
    }
    return canonical.origin;
  } catch (error) {
    if (error instanceof RuntimeApiError) throw error;
    throw new RuntimeApiError(404);
  }
}

type ValidatedCollectionResolution = {
  requestedHostname: string;
  canonicalHostname: string;
  canonicalOrigin: string;
  isCanonical: boolean;
  projectId: string;
};

function validateCollectionResolution(
  value: unknown,
  requestedHost: string,
): ValidatedCollectionResolution {
  if (!value || typeof value !== "object") throw new RuntimeApiError(404);
  const resolution = value as Record<string, unknown>;
  const rawRequestedHostname = resolution.requestedHostname;
  const rawCanonicalHostname = resolution.canonicalHostname;
  const requestedHostname =
    typeof rawRequestedHostname === "string"
      ? normalizePublicHostname(rawRequestedHostname)
      : null;
  const canonicalHostname =
    typeof rawCanonicalHostname === "string"
      ? normalizePublicHostname(rawCanonicalHostname)
      : null;
  if (
    resolution.feature !== "COLLECTION" ||
    !requestedHostname ||
    rawRequestedHostname !== requestedHostname ||
    requestedHostname !== requestedHost ||
    !canonicalHostname ||
    rawCanonicalHostname !== canonicalHostname ||
    typeof resolution.canonicalUrl !== "string" ||
    typeof resolution.isCanonical !== "boolean" ||
    typeof resolution.projectId !== "string" ||
    !resolution.projectId.trim() ||
    resolution.isCanonical !== (requestedHostname === canonicalHostname)
  ) {
    throw new RuntimeApiError(404);
  }
  return {
    requestedHostname,
    canonicalHostname,
    canonicalOrigin: validatedCanonicalOrigin({
      canonicalHostname,
      canonicalUrl: resolution.canonicalUrl,
    }),
    isCanonical: resolution.isCanonical,
    projectId: resolution.projectId,
  };
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

  function requestContext(input: {
    c: RuntimeContext;
    slug: string;
    surface: "hosted" | "embed" | "proxy";
    method: "GET" | "POST";
  }) {
    const url = new URL(input.c.req.url);
    const host = resolveRuntimeHost({
      originalHost: getHeader(input.c, "x-semblia-original-host"),
      headerHost: getHeader(input.c, "host"),
      url,
      env,
    });
    const baseHost = normalizePublicHostname(
      env.FORMS_RUNTIME_PUBLIC_BASE_DOMAIN,
    );
    if (
      env.FORMS_RUNTIME_MODE === "api" &&
      host === baseHost &&
      !url.searchParams.get("projectId")?.trim()
    ) {
      throw new RuntimeApiError(404);
    }
    const context = resolveRequestContext({
      env,
      host,
      origin: getHeader(input.c, "origin"),
      slug: input.slug,
      url,
      surface: input.surface,
      method: input.method,
    });
    const metadata = readForwardMetadata(input.c);
    return { context, metadata, url };
  }

  async function resolveAuthority(input: ReturnType<typeof requestContext>) {
    if (input.context.routing.kind === "legacy-project") {
      return {
        ...input,
        projectId: input.context.routing.projectId,
        canonicalOrigin: undefined,
        shouldRedirect: false,
      };
    }

    const resolution = validateCollectionResolution(
      await services.resolveCollectionHost(input.context.host),
      input.context.host,
    );
    if (
      !resolution.isCanonical &&
      resolution.canonicalHostname === input.context.host
    ) {
      throw new RuntimeApiError(404);
    }
    return {
      ...input,
      projectId: resolution.projectId,
      canonicalOrigin: resolution.canonicalOrigin,
      shouldRedirect: resolution.isCanonical === false,
    };
  }

  app.use("*", async (c, next) => {
    await next();
    applyHeaders(
      c,
      c.get("securityHeaders") ?? buildSecurityHeaders({ surface: "plain" }),
    );
  });

  app.onError((error, c) => {
    if (
      !isRejectedViewerRouting(error) &&
      !(error instanceof RuntimeApiError)
    ) {
      console.error("forms_runtime request failed", error);
    }
    return opaqueRuntimeError(c, error);
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
    return c.text(embedLoaderScript(), 200, {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, s-maxage=300, stale-while-revalidate=3600",
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
    setRouteSecurity(c, buildSecurityHeaders({ surface: "hosted" }));
    privateNoStore(c);
    const request = requestContext({
      c,
      slug: c.req.param("slug"),
      surface: "hosted",
      method: "GET",
    });
    const rateLimited = edgeRateLimit({
      c,
      key: `page:${request.context.host}:${request.context.slug}:${clientIp(c)}`,
      limit: 120,
      windowMs: env.FORMS_RUNTIME_EDGE_RATE_WINDOW_MS,
      buckets: rateBuckets,
    });
    if (rateLimited) return rateLimited;
    const resolved = await resolveAuthority(request);
    if (resolved.shouldRedirect && resolved.canonicalOrigin) {
      privateNoStore(c);
      return c.redirect(
        `${resolved.canonicalOrigin}${resolved.url.pathname}${resolved.url.search}`,
        308,
      );
    }
    const snapshot = await cachedSnapshot(
      services,
      resolved.context,
      resolved.metadata,
      snapshotCache,
      resolved.projectId,
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
    if (deliveryOf(snapshot) !== "hosted") {
      return c.text("This form is delivered as an embed", 404);
    }

    return c.html(
      renderFormDocument(snapshot, resolved.context, "hosted"),
      200,
      {
        "cache-control": "private, no-store",
      },
    );
  });

  app.get("/embed/:slug", async (c) => {
    setRouteSecurity(c, buildSecurityHeaders({ surface: "embed" }));
    privateNoStore(c);
    c.header("vary", "origin, accept-encoding");
    const request = requestContext({
      c,
      slug: c.req.param("slug"),
      surface: "embed",
      method: "GET",
    });
    const rateLimited = edgeRateLimit({
      c,
      key: `embed:${request.context.host}:${request.context.slug}:${clientIp(c)}`,
      limit: 120,
      windowMs: env.FORMS_RUNTIME_EDGE_RATE_WINDOW_MS,
      buckets: rateBuckets,
    });
    if (rateLimited) return rateLimited;
    const resolved = await resolveAuthority(request);
    if (resolved.shouldRedirect && resolved.canonicalOrigin) {
      privateNoStore(c);
      return c.redirect(
        `${resolved.canonicalOrigin}${resolved.url.pathname}${resolved.url.search}`,
        308,
      );
    }
    const snapshot = await cachedSnapshot(
      services,
      resolved.context,
      resolved.metadata,
      snapshotCache,
      resolved.projectId,
    );
    const origin = resolved.metadata.origin;
    setRouteSecurity(c, buildSecurityHeaders({ surface: "embed", snapshot }));

    if (deliveryOf(snapshot) !== "embed") {
      return c.text("This form is delivered as a hosted page", 404);
    }
    if (!allowedOriginForEmbed(snapshot, origin)) {
      return c.text("Embed origin is not authorized", 403);
    }

    const headers: Record<string, string> = {};
    if (origin) headers["access-control-allow-origin"] = origin;
    return c.html(
      renderFormDocument(snapshot, resolved.context, "embed"),
      200,
      headers,
    );
  });

  /**
   * Shared skeleton for the browser-facing POST proxy routes: resolve the
   * request context, edge rate-limit BEFORE resolving tenant authority, read
   * the bounded body, then hand the unique service call to `respond`.
   */
  async function proxyFormPost(
    c: RuntimeContext,
    route: {
      slug: string;
      rateKey: "submit" | "presign";
      limit: number;
      maxBytes: number;
    },
    respond: (
      resolved: Awaited<ReturnType<typeof resolveAuthority>>,
      rawBody: string,
    ) => Promise<Response>,
  ) {
    const request = requestContext({
      c,
      slug: route.slug,
      surface: "proxy",
      method: "POST",
    });
    const rateLimited = edgeRateLimit({
      c,
      key: `${route.rateKey}:browser:${request.context.host}:${request.context.slug}:${clientIp(c)}`,
      limit: route.limit,
      windowMs: env.FORMS_RUNTIME_EDGE_RATE_WINDOW_MS,
      buckets: rateBuckets,
    });
    if (rateLimited) return rateLimited;
    const resolved = await resolveAuthority(request);

    const body = await readRequestBody(c, route.maxBytes);
    if (body.error) return body.error;
    return respond(resolved, body.raw);
  }

  app.post("/f/:slug/submissions", (c) =>
    proxyFormPost(
      c,
      {
        slug: c.req.param("slug"),
        rateKey: "submit",
        limit: 10,
        maxBytes: maxBodyBytes,
      },
      async (resolved, rawBody) => {
        const result = await services.submitForm({
          context: resolved.context,
          rawBody,
          metadata: resolved.metadata,
        });
        return c.json(result, 201);
      },
    ),
  );

  app.post("/f/:slug/uploads/presign", (c) =>
    proxyFormPost(
      c,
      {
        slug: c.req.param("slug"),
        rateKey: "presign",
        limit: 20,
        maxBytes: maxUploadIntentBytes,
      },
      async (resolved, rawBody) => {
        const normalizedBody = normalizePresignBody(rawBody, false);
        if (!normalizedBody) return c.json({ error: "invalid_body" }, 400);

        const result = await services.presignUpload({
          context: resolved.context,
          rawBody: normalizedBody,
          metadata: resolved.metadata,
        });
        return c.json(result, 200);
      },
    ),
  );

  app.notFound((c) => {
    setRouteSecurity(c, buildSecurityHeaders({ surface: "plain" }));
    return c.text("Not found", 404);
  });

  return app;
}
