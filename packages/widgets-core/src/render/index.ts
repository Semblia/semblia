import {
  normalizeLayoutVariant,
  type PublishedWidgetDoc,
  type WidgetDisplay,
} from "../schema/definition.js";
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

export interface RenderWidgetOptions {
  items: WidgetRenderItem[];
  /** Scope id for analytics/host wrappers. */
  widgetId?: string | null;
  /**
   * Hosted wall pages render their own <h1> hero; set true to skip the
   * fragment's built-in wall header (embeds keep it).
   */
  omitWallHead?: boolean;
}

export interface RenderedWidget {
  html: string;
}

export class WidgetNotImplementedError extends Error {
  readonly preset: string;

  constructor(preset: string) {
    super(`widgets-core: layout preset "${preset}" has no renderer`);
    this.name = "WidgetNotImplementedError";
    this.preset = preset;
  }
}

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

function renderStars(rating: number | null | undefined): string {
  if (rating == null) return "";
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));
  const stars = Array.from({ length: 5 })
    .map((_, index) => `<span style="opacity:${index < rounded ? "1" : ".22"}">★</span>`)
    .join("");
  return `<div class="sw-stars" aria-label="${rounded} out of 5 stars">${stars}</div>`;
}

function renderAvatar(item: WidgetRenderItem): string {
  const src = safeUrl(item.authorAvatarUrl);
  if (src) {
    return `<span class="sw-avatar"><img src="${escapeAttr(src)}" alt=""></span>`;
  }
  return `<span class="sw-avatar" aria-hidden="true">${escapeHtml(initials(item.authorName || "A"))}</span>`;
}

function renderCard(item: WidgetRenderItem, display: WidgetDisplay): string {
  const meta = [
    item.authorRole,
    display.showCompany ? item.authorCompany : null,
  ].filter(Boolean);
  const footer = [
    display.showDate ? formatDate(item.createdAt) : "",
    display.showSource ? item.source : "",
  ].filter(Boolean);
  return `<article class="sw-card" data-sw-item="${escapeAttr(item.id)}">
<header class="sw-card-header">
${display.showAvatar ? renderAvatar(item) : ""}
<div class="sw-author">
<div class="sw-name">${escapeHtml(item.authorName || "Anonymous")}</div>
${meta.length ? `<div class="sw-meta">${escapeHtml(meta.join(" · "))}</div>` : ""}
</div>
${display.showRating ? renderStars(item.rating) : ""}
</header>
<p class="sw-quote">${escapeHtml(item.content)}</p>
${footer.length ? `<footer class="sw-footer">${escapeHtml(footer.join(" · "))}</footer>` : ""}
</article>`;
}

function renderEmpty(): string {
  return `<div class="sw-empty" role="status">No published responses are available for this widget yet.</div>`;
}

function renderItems(
  doc: PublishedWidgetDoc,
  items: WidgetRenderItem[],
  opts: { omitWallHead?: boolean } = {},
): string {
  const cards = items.length
    ? items.map((item) => renderCard(item, doc.display)).join("")
    : renderEmpty();
  switch (doc.layout.preset) {
    case "carousel":
      return `<div class="sw-carousel"><div class="sw-carousel-track">${cards}</div></div>`;
    case "grid":
      return `<div class="sw-grid">${cards}</div>`;
    case "masonry":
      return `<div class="sw-masonry">${cards}</div>`;
    case "list":
      return `<div class="sw-list">${cards}</div>`;
    case "wall": {
      const wall = doc.wall;
      const head =
        wall && !opts.omitWallHead
          ? `<header class="sw-wall-head"><h2 class="sw-wall-title">${escapeHtml(wall.title)}</h2>${wall.subhead ? `<p class="sw-wall-subhead">${escapeHtml(wall.subhead)}</p>` : ""}</header>`
          : "";
      return `${head}<div class="sw-wall-grid">${cards}</div>`;
    }
    default:
      throw new WidgetNotImplementedError(doc.layout.preset);
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
  const variant = normalizeLayoutVariant(doc.layout.preset, doc.layout.variant);
  const html =
    `<div class="sw-scope sw-${doc.layout.preset}" part="root" data-widget-kind="${escapeAttr(doc.kind)}"` +
    ` data-sw-variant="${escapeAttr(variant)}"` +
    `${opts.widgetId ? ` data-widget-id="${escapeAttr(opts.widgetId)}"` : ""}>` +
    `<style>${widgetCss(doc)}</style>` +
    `<div class="sw-root">${renderItems(doc, opts.items, { omitWallHead: opts.omitWallHead })}${watermark(doc)}</div>` +
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
