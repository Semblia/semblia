import {
  normalizeWidgetAccents,
  resolveWidgetTemplateManifest,
} from "../templates.js";
import { widgetThemeVarsCss } from "../theme.js";
import type { PublishedWidgetDoc } from "../schema/definition.js";

/**
 * Widget stylesheets. A slim shared base (scope reset, avatar/star atoms,
 * masthead, empty state) plus one *world* per template — each template owns
 * its item markup (see index.ts) and its entire visual language here,
 * including its own masthead flavor on the wall surface.
 *
 * Surface contract (2026-07-17):
 * - `embed` inherits the HOST page — the scope paints no background, sets no
 *   outer max-widths, and never renders a heading. Item surfaces (cards,
 *   frames) still paint `--semblia-widget-surface`; the owner's appearance
 *   mode picks the text color family that matches their site.
 * - `wall` owns its page: scope background, masthead, generous rhythm.
 *
 * Refinement canon (2026-07-17 research, docs/ui-rework/2026-07-17-template-
 * refinement/research.md): two text colors per card; hairline OR whisper
 * shadow, never a heavy combo; one fixed star slot, amber, omitted when
 * unrated; quotes bare (no glyphs) and clamped; designed initials avatars.
 *
 * Everything resolves from the AA-clamped `--semblia-widget-*` vars; accent
 * decisions arrive as `data-sw-a-*` attributes. `.sw-root` is an inline-size
 * container, so templates adapt to the host container, not the viewport.
 */

const BASE_CSS = `
.sw-scope{font-family:var(--semblia-widget-font,ui-sans-serif,system-ui,sans-serif);
  color:var(--semblia-widget-text);
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;line-height:1.5}
.sw-scope[data-sw-surface="wall"]{background:var(--semblia-widget-bg)}
.sw-scope *,.sw-scope *::before,.sw-scope *::after{box-sizing:border-box;margin:0}
.sw-root{width:100%;min-width:0;margin:0 auto;container-type:inline-size}

/* Avatar atom — photos cover; initials get a designed per-name pastel
   (a flat gray monogram reads broken; a tinted one reads intentional). */
.sw-avatar{width:36px;height:36px;border-radius:50%;background:var(--semblia-widget-accent-soft);
  color:var(--semblia-widget-accent-soft-text);display:inline-grid;place-items:center;
  font-size:.72rem;font-weight:650;letter-spacing:.02em;overflow:hidden;flex:0 0 auto;
  box-shadow:inset 0 0 0 1px color-mix(in oklab, var(--semblia-widget-text) 8%, transparent)}
.sw-avatar img{width:100%;height:100%;object-fit:cover;display:block}
.sw-avatar-fb{background:oklch(.93 .05 var(--sw-avatar-h,260));color:oklch(.42 .1 var(--sw-avatar-h,260))}
.sw-scope[data-sw-surface] .sw-avatar-fb{background:light-dark(oklch(.93 .05 var(--sw-avatar-h,260)),oklch(.34 .06 var(--sw-avatar-h,260)));
  color:light-dark(oklch(.42 .1 var(--sw-avatar-h,260)),oklch(.9 .06 var(--sw-avatar-h,260)))}

/* Star atom — crisp SVG glyphs, one warm hue (the industry constant),
   sized by font-size. Unrated entries render nothing (see index.ts). */
.sw-stars{display:inline-flex;gap:2px;color:var(--sw-star,#f0a51f);line-height:1}
.sw-stars svg{width:1em;height:1em;display:block}
.sw-stars .sw-star-off{opacity:.25}

.sw-powered{margin-top:var(--semblia-widget-section-gap);text-align:center}
.sw-powered a{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:999px;
  border:1px solid var(--semblia-widget-border);color:var(--semblia-widget-text-muted);
  font-size:.72rem;font-weight:550;text-decoration:none;opacity:.8;transition:opacity 160ms ease}
.sw-powered a:hover{opacity:1}
.sw-empty{padding:2rem;text-align:center;border:1px dashed var(--semblia-widget-border-strong);
  border-radius:var(--semblia-widget-radius);color:var(--semblia-widget-text-muted)}

/* Masthead — wall surface only (embeds never ship headings; the host page
   owns its own). The stats row is the enterprise trust pairing: big score
   numeral, stars, volume — always together. Templates flavor it below. */
.sw-mast{text-align:center;margin:0 0 calc(var(--semblia-widget-section-gap)*1.4)}
.sw-mast-title{font-size:clamp(1.9rem,5cqw,3rem);line-height:1.12;font-weight:700;
  letter-spacing:-.025em;color:var(--semblia-widget-text);text-wrap:balance}
.sw-mast-subhead{margin:.8rem auto 0;color:var(--semblia-widget-text-muted);
  font-size:1.05rem;max-width:52ch;text-wrap:balance}
.sw-mast-stats{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:1.4rem;
  font-size:.9rem;color:var(--semblia-widget-text-muted)}
.sw-mast-stars{font-size:1.1rem}
.sw-mast-avg{font-size:2.1rem;font-weight:800;letter-spacing:-.02em;line-height:1;
  color:var(--semblia-widget-text);font-variant-numeric:tabular-nums}
.sw-mast-count::before{content:"·";margin-right:12px}

@media (prefers-reduced-motion:reduce){.sw-scope *,.sw-scope *::before,.sw-scope *::after{
  animation-duration:.01ms!important;transition-duration:.01ms!important}}
`.trim();

/**
 * Marquee — the rail. Two counter-scrolling rows of one-breath chips with
 * edge-fade masks (research: implied abundance is itself proof). Chip
 * anatomy follows the Senja card order: identity row, stars, quote. The
 * glide duration scales with rail length (index.ts sets --sw-glide-dur) so
 * speed is constant regardless of volume. Hover pauses and lifts the chip
 * under the cursor; reduced motion or autoRotate=off degrade to a
 * hand-scrollable rail.
 */
const MARQUEE_CSS = `
.sw-marquee{display:flex;flex-direction:column;gap:var(--semblia-widget-gap);overflow:hidden;
  padding:6px 0}
.sw-rail{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);
  mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
.sw-rail-track{display:flex;width:max-content;animation:sw-glide var(--sw-glide-dur,48s) linear infinite}
.sw-rail[data-dir="rtl"] .sw-rail-track{animation-direction:reverse}
.sw-rail:hover .sw-rail-track,.sw-rail:focus-within .sw-rail-track{animation-play-state:paused}
.sw-rail-seg{display:flex;gap:var(--semblia-widget-gap);padding-right:var(--semblia-widget-gap)}
.sw-chip{width:360px;flex:0 0 auto;display:flex;flex-direction:column;gap:10px;
  background:var(--semblia-widget-surface);border:1px solid var(--semblia-widget-border);
  border-radius:var(--semblia-widget-radius-card);box-shadow:0 1px 2px color-mix(in oklab, var(--semblia-widget-text) 5%, transparent);
  padding:calc(var(--semblia-widget-space)*1.4);
  transition:transform 180ms ease,border-color 180ms ease,box-shadow 180ms ease}
.sw-chip:hover{transform:translateY(-2px);border-color:var(--semblia-widget-border-strong);
  box-shadow:0 6px 20px -8px color-mix(in oklab, var(--semblia-widget-text) 22%, transparent)}
.sw-chip-by{display:flex;align-items:center;gap:10px;min-width:0}
.sw-chip-avatar{width:34px;height:34px;font-size:.66rem}
.sw-chip-id{display:flex;flex-direction:column;min-width:0}
.sw-chip-name{font-size:.9rem;font-weight:650;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sw-chip-meta{font-size:.76rem;color:var(--semblia-widget-text-muted);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sw-chip-stars{font-size:.9rem}
.sw-chip-quote{font-size:.96rem;line-height:1.55;letter-spacing:-.002em;
  display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.sw-scope[data-sw-a-mode="spotlight"] .sw-chip{width:480px;padding:calc(var(--semblia-widget-space)*1.8);gap:13px}
.sw-scope[data-sw-a-mode="spotlight"] .sw-chip-quote{font-size:1.08rem;line-height:1.6;-webkit-line-clamp:5}
.sw-scope[data-sw-rotate="off"] .sw-rail{overflow-x:auto;-webkit-mask-image:none;mask-image:none}
.sw-scope[data-sw-rotate="off"] .sw-rail-track{animation:none;width:auto}
.sw-scope[data-sw-rotate="off"] .sw-rail-seg[aria-hidden]{display:none}
.sw-scope[data-sw-surface="wall"] .sw-marquee{gap:calc(var(--semblia-widget-gap)*1.25)}
.sw-scope[data-sw-surface="wall"] .sw-mast{text-align:left;margin-bottom:var(--semblia-widget-section-gap)}
.sw-scope[data-sw-surface="wall"] .sw-mast .sw-mast-subhead{margin-left:0}
.sw-scope[data-sw-surface="wall"] .sw-mast .sw-mast-stats{justify-content:flex-start}
@media (prefers-reduced-motion:reduce){
  .sw-rail{overflow-x:auto;-webkit-mask-image:none;mask-image:none}
  .sw-rail-track{animation:none!important;width:auto}
  .sw-rail-seg[aria-hidden]{display:none}
}
@keyframes sw-glide{from{transform:translateX(0)}to{transform:translateX(-50%)}}
`.trim();

/**
 * Gallery — the exhibition. Each testimonial is a FRAMED WORK: a double mat
 * (hairline frame + inner hairline inset like a real museum mat) around the
 * words, and the attribution on a plaque BELOW the frame — small caps on
 * brass. Featured accent hangs the first work at double width.
 */
const GALLERY_CSS = `
.sw-gallery{display:grid;gap:calc(var(--semblia-widget-gap)*1.5) var(--semblia-widget-gap);
  grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
.sw-work{display:flex;flex-direction:column;min-width:0}
.sw-frame{flex:1;position:relative;display:flex;flex-direction:column;gap:13px;
  background:var(--semblia-widget-surface);border:1px solid var(--semblia-widget-border-strong);
  border-radius:calc(var(--semblia-widget-radius-card)*.5);
  padding:calc(var(--semblia-widget-space)*2.1) calc(var(--semblia-widget-space)*1.9);
  transition:border-color 180ms ease}
.sw-frame::before{content:"";position:absolute;inset:9px;pointer-events:none;
  border:1px solid var(--semblia-widget-border);border-radius:2px}
.sw-work:hover .sw-frame{border-color:color-mix(in oklab, var(--semblia-widget-text) 34%, var(--semblia-widget-border-strong))}
.sw-tile-stars{font-size:.86rem}
.sw-tile-quote{font-size:1.02rem;line-height:1.62;letter-spacing:-.004em;
  display:-webkit-box;-webkit-line-clamp:8;-webkit-box-orient:vertical;overflow:hidden}
.sw-plaque{margin-top:11px;padding:8px 2px 0;
  display:grid;grid-template-columns:auto 1fr;column-gap:10px;align-items:center;min-width:0}
.sw-plaque-avatar{grid-row:span 2;width:30px;height:30px;border-radius:4px}
.sw-plaque-name{font-size:.72rem;font-weight:650;letter-spacing:.1em;text-transform:uppercase;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sw-plaque-meta{font-size:.74rem;color:var(--semblia-widget-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sw-plaque-foot{grid-column:2;font-size:.68rem;color:var(--semblia-widget-text-muted);margin-top:2px}
.sw-scope[data-sw-a-lead="featured"] .sw-gallery .sw-work:first-child{grid-column:span 2}
.sw-scope[data-sw-a-lead="featured"] .sw-gallery .sw-work:first-child .sw-tile-quote{font-size:1.3rem;line-height:1.55;-webkit-line-clamp:6}
@container (max-width:560px){.sw-scope[data-sw-a-lead="featured"] .sw-gallery .sw-work:first-child{grid-column:auto}}
.sw-scope[data-sw-surface="wall"] .sw-gallery{gap:calc(var(--semblia-widget-gap)*1.9) calc(var(--semblia-widget-gap)*1.3)}
.sw-scope[data-sw-surface="wall"] .sw-mast-title{font-weight:600;letter-spacing:.02em;text-transform:uppercase;
  font-size:clamp(1.3rem,3.2cqw,1.9rem)}
.sw-scope[data-sw-surface="wall"] .sw-mast::after{content:"";display:block;width:44px;height:1px;
  background:var(--semblia-widget-border-strong);margin:1.3rem auto 0}
`.trim();

/**
 * Mosaic — the feed. Masonry of authentic voices at the measured Tally-wall
 * spec: 330px columns, 14px gaps both axes, hairline + whisper shadow.
 * Provenance over decoration (research: Supabase's wall — real names and
 * dates out-trust star theatrics), so ratings sit small in the footer,
 * never up top. Embeds cap the feed with a bottom fade that implies more.
 */
const MOSAIC_CSS = `
.sw-mosaic{columns:3 330px;column-gap:calc(var(--semblia-widget-gap)*.9)}
.sw-post{break-inside:avoid;margin:0 0 calc(var(--semblia-widget-gap)*.9);display:flex;flex-direction:column;gap:10px;
  background:var(--semblia-widget-surface);border:1px solid var(--semblia-widget-border);
  border-radius:var(--semblia-widget-radius-card);padding:calc(var(--semblia-widget-space)*1.3);
  box-shadow:0 1px 2px color-mix(in oklab, var(--semblia-widget-text) 5%, transparent);
  transition:border-color 160ms ease}
.sw-post:hover{border-color:var(--semblia-widget-border-strong)}
.sw-post-head{display:flex;align-items:center;gap:10px;min-width:0}
.sw-post-avatar{width:36px;height:36px}
.sw-post-id{min-width:0;flex:1;display:flex;flex-direction:column}
.sw-post-name{font-size:.92rem;font-weight:650;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sw-post-meta{font-size:.76rem;color:var(--semblia-widget-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sw-post-text{font-size:.95rem;line-height:1.55;
  display:-webkit-box;-webkit-line-clamp:8;-webkit-box-orient:vertical;overflow:hidden}
.sw-post-foot{display:flex;align-items:center;gap:10px;font-size:.74rem;color:var(--semblia-widget-text-muted)}
.sw-post-stars{font-size:.8rem}
.sw-scope[data-sw-a-weave="dense"] .sw-mosaic{columns:4 280px}
.sw-scope[data-sw-a-weave="dense"] .sw-post{padding:calc(var(--semblia-widget-space)*1);gap:8px}
.sw-scope[data-sw-a-weave="dense"] .sw-post-text{font-size:.88rem;line-height:1.5;-webkit-line-clamp:6}
.sw-scope[data-sw-surface="embed"] .sw-mosaic{max-height:640px;overflow:hidden;
  -webkit-mask-image:linear-gradient(180deg,#000 78%,transparent);mask-image:linear-gradient(180deg,#000 78%,transparent)}
.sw-scope[data-sw-surface="wall"] .sw-mast{text-align:left;margin-bottom:var(--semblia-widget-section-gap)}
.sw-scope[data-sw-surface="wall"] .sw-mast-title{font-size:clamp(1.5rem,3.6cqw,2.1rem);letter-spacing:-.02em}
.sw-scope[data-sw-surface="wall"] .sw-mast-subhead{margin-left:0;font-size:.95rem}
.sw-scope[data-sw-surface="wall"] .sw-mast-stats{justify-content:flex-start;margin-top:1rem}
.sw-scope[data-sw-surface="wall"] .sw-mast-avg{font-size:1.7rem}
`.trim();

/**
 * Column — the praise column. A magazine's single reading measure: an
 * oversized hanging quotation mark (the ONE editorial surface allowed the
 * glyph), generous serif leading, a small-caps signature with quiet amber
 * stars, and short centered separators between voices. No cards, no boxes —
 * it reads as editorial content.
 */
const COLUMN_CSS = `
.sw-column{max-width:62ch;margin:0 auto}
.sw-entry{position:relative;padding:calc(var(--semblia-widget-space)*2) 0 calc(var(--semblia-widget-space)*2) calc(var(--semblia-widget-space)*2.6)}
.sw-entry+.sw-entry::before{content:"";position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:56px;height:1px;background:var(--semblia-widget-border-strong)}
.sw-entry-mark{position:absolute;left:0;top:calc(var(--semblia-widget-space)*1.5);
  font-size:3.1rem;line-height:.8;color:var(--semblia-widget-accent);font-weight:700;font-style:normal}
.sw-entry-quote{font-size:1.24rem;line-height:1.7;letter-spacing:-.004em;
  display:-webkit-box;-webkit-line-clamp:8;-webkit-box-orient:vertical;overflow:hidden}
.sw-entry:first-child .sw-entry-quote{font-size:1.38rem;line-height:1.64}
.sw-entry-sig{display:flex;align-items:center;gap:10px;margin-top:16px;min-width:0}
.sw-entry-avatar{width:30px;height:30px;font-size:.6rem}
.sw-entry-name{font-size:.8rem;letter-spacing:.07em;text-transform:uppercase;
  color:var(--semblia-widget-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sw-entry-stars{font-size:.8rem;margin-left:auto;flex:0 0 auto}
.sw-scope[data-sw-a-flourish="plain"] .sw-entry{padding-left:0}
.sw-scope[data-sw-a-flourish="plain"] .sw-entry-mark{display:none}
.sw-scope[data-sw-surface="wall"] .sw-column{max-width:66ch}
.sw-scope[data-sw-surface="wall"] .sw-entry-quote{font-size:1.32rem}
.sw-scope[data-sw-surface="wall"] .sw-mast-title{font-weight:600;letter-spacing:-.015em}
.sw-scope[data-sw-surface="wall"] .sw-mast-subhead{font-style:italic}
.sw-scope[data-sw-surface="wall"] .sw-mast-avg{font-size:1.6rem;font-weight:700}
`.trim();

/**
 * Editorial — the front page. One lead story in display type under a review
 * stamp, then a DOUBLE RULE (the newspaper's fold) into a deck of supporting
 * columns divided by hairlines, each opened by a small accent tick. The wall
 * masthead is a nameplate: rules above and below the title, a dateline of
 * stats beneath.
 */
const EDITORIAL_CSS = `
.sw-front{max-width:70rem;margin:0 auto}
.sw-scope[data-sw-surface="wall"] .sw-front{max-width:none}
.sw-lead{display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px;
  padding:calc(var(--semblia-widget-space)*1.9) 0 calc(var(--semblia-widget-space)*1.6)}
.sw-lead-stars{font-size:1.1rem;gap:3px}
.sw-lead-quote{font-size:clamp(1.5rem,3.2cqw,2rem);line-height:1.36;letter-spacing:-.018em;
  font-weight:550;max-width:24em;text-wrap:balance;
  display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden}
.sw-lead-quote::before{content:"\\201C"}
.sw-lead-quote::after{content:"\\201D"}
.sw-lead-by{display:flex;align-items:center;gap:10px;min-width:0}
.sw-lead-avatar{width:36px;height:36px}
.sw-lead-name{font-size:.8rem;font-weight:650;letter-spacing:.1em;text-transform:uppercase}
.sw-lead-meta{font-size:.82rem;color:var(--semblia-widget-text-muted)}
.sw-lead-meta::before{content:"·";margin-right:8px}
.sw-front-rule{border:0;border-top:3px double var(--semblia-widget-border-strong);
  margin:calc(var(--semblia-widget-space)*1.5) 0 calc(var(--semblia-widget-space)*1.6)}
.sw-deck{display:grid;gap:calc(var(--semblia-widget-gap)*1.4);grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
.sw-deck-item{position:relative;display:flex;flex-direction:column;gap:10px;min-width:0;
  padding-left:calc(var(--semblia-widget-gap)*.8);border-left:1px solid var(--semblia-widget-border)}
.sw-deck-item::before{content:"";position:absolute;left:-1px;top:2px;width:3px;height:20px;
  background:var(--semblia-widget-accent)}
.sw-deck-text{font-size:.94rem;line-height:1.6;
  display:-webkit-box;-webkit-line-clamp:9;-webkit-box-orient:vertical;overflow:hidden}
.sw-deck-by{margin-top:auto;display:flex;flex-direction:column;gap:1px}
.sw-deck-name{font-size:.7rem;font-weight:650;letter-spacing:.1em;text-transform:uppercase}
.sw-deck-meta{font-size:.74rem;color:var(--semblia-widget-text-muted)}
.sw-scope[data-sw-surface="wall"] .sw-lead{padding-top:calc(var(--semblia-widget-space)*2.2)}
.sw-scope[data-sw-surface="wall"] .sw-lead-quote{font-size:clamp(1.7rem,4cqw,2.5rem)}
.sw-scope[data-sw-surface="wall"] .sw-mast{padding:1.1rem 0;margin-bottom:var(--semblia-widget-section-gap);
  border-top:3px double var(--semblia-widget-border-strong);
  border-bottom:1px solid var(--semblia-widget-border-strong)}
.sw-scope[data-sw-surface="wall"] .sw-mast-title{font-weight:650;letter-spacing:-.02em}
.sw-scope[data-sw-surface="wall"] .sw-mast-stats{margin-top:.9rem;font-variant-numeric:tabular-nums}
.sw-scope[data-sw-surface="wall"] .sw-mast-avg{font-size:1.4rem;font-weight:700}
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
