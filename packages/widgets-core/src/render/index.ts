import {
  normalizeWidgetAccents,
  resolveWidgetTemplateManifest,
} from "../templates.js";
import type { PublishedWidgetDoc, WidgetDisplay } from "../schema/definition.js";
import { widgetCss } from "./css.js";
import { escapeAttr, escapeHtml, safeUrl } from "./escape.js";

export interface WidgetRenderItem {
  id: string;
  authorName: string;
  authorRole?: string | null;
  authorCompany?: string | null;
  authorAvatarUrl?: string | null;
  content: string;
  rating?: number | null;
  source?: string | null;
  sourceUrl?: string | null;
  createdAt?: string | null;
}

/**
 * The delivery surface. Embeds live inside a host page (modest chrome, no h1,
 * capped footprints); the hosted wall page owns its viewport, so wall-kind
 * docs render their full template-flavored masthead (h1, subhead, the proof
 * stats) inside the fragment.
 */
export type WidgetRenderSurface = "embed" | "wall";

export interface RenderWidgetOptions {
  items: WidgetRenderItem[];
  /** Scope id for analytics/host wrappers. */
  widgetId?: string | null;
  /** Delivery surface; defaults to `embed`. */
  surface?: WidgetRenderSurface;
}

export interface RenderedWidget {
  html: string;
}

export class WidgetNotImplementedError extends Error {
  readonly templateId: string;

  constructor(templateId: string) {
    super(`widgets-core: template "${templateId}" has no renderer`);
    this.name = "WidgetNotImplementedError";
    this.templateId = templateId;
  }
}

// ── Shared atoms (markup helpers, not shared cards) ─────────────────────────

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function stars(rating: number | null | undefined, cls?: string): string {
  if (rating == null) return "";
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));
  const glyphs = Array.from({ length: 5 })
    .map((_, index) => `<span style="opacity:${index < rounded ? "1" : ".22"}">★</span>`)
    .join("");
  const classes = cls ? `sw-stars ${cls}` : "sw-stars";
  return `<div class="${classes}" role="img" aria-label="${rounded} out of 5 stars">${glyphs}</div>`;
}

function avatar(item: WidgetRenderItem, cls?: string): string {
  const classes = cls ? `sw-avatar ${cls}` : "sw-avatar";
  const src = safeUrl(item.authorAvatarUrl);
  if (src) {
    return `<span class="${classes}"><img src="${escapeAttr(src)}" alt="" loading="lazy"></span>`;
  }
  return `<span class="${classes}" aria-hidden="true">${escapeHtml(initials(item.authorName || "A"))}</span>`;
}

function metaLine(item: WidgetRenderItem, display: WidgetDisplay): string {
  return [item.authorRole, display.showCompany ? item.authorCompany : null]
    .filter(Boolean)
    .join(" · ");
}

function footLine(item: WidgetRenderItem, display: WidgetDisplay): string {
  return [
    display.showDate ? formatDate(item.createdAt) : "",
    display.showSource ? item.source : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function renderEmpty(): string {
  return `<div class="sw-empty" role="status">No published responses are available for this widget yet.</div>`;
}

// ── Template item renderers — each template owns its markup ─────────────────

/** Marquee chip: a one-breath quote passing by on the rail. */
function marqueeChip(item: WidgetRenderItem, display: WidgetDisplay): string {
  const meta = metaLine(item, display);
  return `<figure class="sw-chip" data-sw-item="${escapeAttr(item.id)}">
${display.showRating ? stars(item.rating, "sw-chip-stars") : ""}
<blockquote class="sw-chip-quote">${escapeHtml(item.content)}</blockquote>
<figcaption class="sw-chip-by">
${display.showAvatar ? avatar(item, "sw-chip-avatar") : ""}
<span class="sw-chip-name">${escapeHtml(item.authorName || "Anonymous")}</span>
${meta ? `<span class="sw-chip-meta">${escapeHtml(meta)}</span>` : ""}
</figcaption>
</figure>`;
}

/**
 * Gallery work: the words hang inside a matted frame; the attribution is a
 * plaque BELOW the frame, outside it — a gallery wall, not a card grid.
 */
function galleryTile(item: WidgetRenderItem, display: WidgetDisplay): string {
  const meta = metaLine(item, display);
  const foot = footLine(item, display);
  return `<figure class="sw-work" data-sw-item="${escapeAttr(item.id)}">
<div class="sw-frame">
${display.showRating ? stars(item.rating, "sw-tile-stars") : ""}
<blockquote class="sw-tile-quote">${escapeHtml(item.content)}</blockquote>
</div>
<figcaption class="sw-plaque">
${display.showAvatar ? avatar(item, "sw-plaque-avatar") : ""}
<span class="sw-plaque-name">${escapeHtml(item.authorName || "Anonymous")}</span>
${meta ? `<span class="sw-plaque-meta">${escapeHtml(meta)}</span>` : ""}
${foot ? `<span class="sw-plaque-foot">${escapeHtml(foot)}</span>` : ""}
</figcaption>
</figure>`;
}

/**
 * Mosaic post: an authentic feed voice — identity up top, words, then quiet
 * provenance. Ratings live small in the footer: real names and dates
 * out-trust star theatrics on a feed.
 */
function mosaicPost(item: WidgetRenderItem, display: WidgetDisplay): string {
  const meta = metaLine(item, display);
  const foot = footLine(item, display);
  const footRow =
    foot || (display.showRating && item.rating != null)
      ? `<footer class="sw-post-foot">
${display.showRating ? stars(item.rating, "sw-post-stars") : ""}
${foot ? `<span>${escapeHtml(foot)}</span>` : ""}
</footer>`
      : "";
  return `<article class="sw-post" data-sw-item="${escapeAttr(item.id)}">
<header class="sw-post-head">
${display.showAvatar ? avatar(item, "sw-post-avatar") : ""}
<div class="sw-post-id">
<span class="sw-post-name">${escapeHtml(item.authorName || "Anonymous")}</span>
${meta ? `<span class="sw-post-meta">${escapeHtml(meta)}</span>` : ""}
</div>
</header>
<p class="sw-post-text">${escapeHtml(item.content)}</p>
${footRow}
</article>`;
}

/** Column entry: a magazine pull quote with a signature. */
function columnEntry(item: WidgetRenderItem, display: WidgetDisplay): string {
  const sig = [
    item.authorName || "Anonymous",
    metaLine(item, display),
  ]
    .filter(Boolean)
    .join(", ");
  return `<article class="sw-entry" data-sw-item="${escapeAttr(item.id)}">
<span class="sw-entry-mark" aria-hidden="true">“</span>
<blockquote class="sw-entry-quote">${escapeHtml(item.content)}</blockquote>
<footer class="sw-entry-sig">
${display.showAvatar ? avatar(item, "sw-entry-avatar") : ""}
<span class="sw-entry-name">— ${escapeHtml(sig)}</span>
${display.showRating ? stars(item.rating, "sw-entry-stars") : ""}
</footer>
</article>`;
}

/** Editorial lead: the front-page story. */
function editorialLead(item: WidgetRenderItem, display: WidgetDisplay): string {
  const meta = metaLine(item, display);
  return `<figure class="sw-lead" data-sw-item="${escapeAttr(item.id)}">
${display.showRating ? stars(item.rating, "sw-lead-stars") : ""}
<blockquote class="sw-lead-quote">${escapeHtml(item.content)}</blockquote>
<figcaption class="sw-lead-by">
${display.showAvatar ? avatar(item, "sw-lead-avatar") : ""}
<span class="sw-lead-name">${escapeHtml(item.authorName || "Anonymous")}</span>
${meta ? `<span class="sw-lead-meta">${escapeHtml(meta)}</span>` : ""}
</figcaption>
</figure>`;
}

/** Editorial deck item: a supporting column under the rule. */
function editorialDeckItem(
  item: WidgetRenderItem,
  display: WidgetDisplay,
): string {
  const meta = metaLine(item, display);
  return `<article class="sw-deck-item" data-sw-item="${escapeAttr(item.id)}">
<p class="sw-deck-text">${escapeHtml(item.content)}</p>
<footer class="sw-deck-by">
<span class="sw-deck-name">${escapeHtml(item.authorName || "Anonymous")}</span>
${meta ? `<span class="sw-deck-meta">${escapeHtml(meta)}</span>` : ""}
</footer>
</article>`;
}

// ── Compositions ─────────────────────────────────────────────────────────────

/** Split items across two counter-scrolling rails (one rail when few items). */
function marqueeComposition(
  doc: PublishedWidgetDoc,
  items: WidgetRenderItem[],
): string {
  const chips = (list: WidgetRenderItem[]) =>
    list.map((item) => marqueeChip(item, doc.display)).join("");
  // Constant glide SPEED regardless of volume: duration scales with the
  // rail's chip count (~7s per chip, floored so short rails stay calm).
  const rail = (list: WidgetRenderItem[], dir: "ltr" | "rtl") =>
    `<div class="sw-rail" data-dir="${dir}" style="--sw-glide-dur:${Math.max(list.length * 7, 28)}s">
<div class="sw-rail-track">
<div class="sw-rail-seg">${chips(list)}</div>
<div class="sw-rail-seg" aria-hidden="true">${chips(list)}</div>
</div>
</div>`;
  if (items.length < 4) return `<div class="sw-marquee">${rail(items, "ltr")}</div>`;
  const first = items.filter((_, i) => i % 2 === 0);
  const second = items.filter((_, i) => i % 2 === 1);
  return `<div class="sw-marquee">${rail(first, "ltr")}${rail(second, "rtl")}</div>`;
}

function editorialComposition(
  doc: PublishedWidgetDoc,
  items: WidgetRenderItem[],
): string {
  const [lead, ...deck] = items;
  return `<div class="sw-front">
${lead ? editorialLead(lead, doc.display) : ""}
${
  deck.length
    ? `<hr class="sw-front-rule"><div class="sw-deck">${deck
        .map((item) => editorialDeckItem(item, doc.display))
        .join("")}</div>`
    : ""
}
</div>`;
}

/**
 * The masthead — WALL SURFACE ONLY. On the hosted wall page a wall-kind doc
 * owns its viewport, so it renders its full front matter (h1 + subhead + the
 * proof stats). Embeds NEVER ship a heading of any kind: the host page owns
 * its own headings, and a widget that brings one doubles it (2026-07-17).
 */
function masthead(
  doc: PublishedWidgetDoc,
  items: WidgetRenderItem[],
  surface: WidgetRenderSurface,
): string {
  if (surface !== "wall") return "";
  const wall = doc.kind === "wall" ? doc.wall : null;
  if (!wall) return "";
  const rated = items.filter((i) => i.rating != null);
  const avg = rated.length
    ? rated.reduce((sum, i) => sum + (i.rating ?? 0), 0) / rated.length
    : null;
  const stats = items.length
    ? `<div class="sw-mast-stats">
${avg != null ? `${stars(avg, "sw-mast-stars")}<span class="sw-mast-avg">${(Math.round(avg * 10) / 10).toFixed(1)}</span>` : ""}
<span class="sw-mast-count">${items.length} ${items.length === 1 ? "story" : "stories"}</span>
</div>`
    : "";
  return `<header class="sw-mast">
<h1 class="sw-mast-title">${escapeHtml(wall.title)}</h1>
${wall.subhead ? `<p class="sw-mast-subhead">${escapeHtml(wall.subhead)}</p>` : ""}
${stats}
</header>`;
}

/** Each template owns its item markup AND its composition. */
function renderItems(
  doc: PublishedWidgetDoc,
  templateId: string,
  items: WidgetRenderItem[],
): string {
  if (!items.length) return renderEmpty();
  const each = (fn: (i: WidgetRenderItem, d: WidgetDisplay) => string) =>
    items.map((item) => fn(item, doc.display)).join("");
  switch (templateId) {
    case "marquee":
      return marqueeComposition(doc, items);
    case "gallery":
      return `<div class="sw-gallery">${each(galleryTile)}</div>`;
    case "mosaic":
      return `<div class="sw-mosaic">${each(mosaicPost)}</div>`;
    case "column":
      return `<div class="sw-column">${each(columnEntry)}</div>`;
    case "editorial":
      return editorialComposition(doc, items);
    default:
      throw new WidgetNotImplementedError(templateId);
  }
}

function watermark(doc: PublishedWidgetDoc): string {
  if (!doc.branding.watermark) return "";
  return `<p class="sw-powered">Powered by <a href="https://semblia.com" target="_blank" rel="noopener noreferrer">Semblia</a></p>`;
}

export function renderPublishedWidgetFragment(
  doc: PublishedWidgetDoc,
  opts: RenderWidgetOptions,
): RenderedWidget {
  const manifest = resolveWidgetTemplateManifest(doc.templateId);
  const accents = normalizeWidgetAccents(manifest, doc.accents);
  const surface = opts.surface ?? "embed";
  const accentAttrs = Object.entries(accents)
    .map(([key, value]) => ` data-sw-a-${escapeAttr(key)}="${escapeAttr(value)}"`)
    .join("");
  const html =
    `<div class="sw-scope sw-t-${manifest.id}" part="root" data-widget-kind="${escapeAttr(doc.kind)}"` +
    ` data-sw-template="${escapeAttr(manifest.id)}" data-sw-surface="${surface}"` +
    ` data-sw-rotate="${doc.behavior.autoRotate ? "on" : "off"}"${accentAttrs}` +
    `${opts.widgetId ? ` data-widget-id="${escapeAttr(opts.widgetId)}"` : ""}>` +
    `<style>${widgetCss(doc)}</style>` +
    `<div class="sw-root">${masthead(doc, opts.items, surface)}${renderItems(doc, manifest.id, opts.items)}${watermark(doc)}</div>` +
    `</div>`;
  return { html };
}

export function renderWidgetStubFragmentHtml(): string {
  return `<div data-semblia-widget-stub="true" part="root">
<style>
  [data-semblia-widget-stub]{font:15px/1.55 ui-sans-serif,system-ui,sans-serif;
    color:#15181d;background:#f6f7f9;border:1px solid #e3e7ec;border-radius:12px;
    padding:1.5rem;text-align:center}
  @media (prefers-color-scheme:dark){[data-semblia-widget-stub]{
    background:#101216;color:#e8eaee;border-color:#2a2e35}}
  [data-semblia-widget-stub] strong{display:block;font-size:1.05rem;margin-bottom:.35rem}
  [data-semblia-widget-stub] span{opacity:.72}
</style>
<strong>This widget is unavailable</strong>
<span>There is no published display surface right now. Please check again soon.</span>
</div>`;
}
