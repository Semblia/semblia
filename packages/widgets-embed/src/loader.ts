/**
 * Semblia widget embed loader.
 *
 * Usage:
 *   <script type="module" src="https://widgets.semblia.com/embed.js" async></script>
 *   <semblia-widget project="acme" widget="widget_123"></semblia-widget>
 */

const DEFAULT_API_BASE = "https://api.semblia.com/v2";
const ELEMENT_TAG = "semblia-widget";

export function widgetFragmentUrl(opts: {
  project: string;
  widget: string;
  apiBase?: string | null;
}): string {
  const base = (opts.apiBase || DEFAULT_API_BASE).replace(/\/+$/, "");
  const url = new URL(
    `${base}/widget-embeds/projects/${encodeURIComponent(opts.project)}/${encodeURIComponent(opts.widget)}/fragment`,
  );
  return url.toString();
}

function mountFragment(host: HTMLElement, html: string): void {
  const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  type UnsafeRoot = ShadowRoot & { setHTMLUnsafe?: (html: string) => void };
  const r = root as UnsafeRoot;
  if (typeof r.setHTMLUnsafe === "function") r.setHTMLUnsafe(html);
  else root.innerHTML = html;
}

function renderError(host: HTMLElement): void {
  mountFragment(
    host,
    `<div role="status" style="font:14px/1.5 ui-sans-serif,system-ui,sans-serif;
opacity:.65;padding:1rem;text-align:center">This widget could not be loaded.</div>`,
  );
}

export class SembliaWidgetElement extends HTMLElement {
  static observedAttributes = ["project", "widget", "api-base"];

  private abortController: AbortController | null = null;

  connectedCallback(): void {
    void this.load();
  }

  disconnectedCallback(): void {
    this.abortController?.abort();
  }

  attributeChangedCallback(_name: string, prev: string | null): void {
    if (this.isConnected && prev !== null) void this.load();
  }

  private async load(): Promise<void> {
    const project = this.getAttribute("project");
    const widget = this.getAttribute("widget");
    if (!project || !widget) {
      renderError(this);
      return;
    }

    this.abortController?.abort();
    const controller = new AbortController();
    this.abortController = controller;

    try {
      const response = await fetch(
        widgetFragmentUrl({
          project,
          widget,
          apiBase: this.getAttribute("api-base"),
        }),
        {
          signal: controller.signal,
          mode: "cors",
          credentials: "omit",
        },
      );
      if (!response.ok) throw new Error(`widget fetch ${response.status}`);
      mountFragment(this, await response.text());
      this.dispatchEvent(new CustomEvent("semblia:widget-load"));
    } catch (error) {
      if (controller.signal.aborted) return;
      renderError(this);
      this.dispatchEvent(
        new CustomEvent("semblia:widget-error", { detail: error }),
      );
    }
  }
}

export function register(): void {
  if (typeof window === "undefined" || !("customElements" in window)) return;
  if (!customElements.get(ELEMENT_TAG)) {
    customElements.define(ELEMENT_TAG, SembliaWidgetElement);
  }
}

register();
