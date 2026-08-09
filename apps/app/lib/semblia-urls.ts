/**
 * The shared-asset embed sources and copy-paste snippets — service hosts,
 * not tenant surfaces. Every *tenant* URL (hosted forms, walls) comes from
 * API-issued `PublicSurfaceHost` rows via `lib/public-hosts.ts`; the
 * slug-derived generators that used to live here are gone (WS-A1).
 */

/** The `<script>` source that loads the form embed runtime (iframe loader). */
export const FORM_EMBED_SRC = "https://forms.semblia.com/embed.js";

/**
 * The copy-paste HTML snippet for an embed-delivery form: loader script +
 * custom element. `project` is the project id (public embed resolution is
 * projectId-scoped until host-based resolution lands).
 */
export function formEmbedSnippet(project: string, formSlug: string): string {
  return `<script src="${FORM_EMBED_SRC}" async></script>
<semblia-form project="${project}" form="${formSlug}"></semblia-form>`;
}

/** The `<script>` source that loads the widget embed runtime. */
export const WIDGET_EMBED_SRC = "https://widgets.semblia.com/embed.js";

/** The copy-paste HTML embed snippet for a widget: loader script + custom element. */
export function widgetEmbedSnippet(project: string, widgetId: string): string {
  return `<script type="module" src="${WIDGET_EMBED_SRC}" async></script>
<semblia-widget project="${project}" widget="${widgetId}"></semblia-widget>`;
}
