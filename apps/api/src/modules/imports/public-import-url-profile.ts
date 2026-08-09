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
type IdentityParameter = [key: string, value: string];

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
  canonicalizeHostname(url);
  const allowed = allowedIdentityParameters(sourceKey);
  const retained = retainedIdentityParameters(url, allowed);
  replaceSearchParameters(url, retained);
  return url;
}

function canonicalizeHostname(url: URL) {
  url.hostname = url.hostname.replace(/\.$/, "");
}

function retainedIdentityParameters(url: URL, allowed: Set<string>) {
  const retained: IdentityParameter[] = [];
  for (const [rawKey, rawValue] of url.searchParams) {
    const parameter: IdentityParameter = [rawKey.toLowerCase(), rawValue];
    rejectCredentialParameter(parameter);
    if (retainedIdentityParameter(allowed, parameter)) retained.push(parameter);
  }
  retained.sort(compareIdentityParameters);
  return retained;
}

function allowedIdentityParameters(sourceKey: string) {
  return new Set(
    (IDENTITY_PARAMS_BY_SOURCE[sourceKey] ?? []).map((key) =>
      key.toLowerCase(),
    ),
  );
}

function rejectCredentialParameter([key]: IdentityParameter) {
  if (!CREDENTIAL_PARAM.test(key)) return;
  throw new PublicImportUrlProfileError();
}

function retainedIdentityParameter(
  allowed: Set<string>,
  [key, value]: IdentityParameter,
) {
  if (!allowed.has(key)) return false;
  if (!value.length) return false;
  return value.length <= MAX_IDENTITY_PARAM_LENGTH;
}

function compareIdentityParameters(
  [leftKey, leftValue]: IdentityParameter,
  [rightKey, rightValue]: IdentityParameter,
) {
  if (leftKey !== rightKey) return compareCodeUnits([leftKey, rightKey]);
  return compareCodeUnits([leftValue, rightValue]);
}

function compareCodeUnits([left, right]: readonly [string, string]) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function replaceSearchParameters(url: URL, retained: IdentityParameter[]) {
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
  return createHash("sha256").update(canonical.toString()).digest("hex");
}
