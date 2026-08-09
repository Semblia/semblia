/**
 * Favicon helpers — derive a project's site icon from its website URL without
 * persisting anything. Used as the project-avatar fallback and for the studio
 * host-page preview logo, so a project that has a website but no uploaded logo
 * still reads as "their site". Google's favicon service is a stable, cached
 * source that returns a sensible default for hosts without an explicit icon.
 */

/** Normalise free-text input into a hostname, or null if it isn't a URL. */
export function hostnameFromUrl(
  input: string | null | undefined,
): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const withProto = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const { hostname } = new URL(withProto);
    return hostname || null;
  } catch {
    return null;
  }
}

/** A cached favicon URL (https) for a project's website, or null. */
export function faviconForUrl(
  input: string | null | undefined,
  size = 128,
): string | null {
  const host = hostnameFromUrl(input);
  if (!host) return null;
  return `https://www.google.com/s2/favicons?sz=${size}&domain=${encodeURIComponent(host)}`;
}
