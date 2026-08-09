import type { V2ImportCatalogSourceDTO } from "@workspace/types";

const CONNECTED_SOURCE_KEYS = [
  "x",
  "linkedin",
  "youtube",
  "google-business",
  "google-play",
] as const;

type ConnectedSourceKey = (typeof CONNECTED_SOURCE_KEYS)[number];

const CONNECTED_OAUTH_STRATEGIES: Readonly<Record<ConnectedSourceKey, string>> =
  {
    x: "oauth_x",
    linkedin: "oauth_linkedin",
    youtube: "oauth_google",
    "google-business": "oauth_google",
    "google-play": "oauth_google",
  };

export function asConnectedSourceKey(
  value: string | undefined,
): ConnectedSourceKey | null {
  return CONNECTED_SOURCE_KEYS.find((key) => key === value) ?? null;
}

export function hasExpectedOAuthStrategy(
  source: V2ImportCatalogSourceDTO | null,
  sourceKey: ConnectedSourceKey | null,
) {
  return (
    sourceKey !== null &&
    source?.oauthStrategy === CONNECTED_OAUTH_STRATEGIES[sourceKey]
  );
}

export function oauthProvider(strategy: string | null | undefined) {
  return strategy?.startsWith("oauth_") ? strategy.slice(6) : null;
}

export function hasScopes(
  approvedScopes: string | null | undefined,
  requiredScopes: readonly string[],
) {
  const approved = new Set(
    (approvedScopes ?? "")
      .split(/[\s,]+/)
      .map((scope) => scope.trim().toLocaleLowerCase())
      .filter(Boolean),
  );
  return requiredScopes.every((scope) =>
    approved.has(scope.toLocaleLowerCase()),
  );
}

export function resourceNoun(sourceKey: string | undefined) {
  return (
    {
      x: "profile",
      linkedin: "profile",
      youtube: "channel",
      "google-business": "location",
      "google-play": "app",
    }[sourceKey ?? ""] ?? "source"
  );
}

export function navigateToVerification(href: string | undefined) {
  if (!href || window.navigator.userAgent.includes("jsdom")) return;
  try {
    window.location.assign(href);
  } catch {
    // JSDOM does not implement navigation. Browsers do.
  }
}
