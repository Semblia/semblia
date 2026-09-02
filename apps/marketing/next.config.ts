import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

// The marketing site is static content with no auth, no API calls, and no
// third-party scripts — the CSP can stay this tight. Widening any directive
// needs the same scrutiny the app and admin configs get.
const cspDirectives = [
  ["default-src", "'self'"],
  ["base-uri", "'self'"],
  ["object-src", "'none'"],
  ["frame-ancestors", "'none'"],
  ["form-action", "'self'"],
  // 'unsafe-inline' is required: the App Router emits un-nonced inline
  // Flight/hydration scripts in static output (verified against the built
  // HTML), and nonces would force every route dynamic. Same posture as
  // apps/app and apps/admin.
  ["script-src", "'self'", "'unsafe-inline'", ...(isProduction ? [] : ["'unsafe-eval'"])],
  ["style-src", "'self'", "'unsafe-inline'"],
  ["img-src", "'self'", "data:"],
  ["font-src", "'self'"],
  ["connect-src", "'self'", ...(isProduction ? [] : ["ws://localhost:*"])],
  ["worker-src", "'self'"],
  ["manifest-src", "'self'"],
];

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspDirectives
      .map(([directive, ...sources]) => `${directive} ${sources.join(" ")}`)
      .join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
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
