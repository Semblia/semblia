import {
  normalizeWidgetAccents,
  resolveWidgetTemplateManifest,
} from "../templates.js";
import { widgetThemeVarsCss } from "../theme.js";
import type { PublishedWidgetDoc } from "../schema/definition.js";

/**
 * Widget stylesheets: shared card bones + one personality layer per template,
 * with accent decisions scoped by the `data-sw-a-*` attributes the renderer
 * stamps. All values resolve from the AA-clamped `--semblia-widget-*` vars.
 */

const BASE_CSS = `
.sw-scope{font-family:var(--semblia-widget-font,ui-sans-serif,system-ui,sans-serif);
  color:var(--semblia-widget-text);background:var(--semblia-widget-bg);
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;line-height:1.5}
.sw-scope *,.sw-scope *::before,.sw-scope *::after{box-sizing:border-box}
.sw-root{width:100%;margin:0 auto}
.sw-card{background:var(--semblia-widget-surface);border:var(--semblia-widget-border-width) solid var(--semblia-widget-border);
  border-radius:var(--semblia-widget-radius-card);box-shadow:var(--semblia-widget-shadow);
  padding:calc(var(--semblia-widget-space)*1.35);color:var(--semblia-widget-text);
  break-inside:avoid;display:flex;flex-direction:column;gap:calc(var(--semblia-widget-space)*.9);min-width:0}
.sw-card-header{display:flex;align-items:center;gap:10px;min-width:0}
.sw-avatar{width:38px;height:38px;border-radius:50%;background:var(--semblia-widget-accent-soft);
  color:var(--semblia-widget-accent-soft-text);display:grid;place-items:center;font-size:.78rem;font-weight:650;overflow:hidden;flex:0 0 auto}
.sw-avatar img{width:100%;height:100%;object-fit:cover}
.sw-author{min-width:0;flex:1}
.sw-name{font-size:.95rem;font-weight:650;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sw-meta{margin-top:2px;font-size:.78rem;color:var(--semblia-widget-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sw-stars{display:inline-flex;gap:2px;color:var(--semblia-widget-accent);font-size:.85rem;line-height:1;flex:0 0 auto}
.sw-quote{margin:0;color:var(--semblia-widget-text);font-size:1rem;line-height:1.58}
.sw-footer{display:flex;gap:6px;align-items:center;color:var(--semblia-widget-text-muted);font-size:.78rem}
.sw-powered{margin-top:var(--semblia-widget-section-gap);text-align:center;font-size:.75rem;color:var(--semblia-widget-text-muted)}
.sw-powered a{color:inherit;text-decoration:none;font-weight:600}
.sw-empty{padding:2rem;text-align:center;border:1px dashed var(--semblia-widget-border-strong);
  border-radius:var(--semblia-widget-radius);color:var(--semblia-widget-text-muted)}
.sw-wall-head{margin:0 0 var(--semblia-widget-section-gap);max-width:48rem}
.sw-wall-title{font-size:clamp(1.4rem,4vw,2.4rem);line-height:1.05;margin:0;color:var(--semblia-widget-text)}
.sw-wall-subhead{margin:.65rem 0 0;color:var(--semblia-widget-text-muted);font-size:1rem}
@media (prefers-reduced-motion:reduce){.sw-scope *,.sw-scope *::before,.sw-scope *::after{
  animation-duration:.01ms!important;transition-duration:.01ms!important}}
`.trim();

/** Marquee — a cinematic rail. Spotlight mode reads one pull quote at a time. */
const MARQUEE_CSS = `
.sw-marquee{overflow:hidden}
.sw-marquee-track{display:grid;gap:var(--semblia-widget-gap);grid-auto-flow:column;
  grid-auto-columns:minmax(260px,1fr);overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:4px}
.sw-marquee .sw-card{scroll-snap-align:start}
.sw-scope[data-sw-a-mode="spotlight"] .sw-marquee-track{grid-auto-columns:min(100%,560px)}
.sw-scope[data-sw-a-mode="spotlight"] .sw-card{padding:calc(var(--semblia-widget-space)*2);text-align:center;align-items:center}
.sw-scope[data-sw-a-mode="spotlight"] .sw-card-header{flex-direction:column;gap:8px}
.sw-scope[data-sw-a-mode="spotlight"] .sw-quote{font-size:1.18rem;line-height:1.6}
`.trim();

/** Gallery — a crisp, even grid; "featured" leads with a full-width hero row. */
const GALLERY_CSS = `
.sw-gallery{display:grid;gap:var(--semblia-widget-gap);grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.sw-scope[data-sw-a-lead="featured"] .sw-gallery .sw-card:first-child{grid-column:1/-1;
  padding:calc(var(--semblia-widget-space)*1.9)}
.sw-scope[data-sw-a-lead="featured"] .sw-gallery .sw-card:first-child .sw-quote{font-size:1.22rem;line-height:1.55}
`.trim();

/** Mosaic — masonry volume; the dense weave tightens columns and voice. */
const MOSAIC_CSS = `
.sw-mosaic{display:block;columns:3 220px;column-gap:var(--semblia-widget-gap)}
.sw-mosaic .sw-card{margin:0 0 var(--semblia-widget-gap)}
.sw-scope[data-sw-a-weave="dense"] .sw-mosaic{columns:4 180px}
.sw-scope[data-sw-a-weave="dense"] .sw-card{padding:calc(var(--semblia-widget-space)*1.05);gap:calc(var(--semblia-widget-space)*.7)}
.sw-scope[data-sw-a-weave="dense"] .sw-quote{font-size:.92rem;line-height:1.5}
`.trim();

/** Column — an article column; the quotes voice drops card chrome for hairlines. */
const COLUMN_CSS = `
.sw-column{display:grid;gap:var(--semblia-widget-gap);grid-template-columns:1fr;max-width:46rem}
.sw-scope[data-sw-a-voice="quotes"] .sw-column{gap:0}
.sw-scope[data-sw-a-voice="quotes"] .sw-card{background:transparent;border:0;box-shadow:none;border-radius:0;
  padding:calc(var(--semblia-widget-space)*1.5) 0;border-bottom:1px solid var(--semblia-widget-border)}
.sw-scope[data-sw-a-voice="quotes"] .sw-card:last-child{border-bottom:0}
.sw-scope[data-sw-a-voice="quotes"] .sw-quote{font-size:1.12rem;line-height:1.65}
.sw-scope[data-sw-a-voice="quotes"] .sw-quote::before{content:"“";color:var(--semblia-widget-accent);
  font-size:1.4em;line-height:0;vertical-align:-.35em;margin-right:2px}
`.trim();

/** Editorial — the magazine wall; staggered rhythm offsets middle columns. */
const EDITORIAL_CSS = `
.sw-editorial-grid{display:grid;gap:var(--semblia-widget-gap);
  grid-template-columns:repeat(auto-fit,minmax(230px,1fr));align-items:start}
.sw-editorial-grid .sw-card{padding:calc(var(--semblia-widget-space)*1.6)}
.sw-editorial-grid .sw-quote{font-size:1.06rem;line-height:1.62}
.sw-scope[data-sw-a-rhythm="staggered"] .sw-editorial-grid .sw-card:nth-child(3n+2){transform:translateY(12px)}
@media (max-width:640px){.sw-scope[data-sw-a-rhythm="staggered"] .sw-editorial-grid .sw-card:nth-child(3n+2){transform:none}}
`.trim();

const TEMPLATE_CSS: Record<string, string> = {
  marquee: MARQUEE_CSS,
  gallery: GALLERY_CSS,
  mosaic: MOSAIC_CSS,
  column: COLUMN_CSS,
  editorial: EDITORIAL_CSS,
};

export function widgetCss(doc: PublishedWidgetDoc): string {
  const manifest = resolveWidgetTemplateManifest(doc.templateId);
  // Accents are normalized here so stored junk can never select stray CSS.
  void normalizeWidgetAccents(manifest, doc.accents);
  return [
    widgetThemeVarsCss(doc.derived.derivedTheme),
    BASE_CSS,
    TEMPLATE_CSS[manifest.id] ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}
