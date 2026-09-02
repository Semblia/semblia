import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

/**
 * The API origin the dashboard is built against. NEXT_PUBLIC_API_URL is
 * inlined into client bundles at build time, so a production build with it
 * missing or malformed ships a dashboard permanently pointed at
 * http://localhost:8100 — a green build, a dead product. Production builds
 * fail loudly instead. `vercel build --prod` / Vercel's own production builds
 * set VERCEL_ENV=production; local and CI `next build` runs don't, so the
 * repo's build gates keep working without a configured origin.
 */
function failOrFallback(productionBuild: boolean, message: string): string {
  if (productionBuild) throw new Error(message);
  return "http://localhost:8100";
}

export function resolveApiOrigin(
  configured: string | undefined,
  productionBuild: boolean,
): string {
  if (!configured) {
    return failOrFallback(
      productionBuild,
      "NEXT_PUBLIC_API_URL is required for a production build — without it the dashboard ships pointed at http://localhost:8100. Set it on the Vercel project (see apps/app/.env.example).",
    );
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(configured);
  } catch {
    parsed = null;
  }
  // Non-http(s) schemes have no usable origin (`new URL("mailto:x").origin`
  // is the literal string "null" — poison in a CSP); production additionally
  // requires TLS.
  const schemeOk =
    parsed !== null &&
    (parsed.protocol === "https:" ||
      (parsed.protocol === "http:" && !productionBuild));
  if (parsed === null || !schemeOk) {
    return failOrFallback(
      productionBuild,
      `NEXT_PUBLIC_API_URL is not a valid https URL (${JSON.stringify(configured)}) — a production build would silently drop the real API origin from the CSP and fall back to http://localhost:8100.`,
    );
  }
  return parsed.origin;
}

function getApiOrigin() {
  return resolveApiOrigin(
    process.env.NEXT_PUBLIC_API_URL,
    process.env.VERCEL_ENV === "production",
  );
}

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Storage origins the browser talks to directly. `connect-src` needs the
 * presigned-PUT upload target so the media uploader's
 * `xhr.PUT(intent.uploadUrl)` isn't blocked (image display is already covered
 * by `img-src https:`). AWS virtual-hosted and path-style URLs both live under
 * `*.amazonaws.com`; a custom S3 endpoint or CDN is added from env when set.
 */
function getStorageOrigins(): string[] {
  const origins = new Set<string>(["https://*.amazonaws.com"]);
  const cdn = originOf(process.env.NEXT_PUBLIC_S3_PUBLIC_CDN_BASE_URL);
  if (cdn) origins.add(cdn);
  const endpoint = originOf(process.env.NEXT_PUBLIC_S3_ENDPOINT);
  if (endpoint) origins.add(endpoint);
  return [...origins];
}

const cspDirectives = [
  ["default-src", "'self'"],
  ["base-uri", "'self'"],
  ["object-src", "'none'"],
  ["frame-ancestors", "'none'"],
  ["form-action", "'self'"],
  [
    "script-src",
    "'self'",
    "'unsafe-inline'",
    ...(isProduction ? [] : ["'unsafe-eval'"]),
    "https://checkout.razorpay.com",
    "https://*.semblia.com",
    "https://*.clerk.accounts.dev",
    "https://*.clerk.com",
    "https://clerk.com",
    "https://challenges.cloudflare.com",
  ],
  // `fonts.googleapis.com` serves the webfont stylesheet the studios inject for
  // their live previews; the font files themselves come from `fonts.gstatic.com`.
  // The theme engine emits webfont-first stacks (e.g. `"Fraunces", Georgia`), so
  // the studio preview must load them to be a true representation of the user's
  // typography choice.
  ["style-src", "'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  ["img-src", "'self'", "data:", "blob:", "https:"],
  ["font-src", "'self'", "data:", "https://fonts.gstatic.com"],
  ["media-src", "'self'", "data:", "blob:", "https:"],
  [
    "connect-src",
    "'self'",
    getApiOrigin(),
    "https://semblia.com",
    "https://*.semblia.com",
    "https://*.clerk.accounts.dev",
    "https://*.clerk.com",
    "https://clerk.com",
    "https://api.razorpay.com",
    "https://checkout.razorpay.com",
    ...getStorageOrigins(),
    ...(isProduction
      ? []
      : [
          "http://localhost:*",
          "http://127.0.0.1:*",
          "ws://localhost:*",
          "ws://127.0.0.1:*",
        ]),
  ],
  [
    "frame-src",
    "'self'",
    "https://api.razorpay.com",
    "https://checkout.razorpay.com",
    "https://*.semblia.com",
    "https://*.clerk.accounts.dev",
    "https://*.clerk.com",
    "https://clerk.com",
    "https://challenges.cloudflare.com",
  ],
  ["worker-src", "'self'", "blob:"],
  ["manifest-src", "'self'"],
];

export const contentSecurityPolicy = cspDirectives
  .map(([directive, ...sources]) => `${directive} ${sources.join(" ")}`)
  .join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/settings/profile",
        destination: "/account/profile",
        permanent: true,
      },
      {
        source: "/settings/billing",
        destination: "/account/billing",
        permanent: true,
      },
      // 2026-07 sitemap restructure: projects moved to the URL root and a few
      // sections were renamed. Old bookmarks and external links keep working.
      // Order matters — specific rules must precede the catch-all.
      { source: "/projects", destination: "/", permanent: true },
      { source: "/projects/new", destination: "/new", permanent: true },
      {
        source: "/projects/:slug/developers/integrations",
        destination: "/:slug/integrations",
        permanent: true,
      },
      {
        source: "/projects/:slug/developers/audit",
        destination: "/:slug/developers/activity",
        permanent: true,
      },
      {
        source: "/projects/:slug/settings/hosts",
        destination: "/:slug/settings/domains",
        permanent: true,
      },
      {
        source: "/projects/:slug/settings/trust",
        destination: "/:slug/settings/security",
        permanent: true,
      },
      // 2026-08 Social Proof Studio: the widgets section became /studio.
      // These must precede the /projects catch-all so a legacy
      // /projects/:slug/widgets/... address chains through both renames.
      {
        source: "/:slug/widgets",
        destination: "/:slug/studio",
        permanent: true,
      },
      {
        source: "/:slug/widgets/:path*",
        destination: "/:slug/studio/:path*",
        permanent: true,
      },
      // 2026-08 collection IA: Import moved out of Responses to a top-level
      // section. Placed before the /projects catch-all so legacy
      // /projects/:slug/responses/import chains through both renames.
      {
        source: "/:slug/responses/import",
        destination: "/:slug/import",
        permanent: true,
      },
      {
        source: "/projects/:slug/:path*",
        destination: "/:slug/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
