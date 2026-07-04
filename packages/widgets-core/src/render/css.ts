import {
  normalizeLayoutVariant,
  type WidgetLayoutPresetId,
} from "../schema/definition.js";
import { widgetThemeVarsCss } from "../theme.js";
import type { PublishedWidgetDoc } from "../schema/definition.js";

const BASE_CSS = `
.sw-scope{font-family:var(--semblia-widget-font,ui-sans-serif,system-ui,sans-serif);
  color:var(--semblia-widget-text);background:var(--semblia-widget-bg);
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;line-height:1.5}
.sw-scope *,.sw-scope *::before,.sw-scope *::after{box-sizing:border-box}
.sw-root{width:100%;margin:0 auto}
.sw-list,.sw-grid,.sw-masonry,.sw-carousel-track,.sw-wall-grid{display:grid;gap:var(--semblia-widget-gap)}
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
`.trim();

const CAROUSEL_CSS = `
.sw-carousel{overflow:hidden}
.sw-carousel-track{grid-auto-flow:column;grid-auto-columns:minmax(260px,1fr);overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:4px}
.sw-carousel .sw-card{scroll-snap-align:start}
`.trim();

const GRID_CSS = `
.sw-grid{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
`.trim();

const MASONRY_CSS = `
.sw-masonry{display:block;columns:3 220px;column-gap:var(--semblia-widget-gap)}
.sw-masonry .sw-card{margin:0 0 var(--semblia-widget-gap)}
`.trim();

const LIST_CSS = `
.sw-list{grid-template-columns:1fr;max-width:46rem}
`.trim();

const WALL_CSS = `
.sw-wall-head{margin:0 0 var(--semblia-widget-section-gap);max-width:48rem}
.sw-wall-title{font-size:clamp(1.4rem,4vw,2.4rem);line-height:1.05;margin:0;color:var(--semblia-widget-text)}
.sw-wall-subhead{margin:.65rem 0 0;color:var(--semblia-widget-text-muted);font-size:1rem}
.sw-wall-grid{grid-template-columns:repeat(auto-fit,minmax(190px,1fr));align-items:start}
.sw-wall-grid .sw-card:nth-child(3n+2){transform:translateY(12px)}
@media (max-width:640px){.sw-wall-grid .sw-card:nth-child(3n+2){transform:none}}
`.trim();

const PRESET_CSS: Record<WidgetLayoutPresetId, string> = {
  carousel: CAROUSEL_CSS,
  grid: GRID_CSS,
  masonry: MASONRY_CSS,
  list: LIST_CSS,
  wall: WALL_CSS,
};

/**
 * Variant CSS — keyed `preset/variant`, scoped by the data-sw-variant attr the
 * renderer stamps on the scope element. "classic" variants add nothing.
 */
const VARIANT_CSS: Record<string, string> = {
  // One testimonial per view, read like a pull quote.
  "carousel/spotlight": `
.sw-scope[data-sw-variant="spotlight"] .sw-carousel-track{grid-auto-columns:min(100%,560px)}
.sw-scope[data-sw-variant="spotlight"] .sw-card{padding:calc(var(--semblia-widget-space)*2);text-align:center;align-items:center}
.sw-scope[data-sw-variant="spotlight"] .sw-card-header{flex-direction:column;gap:8px}
.sw-scope[data-sw-variant="spotlight"] .sw-quote{font-size:1.18rem;line-height:1.6}
`.trim(),

  // The first (strongest) quote becomes a full-width hero row.
  "grid/featured": `
.sw-scope[data-sw-variant="featured"] .sw-grid .sw-card:first-child{grid-column:1/-1;
  padding:calc(var(--semblia-widget-space)*1.9)}
.sw-scope[data-sw-variant="featured"] .sw-grid .sw-card:first-child .sw-quote{font-size:1.22rem;line-height:1.55}
`.trim(),

  // Tighter columns for volume — more proof per viewport.
  "masonry/dense": `
.sw-scope[data-sw-variant="dense"] .sw-masonry{columns:4 180px}
.sw-scope[data-sw-variant="dense"] .sw-card{padding:calc(var(--semblia-widget-space)*1.05);gap:calc(var(--semblia-widget-space)*.7)}
.sw-scope[data-sw-variant="dense"] .sw-quote{font-size:.92rem;line-height:1.5}
`.trim(),

  // Editorial: no card chrome, quotes separated by hairlines.
  "list/quotes": `
.sw-scope[data-sw-variant="quotes"] .sw-list{gap:0}
.sw-scope[data-sw-variant="quotes"] .sw-card{background:transparent;border:0;box-shadow:none;border-radius:0;
  padding:calc(var(--semblia-widget-space)*1.5) 0;border-bottom:1px solid var(--semblia-widget-border)}
.sw-scope[data-sw-variant="quotes"] .sw-card:last-child{border-bottom:0}
.sw-scope[data-sw-variant="quotes"] .sw-quote{font-size:1.08rem;line-height:1.62}
`.trim(),

  // Calm wall: no stagger, wider columns, roomier voice.
  "wall/editorial": `
.sw-scope[data-sw-variant="editorial"] .sw-wall-grid{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.sw-scope[data-sw-variant="editorial"] .sw-wall-grid .sw-card{transform:none;padding:calc(var(--semblia-widget-space)*1.7)}
.sw-scope[data-sw-variant="editorial"] .sw-quote{font-size:1.1rem;line-height:1.62}
`.trim(),
};

export function widgetCss(doc: PublishedWidgetDoc): string {
  const variant = normalizeLayoutVariant(doc.layout.preset, doc.layout.variant);
  const variantCss = VARIANT_CSS[`${doc.layout.preset}/${variant}`] ?? "";
  return [
    widgetThemeVarsCss(doc.derived.derivedTheme),
    BASE_CSS,
    PRESET_CSS[doc.layout.preset],
    variantCss,
  ]
    .filter(Boolean)
    .join("\n");
}
