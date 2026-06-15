/**
 * Forms v4 render path — the four layout presets (card, inline, split,
 * conversational) over the shared field renderers and the derived theme.
 *
 * Output is SSR HTML. The page carries exactly one executable script (the
 * constant runtime); per-form data travels in a non-executable JSON island, so
 * the serving runtime can publish a single stable `script-src 'sha256-…'`
 * allowance. The fragment (Shadow DOM embed) ships zero executable scripts —
 * inline scripts do not run inside a shadow root — so the loader owns embed
 * interactivity. Every form works with scripts disabled.
 *
 * See docs/plans/2026-06-11-forms-v4-parametric-theming.md and docs/DESIGN.md.
 */

import type {
  FormContent,
  LayoutPresetId,
  PublishedFormDoc,
} from "../schema/definition.js";
import type { ButtonStyle } from "../theme.js";
import { escapeAttr, escapeHtml, jsonScriptPayload } from "./escape.js";
import { FILE_ACCEPT, renderField } from "./fields.js";
import { formCss, themeVarsCss } from "./css.js";
import { EMBEDDED_FONT_CSS } from "./fonts.generated.js";
import { FORM_RUNTIME_SCRIPT } from "./runtime-script.js";

export { FORM_RUNTIME_SCRIPT } from "./runtime-script.js";

/**
 * Advisory client-side cap for a submission attachment, mirroring the API
 * default (`StorageService.maxBytesFor(SUBMISSION_ATTACHMENT)`). The API is the
 * authority; this only spares an obviously-too-large upload a round trip.
 */
export const FILE_MAX_BYTES = 100 * 1024 * 1024;

export interface RenderedForm {
  /** The HTML — a full document for `renderPublishedFormPage`, a fragment for the embed. */
  html: string;
  /**
   * Raw JS of every executable inline `<script>` in `html`. The serving runtime
   * hashes these into its CSP `script-src`. Empty for the embed fragment.
   */
  inlineScripts: string[];
  /**
   * True when the rendered form has at least one file question and can upload
   * (page, not the submitted state). The serving runtime widens `connect-src`
   * for the upload-intent + presigned PUT only when this is set.
   */
  requiresUpload: boolean;
}

export interface RenderFormOptions {
  /** The form's path on its host, e.g. `/feedback`. Drives the submit action. Default `/`. */
  formPath?: string;
  /**
   * Absolute submit URL. Overrides `formPath` for the form `action` — embeds
   * post cross-origin to the collect host, so they need a fully-qualified URL.
   */
  actionUrl?: string;
  /** Render the post-submit success panel instead of the form. */
  submitted?: boolean;
  /** Brand-name fallback when `content.brandName` is empty (usually the project name). */
  brandFallback?: string | null;
  /** Show the "Powered by Semblia" watermark. Default true. */
  watermark?: boolean;
}

const SCOPE_CLASS: Record<LayoutPresetId, string> = {
  card: "sf-card",
  inline: "sf-inline",
  split: "sf-split",
  conversational: "sf-conv",
};

const PAGE_CSS =
  ".sf-page{min-height:100vh;margin:0;background:var(--tf-bg);" +
  "display:grid;place-items:start center;padding:clamp(16px,4vw,56px)}";

/** Only http(s) and image data URLs may reach an `src`/`href` from customer config. */
function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^data:image\//i.test(v)) return v;
  return null;
}

function buttonStyleOf(doc: PublishedFormDoc): ButtonStyle {
  const scheme = doc.derived.schemes.light ?? doc.derived.schemes.dark;
  return scheme?.buttonStyle ?? "solid";
}

function submitAction(formPath: string): string {
  const path = formPath.replace(/\/+$/, "");
  return path ? `${path}/__submit` : "/__submit";
}

function uploadAction(formPath: string): string {
  const path = formPath.replace(/\/+$/, "");
  return path ? `${path}/__upload` : "/__upload";
}

function hasFileQuestion(doc: PublishedFormDoc): boolean {
  return doc.structure.questions.some((q) => q.type === "file");
}

function renderHeader(
  content: FormContent,
  brandFallback?: string | null,
): string {
  const brand = content.brandName.trim() || (brandFallback ?? "").trim();
  const logo = safeUrl(content.logoUrl);
  const parts: string[] = [];
  if (logo) {
    parts.push(
      `<img class="sf-logo" src="${escapeAttr(logo)}" alt="${escapeAttr(brand || "Logo")}">`,
    );
  }
  if (brand) parts.push(`<p class="sf-brand">${escapeHtml(brand)}</p>`);
  if (content.headline.trim()) {
    parts.push(`<h1 class="sf-headline">${escapeHtml(content.headline)}</h1>`);
  }
  if (content.subhead.trim()) {
    parts.push(`<p class="sf-subhead">${escapeHtml(content.subhead)}</p>`);
  }
  return parts.length ? `<div class="sf-header">${parts.join("")}</div>` : "";
}

/** The split preset's side panel, per its `panelContent` knob. */
function renderSplitAside(doc: PublishedFormDoc, header: string): string {
  const o = doc.layout.options;
  if (o.panelContent === "quote") {
    const quote = o.quoteText.trim()
      ? escapeHtml(o.quoteText)
      : "Add a short testimonial quote to feature here.";
    const author = o.quoteAuthor.trim()
      ? `<figcaption class="sf-aside-author">${escapeHtml(o.quoteAuthor)}</figcaption>`
      : "";
    return `<figure class="sf-aside-quote"><blockquote>${quote}</blockquote>${author}</figure>`;
  }
  if (o.panelContent === "blurb") {
    const blurb = o.blurb.trim()
      ? escapeHtml(o.blurb)
      : "Add a short message to display alongside your form.";
    return `<div class="sf-aside-blurb">${blurb}</div>`;
  }
  return header;
}

/** Per-layout knobs that drive CSS, emitted as scope data-attributes. */
function layoutDataAttrs(doc: PublishedFormDoc): string {
  const o = doc.layout.options;
  const preset = doc.layout.preset;
  const a: string[] = [`data-align="${o.align}"`, `data-width="${o.width}"`];
  if (preset === "inline" && !o.showHeader) a.push("data-noheader");
  if (preset === "split") {
    a.push(`data-side="${o.side}"`, `data-fill="${o.panelFill}"`);
    a.push(`data-ratio="${o.panelRatio}"`);
  }
  if (preset === "conversational") a.push(`data-progress="${o.progress}"`);
  return a.join(" ");
}

function renderSuccess(content: FormContent): string {
  const { success } = content;
  const cta =
    success.action === "cta" && safeUrl(success.ctaUrl)
      ? `<a class="sf-success-cta" href="${escapeAttr(safeUrl(success.ctaUrl) as string)}">${escapeHtml(success.ctaLabel || "Continue")}</a>`
      : "";
  return (
    `<div class="sf-success" role="status">` +
    `<div class="sf-success-mark" aria-hidden="true">` +
    `<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></div>` +
    `<h2 class="sf-success-title">${escapeHtml(success.title)}</h2>` +
    `<p class="sf-success-msg">${escapeHtml(success.message)}</p>${cta}</div>`
  );
}

function renderForm(
  doc: PublishedFormDoc,
  opts: RenderFormOptions,
  interactive: boolean,
): string {
  const { content, structure } = doc;
  const fields = structure.questions
    .map((q) => renderField(q, interactive))
    .join("");
  const style = buttonStyleOf(doc);
  const action = opts.actionUrl ?? submitAction(opts.formPath ?? "/");
  const submit =
    `<div class="sf-actions">` +
    `<button type="submit" class="sf-submit sf-submit-${style}">${escapeHtml(content.submitLabel)}</button>` +
    `</div>`;
  return (
    `<form class="sf-form" method="post" action="${escapeAttr(action)}" accept-charset="utf-8">` +
    `<div class="sf-fields">${fields}</div>${submit}</form>`
  );
}

function configIsland(doc: PublishedFormDoc, uploadUrl: string | null): string {
  const showIf: Record<string, unknown> = {};
  for (const q of doc.structure.questions) {
    if (q.showIf) showIf[q.id] = q.showIf;
  }
  const cfg: Record<string, unknown> = {
    conversational: doc.layout.preset === "conversational",
    showIf,
  };
  // Only forms with a file question carry upload config; the constant runtime
  // reads it to presign + PUT each chosen file before submit.
  if (uploadUrl && hasFileQuestion(doc)) {
    cfg.upload = {
      url: uploadUrl,
      maxBytes: FILE_MAX_BYTES,
      accept: FILE_ACCEPT,
    };
  }
  return `<script type="application/json" data-sf-config>${jsonScriptPayload(cfg)}</script>`;
}

function watermark(show: boolean): string {
  if (!show) return "";
  return (
    `<p class="sf-footer">Powered by ` +
    `<a href="https://semblia.com" target="_blank" rel="noopener noreferrer">Semblia</a></p>`
  );
}

/**
 * The self-contained `@font-face` for the form's type pairing (subset woff2,
 * data-URI) so the served page carries its own brand font with no external
 * request — identical in the studio iframe preview and production. Embeds keep
 * the host page's fonts (`system`/`inherit` pairings) and never load this.
 */
function fontFaceCss(doc: PublishedFormDoc): string {
  return EMBEDDED_FONT_CSS[doc.theme.inputs.typePairing] ?? "";
}

/** Build the markup inside the `.sf-scope` element (shared by page + fragment). */
function renderScopeInner(
  doc: PublishedFormDoc,
  opts: RenderFormOptions,
  mode: { pageCss: boolean; interactive: boolean; uploadUrl?: string | null },
): string {
  const preset = doc.layout.preset;
  const styleCss =
    (mode.pageCss ? fontFaceCss(doc) : "") +
    themeVarsCss(doc.derived) +
    formCss(preset) +
    (mode.pageCss ? PAGE_CSS : "");
  const header = renderHeader(doc.content, opts.brandFallback);
  const body = opts.submitted
    ? renderSuccess(doc.content)
    : renderForm(doc, opts, mode.interactive);
  const footer = watermark(opts.watermark !== false);

  const root =
    preset === "split"
      ? `<div class="sf-root"><div class="sf-aside">${renderSplitAside(doc, header)}</div>` +
        `<div class="sf-main">${body}${footer}</div></div>`
      : `<div class="sf-root">${header}${body}${footer}</div>`;

  // The config island feeds the executable runtime; only the page runs it.
  const island =
    mode.interactive && !opts.submitted
      ? configIsland(doc, mode.uploadUrl ?? null)
      : "";
  return `<style>${styleCss}</style>${root}${island}`;
}

/**
 * Render a complete hosted form document (served at the collect host). Native
 * POST submit; one executable runtime script returned for CSP hashing.
 */
export function renderPublishedFormPage(
  doc: PublishedFormDoc,
  opts: RenderFormOptions = {},
): RenderedForm {
  const preset = doc.layout.preset;
  const brand =
    doc.content.brandName.trim() || (opts.brandFallback ?? "").trim();
  const title = doc.content.headline.trim() || brand || "Feedback";
  const uploadUrl = uploadAction(opts.formPath ?? "/");
  const inner = renderScopeInner(doc, opts, {
    pageCss: true,
    interactive: true,
    uploadUrl,
  });
  const script = opts.submitted
    ? ""
    : `<script>${FORM_RUNTIME_SCRIPT}</script>`;
  const html =
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<meta name="robots" content="index,follow">` +
    `<title>${escapeHtml(title)}</title></head>` +
    `<body class="sf-scope ${SCOPE_CLASS[preset]} sf-page" ${layoutDataAttrs(doc)}>${inner}${script}</body></html>`;
  return {
    html,
    inlineScripts: opts.submitted ? [] : [FORM_RUNTIME_SCRIPT],
    requiresUpload: !opts.submitted && hasFileQuestion(doc),
  };
}

/**
 * Render a self-contained Shadow DOM fragment for `<semblia-form>`. No
 * executable scripts — they do not run inside a shadow root — so the embed
 * loader owns submit interception and the form degrades to all-questions-shown
 * (no conditional reveal / stepping) when JS-driven enhancement is unavailable.
 */
export function renderPublishedFormFragment(
  doc: PublishedFormDoc,
  opts: RenderFormOptions = {},
): RenderedForm {
  const preset = doc.layout.preset;
  const inner = renderScopeInner(doc, opts, {
    pageCss: false,
    interactive: false,
  });
  const html = `<div class="sf-scope ${SCOPE_CLASS[preset]}" part="root" ${layoutDataAttrs(doc)}>${inner}</div>`;
  // Embeds run no script and cannot upload; file questions render a fallback.
  return { html, inlineScripts: [], requiresUpload: false };
}

// ── Legacy / safety surfaces ─────────────────────────────────────────────────

export class FormsV4NotImplementedError extends Error {
  readonly preset: string;

  constructor(preset: string) {
    super(`forms-v4: layout preset "${preset}" has no renderer`);
    this.name = "FormsV4NotImplementedError";
    this.preset = preset;
  }
}

/**
 * A self-contained "form unavailable" fragment for genuine outage/unpublished
 * states — NOT a styling fallback for the renderer. Kept script-free.
 */
export function renderFormStubFragmentHtml(
  opts: { brandName?: string | null } = {},
): string {
  const brand = opts.brandName?.trim()
    ? escapeHtml(opts.brandName.trim())
    : null;
  return `<div data-semblia-forms-v4-stub="true" part="root">
<style>
  [data-semblia-forms-v4-stub]{font:15px/1.55 ui-sans-serif,system-ui,sans-serif;
    color:#15181d;background:#f6f7f9;border:1px solid #e3e7ec;border-radius:12px;
    padding:2rem 1.5rem;text-align:center}
  @media (prefers-color-scheme:dark){[data-semblia-forms-v4-stub]{
    background:#101216;color:#e8eaee;border-color:#2a2e35}}
  [data-semblia-forms-v4-stub] strong{display:block;font-size:1.05rem;margin-bottom:.4rem}
  [data-semblia-forms-v4-stub] span{opacity:.72}
</style>
<strong>This form is unavailable</strong>
<span>${brand ? `${brand} ` : ""}is not collecting responses right now. Please check again soon.</span>
</div>`;
}

/** A complete, script-free "form unavailable" document for outage/unpublished states. */
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
<main>
  <h1>This form is unavailable</h1>
  <p>${brand ? `${brand} ` : ""}is not collecting responses right now — please check again soon.</p>
</main>
</body>
</html>
`;
}
