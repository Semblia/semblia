/**
 * Widget studio types — strict TypeScript interfaces for the widget editor.
 *
 * Mirrors the Prisma `Widget` model (and `V2WidgetConfig` in `@workspace/types`)
 * with frontend-friendly numbers, but is independent of the deleted widget package.
 * (deprecated) and api_v2 wiring.
 */

// ── Enums (mirror Prisma) ───────────────────────────────────────────────────

export type WidgetKind = "embed" | "wall";
export type WidgetLayout = "carousel" | "grid" | "masonry" | "list" | "wall";
export type WidgetTheme = "light" | "dark" | "auto";
export type WidgetCardStyle = "shadow" | "bordered" | "flat" | "elevated";
export type WidgetDensity = "compact" | "default" | "cozy";
export type WidgetDevice = "desktop" | "tablet" | "mobile";

// ── Design tokens ───────────────────────────────────────────────────────────

export interface WidgetDesignTokens {
  /** Style preset id this token bundle came from. "custom" if user-tweaked. */
  preset: string;
  /** Hex accent color (e.g. project brand). */
  accent: string;
  /** Hex foreground/text color. */
  text: string;
  /** Hex background color of the widget surface. */
  bg: string;
  /** Hex muted/border color. */
  line: string;
  /** Hex card surface (slightly different from bg). */
  surface: string;
  /** Inner radius in px. */
  radius: number;
  /** Font stack — must be a CSS font-family string. */
  fontFamily: string;
  /** Heading font stack (can equal fontFamily). */
  fontHead: string;
  cardStyle: WidgetCardStyle;
  density: WidgetDensity;
}

// ── Visibility & behavior ───────────────────────────────────────────────────

export interface WidgetVisibility {
  showRating: boolean;
  showAvatar: boolean;
  showCompany: boolean;
  showDate: boolean;
  showSource: boolean;
}

export interface WidgetBehavior {
  /** Maximum testimonials to render (1–24). */
  maxItems: number;
  /** Carousel/wall auto-rotation toggle. */
  autoRotate: boolean;
  /** Rotation interval in ms (1000–10000). */
  rotateInterval: number;
  /** Show the "Powered by Tresta" footer. */
  showBranding: boolean;
}

// ── Wall-of-Love specific ───────────────────────────────────────────────────

export interface WallConfig {
  /** Public slug — `tresta.io/wall/[slug]`. Lowercase, kebab-case, ≥ 3 chars. */
  slug: string;
  /** Hero title above the testimonial grid. */
  title: string;
  /** Sub-headline below the title. */
  subhead: string;
}

// ── Content selection ───────────────────────────────────────────────────────

export type WidgetContentMode = "all" | "handpicked";

export interface WidgetContentConfig {
  mode: WidgetContentMode;
  /** Ordered list of testimonial ids. Only used when `mode === "handpicked"`. */
  pickedIds: string[];
}

// ── Studio config (full draft state) ────────────────────────────────────────

export interface WidgetStudioConfig {
  /** Display name (also used as widget identifier in lists). */
  name: string;
  kind: WidgetKind;
  layout: WidgetLayout;
  theme: WidgetTheme;
  tokens: WidgetDesignTokens;
  visibility: WidgetVisibility;
  behavior: WidgetBehavior;
  content: WidgetContentConfig;
  /** Only meaningful when `kind === "wall"`. Always present so type is stable. */
  wall: WallConfig;
}

// ── List entry (gallery + rail) ─────────────────────────────────────────────

export interface WidgetListEntry {
  id: string;
  name: string;
  kind: WidgetKind;
  layout: WidgetLayout;
  theme: WidgetTheme;
  /** Brief preview chip — accent + dark/light. */
  accent: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  /** UI-only metrics (mock). */
  metrics: {
    totalLoads: number;
    avgLoadMs: number;
    lastLoadAt: number | null;
  };
}

// ── Layout glyph descriptors (used by visual layout cards) ──────────────────

export interface LayoutGlyph {
  id: WidgetLayout;
  label: string;
  description: string;
}

export const LAYOUT_GLYPHS: LayoutGlyph[] = [
  {
    id: "carousel",
    label: "Carousel",
    description: "Horizontal slider with auto-rotation.",
  },
  {
    id: "grid",
    label: "Grid",
    description: "Equal cards in a 2- or 3-column grid.",
  },
  {
    id: "masonry",
    label: "Masonry",
    description: "Staggered columns, content-aware heights.",
  },
  { id: "list", label: "List", description: "Stacked vertical column." },
  {
    id: "wall",
    label: "Wall",
    description: "Dense scattered grid for social-proof walls.",
  },
];

// ── Density & card-style descriptors ────────────────────────────────────────

export const DENSITY_LABELS: Record<WidgetDensity, string> = {
  compact: "Compact",
  default: "Default",
  cozy: "Cozy",
};

export const CARD_STYLE_LABELS: Record<WidgetCardStyle, string> = {
  shadow: "Shadow",
  bordered: "Bordered",
  flat: "Flat",
  elevated: "Elevated",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

export function isWallKind(config: WidgetStudioConfig): boolean {
  return config.kind === "wall";
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/;

export function isValidWallSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

export function normalizeWallSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
