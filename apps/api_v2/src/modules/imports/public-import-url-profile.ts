import { createHash } from "node:crypto";

const IDENTITY_PARAMS_BY_SOURCE: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    "apple-podcasts": ["i"],
    "google-business": ["place_id", "placeid"],
    "google-play": ["id"],
    "product-hunt": ["post"],
    shopify: ["variant"],
    wordpress: [
      "p",
      "page_id",
      "post",
      "product",
      "page",
      "per_page",
      "status",
      "orderby",
      "order",
    ],
    yelp: ["biz_id"],
    youtube: ["v"],
  });

const CREDENTIAL_PARAM =
  /^(?:access[_-]?token|api[_-]?key|apikey|auth|authorization|code|credential|jwt|key|pass|password|secret|session|sig|signature|token|x-amz-signature|x-goog-signature)$/i;
const MAX_IDENTITY_PARAM_LENGTH = 500;

export class PublicImportUrlProfileError extends Error {
  constructor() {
    super("Public import source URL is not allowed");
    this.name = "PublicImportUrlProfileError";
  }
}

export function canonicalizePublicImportSourceUrl(
  value: string | URL,
  sourceKey: string,
) {
  const url = new URL(value.toString());
  const allowed = new Set(
    (IDENTITY_PARAMS_BY_SOURCE[sourceKey] ?? []).map((key) =>
      key.toLowerCase(),
    ),
  );
  const retained: Array<[string, string]> = [];
  for (const [rawKey, rawValue] of url.searchParams) {
    const key = rawKey.toLowerCase();
    if (CREDENTIAL_PARAM.test(key)) throw new PublicImportUrlProfileError();
    if (
      allowed.has(key) &&
      rawValue.length > 0 &&
      rawValue.length <= MAX_IDENTITY_PARAM_LENGTH
    )
      retained.push([key, rawValue]);
  }
  retained.sort(([leftKey, leftValue], [rightKey, rightValue]) =>
    leftKey === rightKey
      ? leftValue.localeCompare(rightValue)
      : leftKey.localeCompare(rightKey),
  );
  url.search = "";
  url.hash = "";
  for (const [key, itemValue] of retained)
    url.searchParams.append(key, itemValue);
  return url;
}

export function publicImportSourceIdentityHash(
  value: string | URL,
  sourceKey: string,
) {
  const canonical = canonicalizePublicImportSourceUrl(value, sourceKey);
  return createHash("sha256")
    .update(canonical.toString())
    .digest("hex");
}
