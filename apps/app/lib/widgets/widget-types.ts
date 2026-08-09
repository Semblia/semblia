import type {
  WidgetDefinitionDoc,
  WidgetKind,
} from "@workspace/widgets-core/schema";

export type { WidgetKind };
/** The DB/list layout mirror — each template maps to its nearest shape. */
export type WidgetLayout = "carousel" | "grid" | "masonry" | "list" | "wall";
export type WidgetTemplateId = string;
export type WidgetTheme = "light" | "dark" | "system";
export type WidgetCardStyle = "flat" | "bordered" | "elevated";
export type WidgetDensity = "compact" | "cozy" | "spacious";
export type WidgetDevice = "desktop" | "tablet" | "mobile";

/**
 * Deprecated compatibility mirror for list thumbnails and older preview code.
 * Widget Studio now persists `definition`; these values are derived from it.
 */
export interface WidgetDesignTokens {
  preset: string;
  accent: string;
  text: string;
  bg: string;
  line: string;
  surface: string;
  radius: number;
  fontFamily: string;
  fontHead: string;
  cardStyle: WidgetCardStyle;
  density: WidgetDensity;
}

export interface WidgetVisibility {
  showRating: boolean;
  showAvatar: boolean;
  showCompany: boolean;
  showDate: boolean;
  showSource: boolean;
}

export interface WidgetBehavior {
  maxItems: number;
  autoRotate: boolean;
  rotateInterval: number;
  showBranding: boolean;
}

export interface WallConfig {
  slug: string;
  title: string;
  subhead: string;
}

export type WidgetContentMode = "all" | "handpicked";

export interface WidgetContentConfig {
  mode: WidgetContentMode;
  pickedIds: string[];
}

export interface WidgetStudioConfig {
  name: string;
  definition: WidgetDefinitionDoc;
  kind: WidgetKind;
  templateId: WidgetTemplateId;
  layout: WidgetLayout;
  theme: WidgetTheme;
  tokens: WidgetDesignTokens;
  visibility: WidgetVisibility;
  behavior: WidgetBehavior;
  content: WidgetContentConfig;
  wall: WallConfig;
}

export interface WidgetListEntry {
  id: string;
  name: string;
  kind: WidgetKind;
  layout: WidgetLayout;
  theme: WidgetTheme;
  accent: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  metrics: {
    totalLoads: number;
    avgLoadMs: number;
    lastLoadAt: number | null;
  };
}

export interface LayoutGlyph {
  id: WidgetLayout;
  label: string;
  description: string;
}

export const LAYOUT_GLYPHS: LayoutGlyph[] = [
  {
    id: "carousel",
    label: "Carousel",
    description: "Horizontal proof strip with rotation controls.",
  },
  {
    id: "grid",
    label: "Grid",
    description: "Balanced card grid for landing pages.",
  },
  {
    id: "masonry",
    label: "Masonry",
    description: "Staggered cards for varied quote lengths.",
  },
  { id: "list", label: "List", description: "Dense vertical proof stack." },
  {
    id: "wall",
    label: "Wall",
    description: "Expanded wall layout inside an embed.",
  },
];

export const DENSITY_LABELS: Record<WidgetDensity, string> = {
  compact: "Compact",
  cozy: "Cozy",
  spacious: "Spacious",
};

export const CARD_STYLE_LABELS: Record<WidgetCardStyle, string> = {
  flat: "Flat",
  bordered: "Bordered",
  elevated: "Elevated",
};

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
