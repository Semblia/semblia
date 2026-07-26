import { canonicalizePublicImportSourceUrl } from "./public-import-url-profile.js";

const MAX_PERSISTED_SOURCE_URL_LENGTH = 1000;
const PERSISTED_SOURCE_PROTOCOLS = new Set(["http:", "https:"]);

function invalidSourceUrl(): never {
  throw new Error("Import candidate source URL is invalid");
}

function parsePersistedSourceUrl(value: string) {
  if (!value || value.length > MAX_PERSISTED_SOURCE_URL_LENGTH)
    invalidSourceUrl();

  try {
    return new URL(value);
  } catch {
    invalidSourceUrl();
  }
}

function assertPersistableSourceUrl(url: URL) {
  if (!PERSISTED_SOURCE_PROTOCOLS.has(url.protocol)) invalidSourceUrl();
  if (url.username) invalidSourceUrl();
  if (url.password) invalidSourceUrl();
}

function stripSourceUrlSecrets(url: URL) {
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function canonicalizePersistedImportSourceUrl(
  value: string,
  sourceKey?: string,
) {
  const url = parsePersistedSourceUrl(value.trim());
  assertPersistableSourceUrl(url);
  if (sourceKey)
    return canonicalizePublicImportSourceUrl(url, sourceKey).toString();
  return stripSourceUrlSecrets(url);
}
