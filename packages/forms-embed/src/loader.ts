/**
 * The Semblia forms embed loader — everything that ships to a host page.
 *
 * Design constraints (docs/plans/2026-06-11-forms-v4-parametric-theming.md §4):
 *  - dependency-free, framework-free; the bundle budget is 3 KB gzipped and
 *    is enforced at build time (scripts/bundle.mjs fails the build over it).
 *  - one round trip: the runtime returns an SSR'd fragment carrying markup,
 *    scoped styles, and (once preset renderers land) config together.
 *  - Shadow DOM isolation: host CSS cannot bleed in, ours cannot leak out.
 *    The mount strategy is behind `mountFragment` so an iframe fallback can
 *    be added without touching the element contract.
 *
 * Usage on a host page:
 *   <script type="module" src="https://collect.semblia.com/embed.js" async></script>
 *   <semblia-form project="acme" form="feedback"></semblia-form>
 */

const DEFAULT_BASE_DOMAIN = "collect.semblia.com";
const ELEMENT_TAG = "semblia-form";

/** Build the fragment URL for a project/form pair. Exported for tests. */
export function embedFragmentUrl(opts: {
  project: string;
  form?: string | null;
  baseDomain?: string | null;
}): string {
  const domain = (opts.baseDomain || DEFAULT_BASE_DOMAIN).replace(/\/+$/, "");
  const form = (opts.form ?? "").replace(/^\/+|\/+$/g, "");
  const path = form ? `/${encodeURIComponent(form)}/__embed` : "/__embed";
  return `https://${encodeURIComponent(opts.project)}.${domain}${path}`;
}

/** Mount strategy seam — Shadow DOM today, iframe fallback possible later. */
function mountFragment(host: HTMLElement, html: string): void {
  const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  // setHTMLUnsafe preserves declarative shadow DOM in future fragments;
  // innerHTML is the broad-support fallback. The fragment is produced solely
  // by the Semblia runtime (escaped server-side), never from host input.
  type UnsafeRoot = ShadowRoot & { setHTMLUnsafe?: (html: string) => void };
  const r = root as UnsafeRoot;
  if (typeof r.setHTMLUnsafe === "function") r.setHTMLUnsafe(html);
  else root.innerHTML = html;
}

function renderError(host: HTMLElement): void {
  mountFragment(
    host,
    `<div role="status" style="font:14px/1.5 ui-sans-serif,system-ui,sans-serif;
opacity:.65;padding:1rem;text-align:center">This form could not be loaded.</div>`,
  );
}

export class SembliaFormElement extends HTMLElement {
  static observedAttributes = ["project", "form", "base-domain"];

  private abortController: AbortController | null = null;
  private fragmentUrl = "";

  connectedCallback(): void {
    void this.load();
  }

  disconnectedCallback(): void {
    this.abortController?.abort();
  }

  attributeChangedCallback(_name: string, prev: string | null): void {
    // Initial attribute set fires before connection; only live changes reload.
    if (this.isConnected && prev !== null) void this.load();
  }

  private async load(): Promise<void> {
    const project = this.getAttribute("project");
    if (!project) {
      renderError(this);
      return;
    }
    this.abortController?.abort();
    const controller = new AbortController();
    this.abortController = controller;
    this.fragmentUrl = embedFragmentUrl({
      project,
      form: this.getAttribute("form"),
      baseDomain: this.getAttribute("base-domain"),
    });
    try {
      const response = await fetch(this.fragmentUrl, {
        signal: controller.signal,
        mode: "cors",
        credentials: "omit",
      });
      if (!response.ok) throw new Error(`embed fetch ${response.status}`);
      mountFragment(this, await response.text());
      this.wireForm();
      this.dispatchEvent(new CustomEvent("semblia:load"));
    } catch (error) {
      if (controller.signal.aborted) return;
      renderError(this);
      this.dispatchEvent(new CustomEvent("semblia:error", { detail: error }));
    }
  }

  /**
   * Intercept the fragment's native submit so the host page never navigates.
   * The form posts cross-origin (urlencoded → a CORS "simple" request, no
   * preflight); on success we swap in the server-rendered success fragment.
   */
  private wireForm(): void {
    const form = this.shadowRoot?.querySelector("form");
    if (!form) return;
    form.addEventListener("submit", (event) => {
      if (!form.reportValidity()) return;
      event.preventDefault();
      void this.submit(form);
    });
  }

  private async submit(form: HTMLFormElement): Promise<void> {
    const button = form.querySelector<HTMLButtonElement>("button[type=submit]");
    if (button) button.disabled = true;
    try {
      const params = new URLSearchParams();
      new FormData(form).forEach((value, key) => {
        if (typeof value === "string") params.append(key, value);
      });
      const response = await fetch(form.action, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        body: params,
      });
      if (!response.ok) throw new Error(`embed submit ${response.status}`);
      const sep = this.fragmentUrl.includes("?") ? "&" : "?";
      const done = await fetch(`${this.fragmentUrl}${sep}submitted=1`, {
        mode: "cors",
        credentials: "omit",
      });
      mountFragment(this, await done.text());
      this.dispatchEvent(new CustomEvent("semblia:submit"));
    } catch (error) {
      if (button) button.disabled = false;
      this.dispatchEvent(new CustomEvent("semblia:error", { detail: error }));
    }
  }
}

/** Idempotent registration; importing the bundle registers automatically. */
export function register(): void {
  if (typeof window === "undefined" || !("customElements" in window)) return;
  if (!customElements.get(ELEMENT_TAG)) {
    customElements.define(ELEMENT_TAG, SembliaFormElement);
  }
}

register();
