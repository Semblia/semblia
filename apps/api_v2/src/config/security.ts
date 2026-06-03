import { createHmac, timingSafeEqual } from "node:crypto";

export const DEFAULT_API_V2_CORS_ORIGINS = ["http://localhost:3002"];
export const PUBLIC_API_V2_CORS_ALLOWED_HEADERS = [
  "Authorization",
  "Content-Type",
  "X-Requested-With",
  "X-Tresta-Signature",
  "X-Tresta-Timestamp",
  "Idempotency-Key",
  "X-Razorpay-Signature",
  "svix-id",
  "svix-timestamp",
  "svix-signature",
];

export function parseCommaSeparatedEnvList(
  value: string | undefined,
): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function buildApiV2CorsOptions(corsOrigins: string | undefined) {
  const configuredOrigins = parseCommaSeparatedEnvList(corsOrigins);

  return {
    origin:
      configuredOrigins.length > 0
        ? configuredOrigins
        : DEFAULT_API_V2_CORS_ORIGINS,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: PUBLIC_API_V2_CORS_ALLOWED_HEADERS,
    credentials: false,
    maxAge: 86400,
  };
}

export function extractPublicProjectSlugFromPath(path: string) {
  const match = path.match(
    /^\/v2\/(?:responses|forms)\/public\/projects\/([^/]+)/,
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function isDefaultHostedPublicOrigin(origin: string, slug: string) {
  return (
    origin === `https://${slug}.testimonials.tresta.app` ||
    origin === `https://${slug}.collect.tresta.app` ||
    origin === `https://${slug}.walls.tresta.app`
  );
}

export function normalizeOrigin(origin: string): string {
  try {
    return new URL(origin).origin;
  } catch {
    return origin;
  }
}

export function buildClerkVerifyOptions({
  secretKey,
  authorizedParties,
  audience,
}: {
  secretKey: string;
  authorizedParties?: string;
  audience?: string;
}) {
  const parsedAuthorizedParties = parseCommaSeparatedEnvList(authorizedParties);
  const parsedAudience = parseCommaSeparatedEnvList(audience);

  return {
    secretKey,
    ...(parsedAuthorizedParties.length > 0
      ? { authorizedParties: parsedAuthorizedParties }
      : {}),
    ...(parsedAudience.length === 1
      ? { audience: parsedAudience[0] }
      : parsedAudience.length > 1
        ? { audience: parsedAudience }
        : {}),
  };
}

export function verifyRazorpayWebhookSignature(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string | undefined,
): boolean {
  const normalizedSignature = signature?.trim();
  if (!normalizedSignature || !secret) return false;
  if (!/^[a-f0-9]{64}$/i.test(normalizedSignature)) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const actual = Buffer.from(normalizedSignature, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
