import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

// Static documentation with no auth, no API calls, no third-party scripts.
const cspDirectives = [
  ["default-src", "'self'"],
  ["base-uri", "'self'"],
  ["object-src", "'none'"],
  ["frame-ancestors", "'none'"],
  ["form-action", "'self'"],
  ["script-src", "'self'", ...(isProduction ? [] : ["'unsafe-eval'", "'unsafe-inline'"])],
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
