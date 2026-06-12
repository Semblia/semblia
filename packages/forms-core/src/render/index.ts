/**
 * Forms v4 render entrypoint — LOUD STUB.
 *
 * The freeform renderer was deleted with the parametric-theming decision
 * (docs/plans/2026-06-11-forms-v4-parametric-theming.md). The four layout
 * preset renderers (card, inline, split, conversational) land in the next,
 * UI-focused session. Until then every render call is an explicit,
 * unmistakable stub — never a silent fallback.
 */

import type { PublishedFormDoc } from "../schema/definition.js";

export class FormsV4NotImplementedError extends Error {
  readonly preset: string;

  constructor(preset: string) {
    super(
      `forms-v4: layout preset "${preset}" has no renderer yet — ` +
        "rendering is deferred to the UI session (see docs/plans/2026-06-11-forms-v4-parametric-theming.md)",
    );
    this.name = "FormsV4NotImplementedError";
    this.preset = preset;
  }
}

/**
 * Will dispatch to the layout preset renderers once they exist. Today it
 * always throws so no caller can accidentally ship an unstyled form.
 */
export function renderPublishedFormHtml(doc: PublishedFormDoc): never {
  throw new FormsV4NotImplementedError(doc.layout.preset);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * The interim embed fragment: the same loud stub as a self-contained element
 * for Shadow DOM mounting. The inline <style> is scoped by the shadow
 * boundary — it cannot leak into the host page, and host CSS cannot reach in.
 */
export function renderFormStubFragmentHtml(
  opts: { brandName?: string | null } = {},
): string {
  const brand = opts.brandName?.trim()
    ? escapeHtml(opts.brandName.trim())
    : null;
  return `<div data-semblia-forms-v4-stub="true" part="root">
<!-- SEMBLIA FORMS V4 STUB — parametric renderer not yet implemented -->
<style>
  [data-semblia-forms-v4-stub]{font:15px/1.55 ui-sans-serif,system-ui,sans-serif;
    color:#15181d;background:#f6f7f9;border:1px solid #e3e7ec;border-radius:12px;
    padding:2rem 1.5rem;text-align:center}
  @media (prefers-color-scheme:dark){[data-semblia-forms-v4-stub]{
    background:#101216;color:#e8eaee;border-color:#2a2e35}}
  [data-semblia-forms-v4-stub] strong{display:block;font-size:1.05rem;margin-bottom:.4rem}
  [data-semblia-forms-v4-stub] span{opacity:.72}
</style>
<strong>This form is being rebuilt</strong>
<span>${brand ? `${brand} is upgrading this form. ` : ""}It will be back shortly.</span>
</div>`;
}

/**
 * The interim hosted page: a complete, self-contained, deliberately loud
 * "this form is being rebuilt" document. Zero scripts (CSP: script-src 'none'),
 * zero webfonts, < 2 KB on the wire.
 */
export function renderFormStubPageHtml(
  opts: { brandName?: string | null } = {},
): string {
  const brand = opts.brandName?.trim()
    ? escapeHtml(opts.brandName.trim())
    : null;
  const title = brand ? `${brand} — form unavailable` : "Form unavailable";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<style>
  :root{color-scheme:light dark}
  body{margin:0;min-height:100vh;display:grid;place-items:center;
    font:16px/1.55 ui-sans-serif,system-ui,sans-serif;
    background:#f6f7f9;color:#15181d}
  @media (prefers-color-scheme:dark){body{background:#101216;color:#e8eaee}}
  main{max-width:26rem;padding:2.5rem;text-align:center}
  h1{font-size:1.15rem;margin:0 0 .5rem}
  p{margin:0;opacity:.72}
</style>
</head>
<body data-semblia-forms-v4-stub="true">
<!-- SEMBLIA FORMS V4 STUB — parametric renderer not yet implemented -->
<main>
  <h1>This form is being rebuilt</h1>
  <p>${brand ? `${brand} is upgrading this form. ` : ""}It will be back shortly — please check again soon.</p>
</main>
</body>
</html>
`;
}
