import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const fallbackApiOrigin = "http://localhost:8100";

function warnApiOriginFallback(reason: string) {
  if (!isProduction) return;
  console.warn(
    `NEXT_PUBLIC_API_URL ${reason}; admin CSP connect-src is falling back to ${fallbackApiOrigin}.`,
  );
}

function getApiOrigin() {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (!configured) {
    warnApiOriginFallback("is not set");
    return fallbackApiOrigin;
  }

  try {
    return new URL(configured).origin;
  } catch {
    warnApiOriginFallback("is invalid");
    return fallbackApiOrigin;
  }
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
    "https://*.clerk.accounts.dev",
    "https://*.clerk.com",
    "https://clerk.com",
    "https://challenges.cloudflare.com",
  ],
  ["style-src", "'self'", "'unsafe-inline'"],
  ["img-src", "'self'", "data:", "blob:", "https:"],
  ["font-src", "'self'", "data:"],
  [
    "connect-src",
    "'self'",
    getApiOrigin(),
    "https://*.clerk.accounts.dev",
    "https://*.clerk.com",
    "https://clerk.com",
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
    key: "X-Frame-Options",
    value: "DENY",
  },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
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
};

export default nextConfig;
