const MAX_PERSISTED_SOURCE_URL_LENGTH = 1000;

export function canonicalizePersistedImportSourceUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_PERSISTED_SOURCE_URL_LENGTH)
    throw new Error("Import candidate source URL is invalid");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Import candidate source URL is invalid");
  }
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password
  )
    throw new Error("Import candidate source URL is invalid");
  url.search = "";
  url.hash = "";
  return url.toString();
}
