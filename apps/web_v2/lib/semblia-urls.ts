/**
 * Canonical public Semblia surface URLs — hosted forms and widget embeds.
 *
 * Centralized so a domain change is a one-line edit instead of a repo-wide grep,
 * and so the copy-paste embed snippet is guaranteed identical everywhere a user
 * can copy it (forms list, widget list, and the share drawers).
 */

/** Hosted-form base without scheme, e.g. `"forms.semblia.com/f"`. */
export const HOSTED_FORM_BASE = "forms.semblia.com/f";

/** Public hosted-form URL (no scheme), e.g. `hostedFormUrl("abc")` → `forms.semblia.com/f/abc`. */
export function hostedFormUrl(slug: string): string {
  return `${HOSTED_FORM_BASE}/${slug}`;
}

/** Public hosted-form URL including scheme for hrefs and clipboard values. */
export function hostedFormLink(slug: string): string {
  return `https://${hostedFormUrl(slug)}`;
}

/** The `<script>` source that loads the widget embed runtime. */
export const WIDGET_EMBED_SRC = "https://widgets.semblia.com/embed.js";

/** The copy-paste HTML embed snippet for a widget: loader script + custom element. */
export function widgetEmbedSnippet(project: string, widgetId: string): string {
  return `<script type="module" src="${WIDGET_EMBED_SRC}" async></script>
<semblia-widget project="${project}" widget="${widgetId}"></semblia-widget>`;
}

/** Hosted preview/share URL for a single widget. */
export function widgetPreviewUrl(widgetId: string): string {
  return `https://embed.semblia.com/preview/${widgetId}`;
}

/** Public hosted-wall base without scheme, e.g. `semblia.com/wall`. */
export const HOSTED_WALL_BASE = "semblia.com/wall";

/** Public wall URL (no scheme), e.g. `wallUrl("acme-love")` → `semblia.com/wall/acme-love`. */
export function wallUrl(slug: string): string {
  return `${HOSTED_WALL_BASE}/${slug}`;
}

/** Public wall URL including scheme for hrefs, clipboard, and canonical tags. */
export function wallLink(slug: string): string {
  return `https://${wallUrl(slug)}`;
}

/** App-relative wall path — works on any deployment (dev, preview, prod). */
export function wallPath(slug: string): string {
  return `/wall/${encodeURIComponent(slug)}`;
}
