/**
 * Widget studio presets — design token bundles, layout defaults,
 * and the factory that builds a default `WidgetStudioConfig`.
 */

import type {
  WidgetBehavior,
  WidgetCardStyle,
  WidgetContentConfig,
  WidgetDensity,
  WidgetDesignTokens,
  WidgetKind,
  WidgetLayout,
  WidgetStudioConfig,
  WidgetTheme,
  WidgetVisibility,
  WallConfig,
} from "./widget-types";

// ── Font choices ────────────────────────────────────────────────────────────

export interface FontChoice {
  value: string;
  label: string;
}

export const FONT_CHOICES: FontChoice[] = [
  { value: '"Geist", system-ui, sans-serif', label: "Geist" },
  { value: '"Space Grotesk", system-ui, sans-serif', label: "Space Grotesk" },
  { value: '"DM Sans", system-ui, sans-serif', label: "DM Sans" },
  { value: '"Fraunces", Georgia, serif', label: "Fraunces" },
];

// ── Style presets ───────────────────────────────────────────────────────────

export interface StylePreset {
  id: string;
  label: string;
  sub: string;
  tokens: WidgetDesignTokens;
}

const PRESET_LIST: StylePreset[] = [
  {
    id: "clean",
    label: "Clean",
    sub: "Minimal, neutral, software-grade",
    tokens: {
      preset: "clean",
      accent: "#0f172a",
      text: "#0a0a0b",
      bg: "#ffffff",
      surface: "#f7f7f8",
      line: "#e5e7eb",
      radius: 12,
      fontFamily: '"Geist", system-ui, sans-serif',
      fontHead: '"Geist", system-ui, sans-serif',
      cardStyle: "bordered",
      density: "default",
    },
  },
  {
    id: "editorial",
    label: "Editorial",
    sub: "Warm paper, serif-forward",
    tokens: {
      preset: "editorial",
      accent: "#b5441f",
      text: "#1c1813",
      bg: "#f5f0e6",
      surface: "#fbf8f0",
      line: "#dcd3bf",
      radius: 4,
      fontFamily: '"DM Sans", system-ui, sans-serif',
      fontHead: '"Fraunces", Georgia, serif',
      cardStyle: "flat",
      density: "cozy",
    },
  },
  {
    id: "brutalist",
    label: "Brutalist",
    sub: "Hard edges, mono accents",
    tokens: {
      preset: "brutalist",
      accent: "#f14a1a",
      text: "#0a0a0a",
      bg: "#eeece4",
      surface: "#ffffff",
      line: "#0a0a0a",
      radius: 0,
      fontFamily: '"Space Grotesk", system-ui, sans-serif',
      fontHead: '"Space Grotesk", system-ui, sans-serif',
      cardStyle: "bordered",
      density: "compact",
    },
  },
  {
    id: "soft",
    label: "Soft",
    sub: "Rounded, pastel, friendly",
    tokens: {
      preset: "soft",
      accent: "#ff8a5c",
      text: "#2a1d17",
      bg: "#fff4ea",
      surface: "#ffffff",
      line: "#f2e4d4",
      radius: 18,
      fontFamily: '"DM Sans", system-ui, sans-serif',
      fontHead: '"DM Sans", system-ui, sans-serif',
      cardStyle: "shadow",
      density: "cozy",
    },
  },
  {
    id: "mono",
    label: "Mono",
    sub: "Black-on-white, structural",
    tokens: {
      preset: "mono",
      accent: "#111111",
      text: "#111111",
      bg: "#fafafa",
      surface: "#ffffff",
      line: "#dcdcdc",
      radius: 6,
      fontFamily: '"Geist", system-ui, sans-serif',
      fontHead: '"Geist", system-ui, sans-serif',
      cardStyle: "flat",
      density: "default",
    },
  },
  {
    id: "noir",
    label: "Noir",
    sub: "Dark, high-contrast, modern",
    tokens: {
      preset: "noir",
      accent: "#c8ff3e",
      text: "#f4f3ef",
      bg: "#0e0e10",
      surface: "#161618",
      line: "#26262a",
      radius: 10,
      fontFamily: '"Geist", system-ui, sans-serif',
      fontHead: '"Geist", system-ui, sans-serif',
      cardStyle: "elevated",
      density: "default",
    },
  },
];

export const STYLE_PRESETS: Record<string, StylePreset> = Object.fromEntries(
  PRESET_LIST.map((p) => [p.id, p]),
);

export const STYLE_PRESET_LIST: StylePreset[] = PRESET_LIST;

// ── Layout / kind defaults ──────────────────────────────────────────────────

export const DEFAULT_VISIBILITY: WidgetVisibility = {
  showRating: true,
  showAvatar: true,
  showCompany: true,
  showDate: false,
  showSource: false,
};

export const DEFAULT_BEHAVIOR: WidgetBehavior = {
  maxItems: 9,
  autoRotate: true,
  rotateInterval: 5000,
  showBranding: true,
};

export const DEFAULT_CONTENT: WidgetContentConfig = {
  mode: "all",
  pickedIds: [],
};

const LAYOUT_BEHAVIOR_OVERRIDES: Partial<
  Record<WidgetLayout, Partial<WidgetBehavior>>
> = {
  carousel: { autoRotate: true, maxItems: 6 },
  grid: { autoRotate: false, maxItems: 6 },
  masonry: { autoRotate: false, maxItems: 9 },
  list: { autoRotate: false, maxItems: 5 },
  wall: { autoRotate: false, maxItems: 12 },
};

const LAYOUT_DEFAULT_FOR_KIND: Record<WidgetKind, WidgetLayout> = {
  embed: "carousel",
  wall: "wall",
};

// ── Wall defaults ───────────────────────────────────────────────────────────

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "dashboard",
  "docs",
  "help",
  "login",
  "logout",
  "settings",
  "signup",
  "wall",
  "widgets",
  "www",
]);

export function buildDefaultWallConfig(projectSlug: string): WallConfig {
  const safe = projectSlug.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const slug = RESERVED_SLUGS.has(safe) ? `${safe}-wall` : `${safe}-love`;
  return {
    slug,
    title: "Loved by people who ship",
    subhead: "Real stories from real customers — handpicked from our inbox.",
  };
}

// ── Density / card style available lists ────────────────────────────────────

export const DENSITY_OPTIONS: WidgetDensity[] = ["compact", "default", "cozy"];
export const CARD_STYLES: WidgetCardStyle[] = [
  "shadow",
  "bordered",
  "flat",
  "elevated",
];

// ── Default config builder ──────────────────────────────────────────────────

export function buildDefaultWidgetConfig(opts: {
  kind: WidgetKind;
  layout?: WidgetLayout;
  projectSlug: string;
  projectBrandColor?: string | null;
  name?: string;
}): WidgetStudioConfig {
  const layout = opts.layout ?? LAYOUT_DEFAULT_FOR_KIND[opts.kind];
  const presetId = "clean";
  const tokens: WidgetDesignTokens = { ...STYLE_PRESETS[presetId].tokens };

  // Seed accent from project brand color when available.
  if (opts.projectBrandColor) {
    tokens.accent = opts.projectBrandColor;
  }

  const behavior: WidgetBehavior = {
    ...DEFAULT_BEHAVIOR,
    ...(LAYOUT_BEHAVIOR_OVERRIDES[layout] ?? {}),
  };

  const theme: WidgetTheme = "light";

  return {
    name:
      opts.name ??
      (opts.kind === "wall"
        ? "Wall of Love"
        : labelForLayout(layout, "embed widget")),
    kind: opts.kind,
    layout,
    theme,
    tokens,
    visibility: { ...DEFAULT_VISIBILITY },
    behavior,
    content: { ...DEFAULT_CONTENT, pickedIds: [] },
    wall: buildDefaultWallConfig(opts.projectSlug),
  };
}

function labelForLayout(layout: WidgetLayout, suffix: string): string {
  const map: Record<WidgetLayout, string> = {
    carousel: "Carousel",
    grid: "Grid",
    masonry: "Masonry",
    list: "List",
    wall: "Wall",
  };
  return `${map[layout]} ${suffix}`;
}

// ── Randomize (for the Remix button) ────────────────────────────────────────

export function randomTokens(currentAccent?: string): WidgetDesignTokens {
  const presets = PRESET_LIST;
  const base = presets[Math.floor(Math.random() * presets.length)].tokens;
  const radii = [0, 4, 8, 12, 18];
  const fonts = FONT_CHOICES;
  return {
    ...base,
    accent: currentAccent ?? base.accent,
    radius: radii[Math.floor(Math.random() * radii.length)],
    fontFamily: fonts[Math.floor(Math.random() * fonts.length)].value,
    fontHead: fonts[Math.floor(Math.random() * fonts.length)].value,
    cardStyle: CARD_STYLES[Math.floor(Math.random() * CARD_STYLES.length)],
    density:
      DENSITY_OPTIONS[Math.floor(Math.random() * DENSITY_OPTIONS.length)],
    preset: "custom",
  };
}
