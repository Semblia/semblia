/**
 * Output escaping for the SSR render path. Everything the renderer interpolates
 * into HTML — customer copy, brand names, question labels, option values — is
 * host-controllable, so it is escaped at the boundary. The renderer never
 * concatenates raw strings into markup without going through these helpers.
 */

/** Escape text that lands in element content. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Escape text that lands inside a double-quoted attribute. */
export function escapeAttr(value: string): string {
  return escapeHtml(value);
}

/**
 * Serialize a config object for an inline `<script type="application/json">`.
 * Non-executable script types are not governed by CSP `script-src`, so this is
 * how per-form data reaches the page without needing a per-form script hash.
 * `<` and `>` are unicode-escaped so the payload can never close the script
 * element or smuggle markup. The data is read back with `JSON.parse`, which
 * handles every other code point, so no further escaping is required.
 */
export function jsonScriptPayload(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e");
}
