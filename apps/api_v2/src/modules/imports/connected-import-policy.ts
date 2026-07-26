import { ConflictException } from "@nestjs/common";
import type { ConnectedProvider } from "../integrations/token-providers/connected-account-token-provider.js";

export const CONNECTED_IMPORT_SOURCE_KEYS = [
  "x",
  "linkedin",
  "youtube",
  "google-business",
  "google-play",
] as const;
export type ConnectedImportSourceKey =
  (typeof CONNECTED_IMPORT_SOURCE_KEYS)[number];

export type ConnectedImportPolicy = Readonly<{
  sourceKey: ConnectedImportSourceKey;
  clerkProvider: ConnectedProvider;
  oauthStrategy: `oauth_${string}`;
  requiredScopes: readonly string[];
}>;

export const CONNECTED_IMPORT_POLICIES: Readonly<
  Record<ConnectedImportSourceKey, ConnectedImportPolicy>
> = Object.freeze({
  x: Object.freeze({
    sourceKey: "x",
    clerkProvider: "x",
    oauthStrategy: "oauth_x",
    requiredScopes: Object.freeze([
      "tweet.read",
      "users.read",
      "offline.access",
    ]),
  }),
  linkedin: Object.freeze({
    sourceKey: "linkedin",
    clerkProvider: "linkedin",
    oauthStrategy: "oauth_linkedin",
    requiredScopes: Object.freeze(["openid", "profile", "r_member_social"]),
  }),
  youtube: Object.freeze({
    sourceKey: "youtube",
    clerkProvider: "google",
    oauthStrategy: "oauth_google",
    requiredScopes: Object.freeze([
      "https://www.googleapis.com/auth/youtube.readonly",
    ]),
  }),
  "google-business": Object.freeze({
    sourceKey: "google-business",
    clerkProvider: "google",
    oauthStrategy: "oauth_google",
    requiredScopes: Object.freeze([
      "https://www.googleapis.com/auth/business.manage",
    ]),
  }),
  "google-play": Object.freeze({
    sourceKey: "google-play",
    clerkProvider: "google",
    oauthStrategy: "oauth_google",
    requiredScopes: Object.freeze([
      "https://www.googleapis.com/auth/playdeveloperreporting",
      "https://www.googleapis.com/auth/androidpublisher",
    ]),
  }),
});

export function isConnectedImportSourceKey(
  value: string,
): value is ConnectedImportSourceKey {
  return CONNECTED_IMPORT_SOURCE_KEYS.includes(
    value as ConnectedImportSourceKey,
  );
}

export function connectedImportPolicy(value: string) {
  if (!isConnectedImportSourceKey(value))
    throw new ConflictException("Connected import provider is not supported");
  return CONNECTED_IMPORT_POLICIES[value];
}
