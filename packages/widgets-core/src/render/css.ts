import {
  normalizeWidgetAccents,
  resolveWidgetTemplateManifest,
} from "../templates.js";
import { widgetThemeVarsCss } from "../theme.js";
import type { PublishedWidgetDoc } from "../schema/definition.js";

/**
 * Widget stylesheets. A slim shared base (scope reset, avatar/star atoms,
 * masthead, empty state) plus one *world* per template — each template owns
 * its item markup (see index.ts) and its entire visual language here.
 * `data-sw-surface` distinguishes embeds from the hosted wall page; accent
 * decisions arrive as `data-sw-a-*` attributes. Every value resolves from the
 * AA-clamped `--semblia-widget-*` vars.
 */

const BASE_CSS = `
.sw-scope{font-family:var(--semblia-widget-font,ui-sans-serif,system-ui,sans-serif);
  color:var(--semblia-widget-text);background:var(--semblia-widget-bg);
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;line-height:1.5}
.sw-scope *,.sw-scope *::before,.sw-scope *::after{box-sizing:border-box;margin:0}
.sw-root{width:100%;margin:0 auto;container-type:inline-size}
.sw-avatar{width:36px;height:36px;border-radius:50%;background:var(--semblia-widget-accent-soft);
  color:var(--semblia-widget-accent-soft-text);display:inline-grid;place-items:center;
  font-size:.75rem;font-weight:650;overflow:hidden;flex:0 0 auto}
.sw-avatar img{width:100%;height:100%;object-fit:cover;display:block}
.sw-stars{display:inline-flex;gap:2px;color:var(--semblia-widget-accent);font-size:.85rem;line-height:1}
.sw-powered{margin-top:var(--semblia-widget-section-gap);text-align:center;font-size:.75rem;color:var(--semblia-widget-text-muted)}
.sw-powered a{color:inherit;text-decoration:none;font-weight:600}
.sw-empty{padding:2rem;text-align:center;border:1px dashed var(--semblia-widget-border-strong);
  border-radius:var(--semblia-widget-radius);color:var(--semblia-widget-text-muted)}

.sw-mast{margin:0 0 var(--semblia-widget-section-gap)}
.sw-mast-title{font-size:1.3rem;line-height:1.2;font-weight:700;letter-spacing:-.015em;color:var(--semblia-widget-text)}
.sw-mast-subhead{margin:.5rem 0 0;color:var(--semblia-widget-text-muted);font-size:.95rem;max-width:52ch}
.sw-scope[data-sw-surface="wall"] .sw-mast{text-align:center;margin-bottom:calc(var(--semblia-widget-section-gap)*1.4)}
.sw-scope[data-sw-surface="wall"] .sw-mast-title{font-size:clamp(1.9rem,5vw,3rem);letter-spacing:-.025em}
.sw-scope[data-sw-surface="wall"] .sw-mast-subhead{margin:.8rem auto 0;font-size:1.05rem}
.sw-mast-stats{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:1.1rem;
  font-size:.9rem;color:var(--semblia-widget-text-muted)}
.sw-mast-stars{font-size:1rem}
.sw-mast-avg{font-weight:700;color:var(--semblia-widget-text);font-variant-numeric:tabular-nums}
.sw-mast-count::before{content:"·";margin-right:10px}

@media (prefers-reduced-motion:reduce){.sw-scope *,.sw-scope *::before,.sw-scope *::after{
  animation-duration:.01ms!important;transition-duration:.01ms!important}}
`.trim();

/**
 * Marquee — the rail. Two counter-scrolling rows of one-breath chips with
 * edge-fade masks (research: implied abundance is itself proof). Hover pauses;
 * reduced motion or autoRotate=off degrade to a hand-scrollable rail.
 */
const MARQUEE_CSS = `
.sw-marquee{display:flex;flex-direction:column;gap:var(--semblia-widget-gap);overflow:hidden}
.sw-rail{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);
  mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.sw-rail-track{display:flex;width:max-content;animation:sw-glide 48s linear infinite}
.sw-rail[data-dir="rtl"] .sw-rail-track{animation-direction:reverse}
.sw-rail:hover .sw-rail-track,.sw-rail:focus-within .sw-rail-track{animation-play-state:paused}
.sw-rail-seg{display:flex;gap:var(--semblia-widget-gap);padding-right:var(--semblia-widget-gap)}
.sw-chip{width:320px;flex:0 0 auto;display:flex;flex-direction:column;gap:10px;
  background:var(--semblia-widget-surface);border:var(--semblia-widget-border-width) solid var(--semblia-widget-border);
  border-radius:var(--semblia-widget-radius-card);box-shadow:var(--semblia-widget-shadow);
  padding:calc(var(--semblia-widget-space)*1.2)}
.sw-chip-stars{font-size:.78rem}
.sw-chip-quote{font-size:.95rem;line-height:1.55;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.sw-chip-by{display:flex;align-items:center;gap:9px;min-width:0;margin-top:auto}
.sw-chip-avatar{width:28px;height:28px;font-size:.65rem}
.sw-chip-name{font-size:.83rem;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sw-chip-meta{font-size:.76rem;color:var(--semblia-widget-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sw-scope[data-sw-a-mode="spotlight"] .sw-chip{width:440px;padding:calc(var(--semblia-widget-space)*1.7)}
.sw-scope[data-sw-a-mode="spotlight"] .sw-chip-quote{font-size:1.1rem;line-height:1.6;-webkit-line-clamp:5}
.sw-scope[data-sw-rotate="off"] .sw-rail{overflow-x:auto;-webkit-mask-image:none;mask-image:none}
.sw-scope[data-sw-rotate="off"] .sw-rail-track{animation:none;width:auto}
.sw-scope[data-sw-rotate="off"] .sw-rail-seg[aria-hidden]{display:none}
.sw-scope[data-sw-surface="wall"] .sw-marquee{gap:calc(var(--semblia-widget-gap)*1.25)}
@media (prefers-reduced-motion:reduce){
  .sw-rail{overflow-x:auto;-webkit-mask-image:none;mask-image:none}
  .sw-rail-track{animation:none!important;width:auto}
  .sw-rail-seg[aria-hidden]{display:none}
}
@keyframes sw-glide{from{transform:translateX(0)}to{transform:translateX(-50%)}}
`.trim();

/**
 * Gallery — the exhibition. Even framed tiles; attribution is a plaque under
 * a hairline, set in letter-spaced small caps. Featured mode hangs the first
 * work at double width.
 */
const GALLERY_CSS = `
.sw-gallery{display:grid;gap:var(--semblia-widget-gap);grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
.sw-tile{display:flex;flex-direction:column;gap:12px;min-width:0;
  background:var(--semblia-widget-surface);border:1px solid var(--semblia-widget-border-strong);
  border-radius:calc(var(--semblia-widget-radius-card)*.6);padding:calc(var(--semblia-widget-space)*1.5)}
.sw-tile-stars{font-size:.8rem}
.sw-tile-quote{font-size:1rem;line-height:1.6}
.sw-plaque{margin-top:auto;padding-top:12px;border-top:1px solid var(--semblia-widget-border);
  display:grid;grid-template-columns:auto 1fr;column-gap:10px;align-items:center;min-width:0}
.sw-plaque-avatar{grid-row:span 2;width:32px;height:32px;border-radius:4px}
.sw-plaque-name{font-size:.78rem;font-weight:650;letter-spacing:.08em;text-transform:uppercase;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sw-plaque-meta{font-size:.74rem;color:var(--semblia-widget-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sw-plaque-foot{grid-column:2;font-size:.7rem;color:var(--semblia-widget-text-muted);margin-top:2px}
.sw-scope[data-sw-a-lead="featured"] .sw-gallery .sw-tile:first-child{grid-column:span 2}
.sw-scope[data-sw-a-lead="featured"] .sw-gallery .sw-tile:first-child .sw-tile-quote{font-size:1.25rem;line-height:1.55}
@container (max-width:560px){.sw-scope[data-sw-a-lead="featured"] .sw-gallery .sw-tile:first-child{grid-column:auto}}
.sw-scope[data-sw-surface="wall"] .sw-gallery{gap:calc(var(--semblia-widget-gap)*1.3)}
`.trim();

/**
 * Mosaic — the feed. Masonry of authentic voices: quiet borders, provenance
 * over decoration (research: Supabase's wall — real handles out-trust star
 * theatrics). Embeds cap the feed with a bottom fade.
 */
const MOSAIC_CSS = `
.sw-mosaic{columns:3 240px;column-gap:var(--semblia-widget-gap)}
.sw-post{break-inside:avoid;margin:0 0 var(--semblia-widget-gap);display:flex;flex-direction:column;gap:10px;
  background:var(--semblia-widget-surface);border:1px solid var(--semblia-widget-border);
  border-radius:var(--semblia-widget-radius-card);padding:calc(var(--semblia-widget-space)*1.2)}
.sw-post-head{display:flex;align-items:center;gap:10px;min-width:0}
.sw-post-avatar{width:34px;height:34px}
.sw-post-id{min-width:0;flex:1;display:flex;flex-direction:column}
.sw-post-name{font-size:.9rem;font-weight:650;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sw-post-meta{font-size:.76rem;color:var(--semblia-widget-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sw-post-stars{font-size:.72rem;flex:0 0 auto}
.sw-post-text{font-size:.94rem;line-height:1.6}
.sw-post-foot{font-size:.74rem;color:var(--semblia-widget-text-muted)}
.sw-scope[data-sw-a-weave="dense"] .sw-mosaic{columns:4 200px}
.sw-scope[data-sw-a-weave="dense"] .sw-post{padding:calc(var(--semblia-widget-space)*.95);gap:8px}
.sw-scope[data-sw-a-weave="dense"] .sw-post-text{font-size:.88rem;line-height:1.5}
.sw-scope[data-sw-surface="embed"] .sw-mosaic{max-height:640px;overflow:hidden;
  -webkit-mask-image:linear-gradient(180deg,#000 78%,transparent);mask-image:linear-gradient(180deg,#000 78%,transparent)}
`.trim();

/**
 * Column — the praise column. A magazine's single measure: hanging quotation
 * marks, generous leading, signature lines, hairline separators. No cards.
 */
const COLUMN_CSS = `
.sw-column{max-width:44rem;margin:0 auto}
.sw-entry{position:relative;padding:calc(var(--semblia-widget-space)*1.9) 0 calc(var(--semblia-widget-space)*1.9) calc(var(--semblia-widget-space)*2.4)}
.sw-entry+.sw-entry{border-top:1px solid var(--semblia-widget-border)}
.sw-entry-mark{position:absolute;left:0;top:calc(var(--semblia-widget-space)*1.35);
  font-size:2.6rem;line-height:1;color:var(--semblia-widget-accent);font-weight:700}
.sw-entry-quote{font-size:1.18rem;line-height:1.7;letter-spacing:-.004em}
.sw-entry-sig{display:flex;align-items:center;gap:10px;margin-top:14px;min-width:0}
.sw-entry-avatar{width:26px;height:26px;font-size:.62rem}
.sw-entry-name{font-size:.88rem;color:var(--semblia-widget-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sw-entry-stars{font-size:.72rem;margin-left:auto;flex:0 0 auto}
.sw-scope[data-sw-a-flourish="plain"] .sw-entry{padding-left:0}
.sw-scope[data-sw-a-flourish="plain"] .sw-entry-mark{display:none}
.sw-scope[data-sw-surface="wall"] .sw-column{max-width:48rem}
.sw-scope[data-sw-surface="wall"] .sw-entry-quote{font-size:1.3rem}
`.trim();

/**
 * Editorial — the front page. One lead story in display type, then a
 * newspaper deck of supporting voices under a rule, with column dividers.
 */
const EDITORIAL_CSS = `
.sw-front{max-width:62rem;margin:0 auto}
.sw-lead{display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px;
  padding:calc(var(--semblia-widget-space)*1.5) 0}
.sw-lead-stars{font-size:.95rem}
.sw-lead-quote{font-size:clamp(1.35rem,3.2cqw,1.9rem);line-height:1.42;letter-spacing:-.015em;
  font-weight:550;max-width:26em;text-wrap:balance}
.sw-lead-quote::before{content:"“"}
.sw-lead-quote::after{content:"”"}
.sw-lead-by{display:flex;align-items:center;gap:10px;min-width:0}
.sw-lead-avatar{width:34px;height:34px}
.sw-lead-name{font-size:.92rem;font-weight:650}
.sw-lead-meta{font-size:.85rem;color:var(--semblia-widget-text-muted)}
.sw-lead-meta::before{content:"·";margin-right:8px}
.sw-front-rule{border:0;border-top:1px solid var(--semblia-widget-border-strong);
  margin:calc(var(--semblia-widget-space)*1.9) 0}
.sw-deck{display:grid;gap:calc(var(--semblia-widget-gap)*1.4);grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}
.sw-deck-item{display:flex;flex-direction:column;gap:10px;min-width:0;
  padding-left:calc(var(--semblia-widget-gap)*.7);border-left:1px solid var(--semblia-widget-border)}
.sw-deck-text{font-size:.92rem;line-height:1.62}
.sw-deck-by{margin-top:auto;display:flex;flex-direction:column}
.sw-deck-name{font-size:.8rem;font-weight:650}
.sw-deck-meta{font-size:.74rem;color:var(--semblia-widget-text-muted)}
.sw-scope[data-sw-surface="wall"] .sw-lead-quote{font-size:clamp(1.6rem,4cqw,2.4rem)}
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
