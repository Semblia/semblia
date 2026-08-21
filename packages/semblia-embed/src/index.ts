/**
 * Loader for the Semblia embed runtimes. The runtimes themselves are
 * evergreen and CDN-only — this module only injects the `<script>` tags that
 * load them, exactly as the copy-paste embed snippets do, and dedupes so any
 * number of components on a page share one script per source.
 */

export const WIDGET_EMBED_SRC = "https://widgets.semblia.com/embed.js";
export const FORM_EMBED_SRC = "https://forms.semblia.com/embed.js";

export interface EnsureEmbedScriptOptions {
  /** Load as an ES module (`<script type="module">`). */
  module?: boolean;
}

/**
 * Idempotently append `<script src=... async>` to `document.head`. A script
 * tag with the same `src` — whether injected here or pasted by hand — counts
 * as already loaded. No-op outside the browser (SSR-safe).
 */
export function ensureEmbedScript(
  src: string,
  options: EnsureEmbedScriptOptions = {},
): void {
  if (typeof document === "undefined") return;
  if (document.querySelector(`script[src="${src}"]`)) return;

  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  if (options.module) script.type = "module";
  document.head.appendChild(script);
}

/** Load the `<semblia-widget>` runtime from the widgets CDN. */
export function ensureWidgetEmbed(): void {
  ensureEmbedScript(WIDGET_EMBED_SRC, { module: true });
}

/** Load the `<semblia-form>` runtime from the forms host. */
export function ensureFormEmbed(): void {
  ensureEmbedScript(FORM_EMBED_SRC);
}
