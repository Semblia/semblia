/**
 * Shared Widget Types
 * Used across API, web app, and hosted/embed surfaces.
 */

/**
 * Widget layout types
 */
export type WidgetLayout =
  | "grid"
  | "list"
  | "masonry"
  | "carousel"
  | "wall"
  | "marquee";

/**
 * All valid layout values as a const array.
 */
export const ALL_WIDGET_LAYOUTS = [
  "grid",
  "list",
  "masonry",
  "carousel",
  "wall",
  "marquee",
] as const;

/**
 * Layouts available on the Free plan.
 */
export const FREE_LAYOUTS: readonly WidgetLayout[] = ["grid", "list"] as const;

/**
 * Layouts that require a Pro subscription.
 */
export const PRO_LAYOUTS: readonly WidgetLayout[] = [
  "masonry",
  "carousel",
  "wall",
  "marquee",
] as const;

/**
 * Widget theme types
 */
export type WidgetTheme = "light" | "dark" | "auto";

export const MVP_WIDGET_THEMES = ["light", "dark", "auto"] as const;

/**
 * Card style types
 */
export type CardStyle = "default" | "minimal" | "bordered" | "glass";

/**
 * Animation types
 */
export type AnimationType = "none" | "fadeIn" | "slideUp" | "scale";

/**
 * Widget Configuration
 * This is the structure stored in the database as JSON
 */
export interface WidgetConfig {
  // Layout & Theme
  layout?: WidgetLayout;
  theme?: WidgetTheme;

  // Colors
  primaryColor?: string;
  secondaryColor?: string;

  // Content Visibility
  showRating?: boolean;
  showDate?: boolean;
  showAvatar?: boolean;
  showAuthorRole?: boolean;
  showAuthorCompany?: boolean;

  // Display Settings
  maxTestimonials?: number;
  columns?: number;
  gap?: number;

  // Styling
  cardStyle?: CardStyle;
  animation?: AnimationType;
  fontFamily?: string;
  cardRadius?: number; // px
  cardShadow?: boolean;

  // Carousel Behavior
  autoRotate?: boolean;
  rotateInterval?: number; // milliseconds
  showNavigation?: boolean;
  showDots?: boolean;

  // Branding
  showBranding?: boolean; // "Powered by Tresta" badge

  // Advanced
  customCss?: string; // Custom CSS injected into the widget
}

/**
 * Default widget configuration values
 */
export const DEFAULT_WIDGET_CONFIG: Required<WidgetConfig> = {
  layout: "grid",
  theme: "dark",
  primaryColor: "#3B82F6",
  secondaryColor: "#1a1a2e",
  showRating: true,
  showDate: true,
  showAvatar: true,
  showAuthorRole: true,
  showAuthorCompany: true,
  maxTestimonials: 10,
  columns: 3,
  gap: 16,
  cardStyle: "default",
  animation: "fadeIn",
  fontFamily: "Inter, system-ui, sans-serif",
  cardRadius: 12,
  cardShadow: true,
  autoRotate: false,
  rotateInterval: 5000,
  showNavigation: true,
  showDots: true,
  showBranding: true,
  customCss: "",
};

/**
 * Free-tier limits
 */
export const FREE_TIER_LIMITS = {
  maxTestimonials: 10,
  maxWidgets: 1,
} as const;

/**
 * Fields surfaced in the widget customization UI.
 */
export const WIDGET_CONFIG_FIELDS = [
  "layout",
  "theme",
  "primaryColor",
  "secondaryColor",
  "showRating",
  "showAvatar",
  "showDate",
  "showAuthorRole",
  "showAuthorCompany",
  "maxTestimonials",
  "columns",
  "gap",
  "cardStyle",
  "animation",
  "fontFamily",
  "cardRadius",
  "cardShadow",
  "autoRotate",
  "rotateInterval",
  "showNavigation",
  "showDots",
  "showBranding",
] as const satisfies ReadonlyArray<keyof WidgetConfig>;

export type WidgetConfigField = (typeof WIDGET_CONFIG_FIELDS)[number];

/**
 * Widget entity (database model)
 */
export interface Widget {
  id: string;
  projectId: string;
  config: WidgetConfig;
  createdAt: string;
  updatedAt: string;
}

/**
 * Testimonial entity
 */
export interface Testimonial {
  id: string;
  content: string;
  rating?: number;
  authorName: string;
  authorRole?: string;
  authorCompany?: string;
  authorImage?: string;
  authorEmail?: string;
  videoUrl?: string;
  type?: string;
  createdAt: string;
}

/**
 * Public widget data (returned by API for embedding)
 */
export interface PublicWidgetData {
  widget: {
    id: string;
    name: string;
    type: string;
    layout: WidgetLayout;
    theme: Record<string, any>;
    settings: WidgetConfig;
  };
  project: {
    name: string;
    slug: string;
    logoUrl?: string;
    brandColorPrimary?: string;
    brandColorSecondary?: string;
  };
  testimonials: Testimonial[];
  meta: {
    total: number;
    fetchedAt: string;
  };
}

/**
 * Widget creation payload
 */
export interface CreateWidgetPayload {
  projectId: string;
  config: WidgetConfig;
}

/**
 * Widget update payload
 */
export interface UpdateWidgetPayload {
  config?: Partial<WidgetConfig>;
}
