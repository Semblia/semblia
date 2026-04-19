/**
 * Studio presets — design token bundles and layout combos.
 * Maps the design reference presets into our type system.
 */

import type {
  DesignTokens,
  FieldShape,
  TokenDensity,
  TokenButtonStyle,
  TokenTexture,
  LayoutConfig,
  StudioQuestion,
  StudioConfig,
} from "./studio-types";

// ── Font choices (for the controls panel) ───────────────────────────────────

export interface FontChoice {
  value: string;
  label: string;
}

export const FONT_CHOICES: FontChoice[] = [
  { value: '"Geist", "Inter", sans-serif', label: "Geist" },
  { value: '"Inter", system-ui, sans-serif', label: "Inter" },
  { value: '"DM Sans", system-ui, sans-serif', label: "DM Sans" },
  { value: '"Space Grotesk", sans-serif', label: "Space Grotesk" },
  { value: '"Fraunces", Georgia, serif', label: "Fraunces" },
  { value: '"Playfair Display", Georgia, serif', label: "Playfair" },
  { value: '"Instrument Serif", Georgia, serif', label: "Instrument Serif" },
  { value: '"JetBrains Mono", ui-monospace, monospace', label: "JetBrains Mono" },
  { value: '"Geist Mono", ui-monospace, monospace', label: "Geist Mono" },
  { value: '"Caveat", cursive', label: "Caveat" },
];

// ── Style presets ───────────────────────────────────────────────────────────

export interface StylePreset {
  label: string;
  sub: string;
  tokens: DesignTokens;
}

export const STYLE_PRESETS: Record<string, StylePreset> = {
  editorial: {
    label: "Editorial",
    sub: "Warm paper, serif-forward",
    tokens: {
      fontHead: '"Fraunces", "Playfair Display", Georgia, serif',
      fontBody: '"Instrument Serif", Georgia, serif',
      fontMono: '"Geist Mono", ui-monospace, monospace',
      sizeBase: 17,
      sizeHead: 54,
      trackingHead: -0.02,
      weightHead: 420,
      weightBody: 400,
      bg: "#f3ede0",
      surface: "#faf6ec",
      ink: "#191612",
      inkSoft: "#6d6254",
      line: "#dcd3bf",
      accent: "#b5441f",
      accentInk: "#fff8ec",
      radius: 4,
      fieldShape: "underline",
      density: "airy",
      buttonStyle: "solid",
      shadow: "sm",
      texture: "grain",
      dark: false,
      brandName: "Halcyon & Co.",
    },
  },
  neo: {
    label: "Neo-Brutalist",
    sub: "Mono grid, high contrast",
    tokens: {
      fontHead: '"Space Grotesk", sans-serif',
      fontBody: '"Geist Mono", ui-monospace, monospace',
      fontMono: '"JetBrains Mono", ui-monospace, monospace',
      sizeBase: 14,
      sizeHead: 44,
      trackingHead: -0.01,
      weightHead: 700,
      weightBody: 400,
      bg: "#eeece4",
      surface: "#ffffff",
      ink: "#0a0a0a",
      inkSoft: "#555551",
      line: "#0a0a0a",
      accent: "#f14a1a",
      accentInk: "#ffffff",
      radius: 0,
      fieldShape: "square",
      density: "compact",
      buttonStyle: "block",
      shadow: "hard",
      texture: "dots",
      dark: false,
      brandName: "LATTICE//01",
    },
  },
  soft: {
    label: "Soft",
    sub: "Rounded, pastel, friendly",
    tokens: {
      fontHead: '"DM Sans", system-ui, sans-serif',
      fontBody: '"DM Sans", system-ui, sans-serif',
      fontMono: '"Geist Mono", ui-monospace, monospace',
      sizeBase: 16,
      sizeHead: 40,
      trackingHead: -0.025,
      weightHead: 600,
      weightBody: 400,
      bg: "#fff4ea",
      surface: "#ffffff",
      ink: "#2a1d17",
      inkSoft: "#8a7668",
      line: "#f2e4d4",
      accent: "#ff8a5c",
      accentInk: "#2a1d17",
      radius: 18,
      fieldShape: "rounded",
      density: "cozy",
      buttonStyle: "pill",
      shadow: "soft",
      texture: "none",
      dark: false,
      brandName: "Peach & Pine",
    },
  },
  noir: {
    label: "Noir",
    sub: "Dark, high-contrast, modern",
    tokens: {
      fontHead: '"Geist", "Inter", sans-serif',
      fontBody: '"Geist", "Inter", sans-serif',
      fontMono: '"Geist Mono", ui-monospace, monospace',
      sizeBase: 15,
      sizeHead: 46,
      trackingHead: -0.035,
      weightHead: 600,
      weightBody: 400,
      bg: "#0d0d0e",
      surface: "#151517",
      ink: "#f4f3ef",
      inkSoft: "#8c8a84",
      line: "#26262a",
      accent: "#c8ff3e",
      accentInk: "#0d0d0e",
      radius: 10,
      fieldShape: "rounded",
      density: "default",
      buttonStyle: "solid",
      shadow: "glow",
      texture: "none",
      dark: true,
      brandName: "Acid Atlas",
    },
  },
};

// ── Community presets — from the Tresta gallery ─────────────────────────────

export interface CommunityStylePreset extends StylePreset {
  author: string;
  likes: number;
}

export const COMMUNITY_PRESETS: Record<string, CommunityStylePreset> = {
  riviera: {
    label: "Riviera",
    sub: "Mediterranean blues, boutique hotel",
    author: "@studiobrio",
    likes: 2314,
    tokens: {
      fontHead: '"Playfair Display", Georgia, serif',
      fontBody: '"DM Sans", system-ui, sans-serif',
      fontMono: '"Geist Mono", ui-monospace, monospace',
      sizeBase: 16, sizeHead: 48,
      trackingHead: -0.02, weightHead: 500, weightBody: 400,
      bg: "#eaf0f5", surface: "#ffffff",
      ink: "#0f2a3d", inkSoft: "#5a7a8e", line: "#d4dfe8",
      accent: "#1a6ca8", accentInk: "#ffffff",
      radius: 2, fieldShape: "underline", density: "cozy",
      buttonStyle: "solid", shadow: "soft", texture: "none",
      dark: false, brandName: "Villa Rosa",
    },
  },
  terracotta: {
    label: "Terracotta",
    sub: "Desert warmth, ceramic craft",
    author: "@claymade",
    likes: 1876,
    tokens: {
      fontHead: '"Fraunces", Georgia, serif',
      fontBody: '"Fraunces", Georgia, serif',
      fontMono: '"Geist Mono", ui-monospace, monospace',
      sizeBase: 16, sizeHead: 52,
      trackingHead: -0.015, weightHead: 500, weightBody: 400,
      bg: "#e8d5c0", surface: "#f5e7d4",
      ink: "#3d2216", inkSoft: "#8a6548", line: "#d4b89a",
      accent: "#a63f1a", accentInk: "#f5e7d4",
      radius: 2, fieldShape: "rounded", density: "airy",
      buttonStyle: "solid", shadow: "sm", texture: "grain",
      dark: false, brandName: "Hearth Studio",
    },
  },
  minthaus: {
    label: "Minthaus",
    sub: "Crisp mint, scandi clean",
    author: "@yulia.h",
    likes: 1542,
    tokens: {
      fontHead: '"Geist", sans-serif',
      fontBody: '"Geist", sans-serif',
      fontMono: '"Geist Mono", ui-monospace, monospace',
      sizeBase: 15, sizeHead: 40,
      trackingHead: -0.03, weightHead: 600, weightBody: 400,
      bg: "#f0f4ed", surface: "#ffffff",
      ink: "#1a2e1e", inkSoft: "#6b7d6f", line: "#d8e2d5",
      accent: "#2d7a4e", accentInk: "#ffffff",
      radius: 12, fieldShape: "rounded", density: "default",
      buttonStyle: "pill", shadow: "soft", texture: "none",
      dark: false, brandName: "Minthaus",
    },
  },
  cyberia: {
    label: "Cyberia",
    sub: "Terminal green on oil black",
    author: "@retrogrid",
    likes: 3890,
    tokens: {
      fontHead: '"JetBrains Mono", ui-monospace, monospace',
      fontBody: '"JetBrains Mono", ui-monospace, monospace',
      fontMono: '"JetBrains Mono", ui-monospace, monospace',
      sizeBase: 13, sizeHead: 36,
      trackingHead: 0.005, weightHead: 700, weightBody: 400,
      bg: "#050a08", surface: "#0a1411",
      ink: "#4ade80", inkSoft: "#2d7a4e", line: "#1a2e20",
      accent: "#4ade80", accentInk: "#050a08",
      radius: 0, fieldShape: "square", density: "compact",
      buttonStyle: "block", shadow: "glow", texture: "lines",
      dark: true, brandName: "CYBERIA_CO",
    },
  },
  powderblush: {
    label: "Powder Blush",
    sub: "Bridal soft, handwritten accents",
    author: "@petalstudio",
    likes: 982,
    tokens: {
      fontHead: '"Caveat", cursive',
      fontBody: '"DM Sans", system-ui, sans-serif',
      fontMono: '"Geist Mono", ui-monospace, monospace',
      sizeBase: 16, sizeHead: 64,
      trackingHead: -0.01, weightHead: 500, weightBody: 400,
      bg: "#fbeee8", surface: "#ffffff",
      ink: "#4a2a32", inkSoft: "#a5717e", line: "#f0d8d4",
      accent: "#d4798a", accentInk: "#ffffff",
      radius: 20, fieldShape: "pill", density: "cozy",
      buttonStyle: "pill", shadow: "soft", texture: "none",
      dark: false, brandName: "Petal & Vow",
    },
  },
  nocturne: {
    label: "Nocturne",
    sub: "Violet midnight, editorial serif",
    author: "@houseofsable",
    likes: 1204,
    tokens: {
      fontHead: '"Instrument Serif", Georgia, serif',
      fontBody: '"Inter", system-ui, sans-serif',
      fontMono: '"Geist Mono", ui-monospace, monospace',
      sizeBase: 15, sizeHead: 58,
      trackingHead: -0.025, weightHead: 400, weightBody: 400,
      bg: "#14111e", surface: "#1d1830",
      ink: "#f0e8f5", inkSoft: "#a095b8", line: "#2d2545",
      accent: "#c59fff", accentInk: "#14111e",
      radius: 6, fieldShape: "rounded", density: "airy",
      buttonStyle: "solid", shadow: "glow", texture: "none",
      dark: true, brandName: "Sable House",
    },
  },
  zineclub: {
    label: "Zine Club",
    sub: "Photocopy punk, hand-cut",
    author: "@xeroxcollective",
    likes: 2789,
    tokens: {
      fontHead: '"Space Grotesk", sans-serif',
      fontBody: '"Space Grotesk", sans-serif',
      fontMono: '"JetBrains Mono", ui-monospace, monospace',
      sizeBase: 14, sizeHead: 52,
      trackingHead: -0.04, weightHead: 700, weightBody: 500,
      bg: "#ede8dc", surface: "#ffffff",
      ink: "#000000", inkSoft: "#444444", line: "#000000",
      accent: "#ff3366", accentInk: "#ffffff",
      radius: 0, fieldShape: "square", density: "compact",
      buttonStyle: "block", shadow: "hard", texture: "grain",
      dark: false, brandName: "ZINE 07",
    },
  },
  sunray: {
    label: "Sunray",
    sub: "Golden hour, tactile",
    author: "@lomalands",
    likes: 1631,
    tokens: {
      fontHead: '"DM Sans", system-ui, sans-serif',
      fontBody: '"DM Sans", system-ui, sans-serif',
      fontMono: '"Geist Mono", ui-monospace, monospace',
      sizeBase: 16, sizeHead: 46,
      trackingHead: -0.035, weightHead: 700, weightBody: 400,
      bg: "#fff6e0", surface: "#ffffff",
      ink: "#3a2a0f", inkSoft: "#8a6d3e", line: "#f5e3b8",
      accent: "#f0a42d", accentInk: "#3a2a0f",
      radius: 14, fieldShape: "rounded", density: "default",
      buttonStyle: "solid", shadow: "soft", texture: "dots",
      dark: false, brandName: "Loma Lands",
    },
  },
};

// ── All presets (house + community) ──────────────────────────────────────────

export const ALL_PRESETS: Record<string, StylePreset | CommunityStylePreset> = {
  ...STYLE_PRESETS,
  ...COMMUNITY_PRESETS,
};

// ── Randomize helper ─────────────────────────────────────────────────────────

export function randomTokens(): DesignTokens {
  const keys = Object.keys(ALL_PRESETS);
  const base = { ...ALL_PRESETS[keys[Math.floor(Math.random() * keys.length)]].tokens };
  const shapes: FieldShape[] = ["rounded", "square", "underline", "pill"];
  const densities: TokenDensity[] = ["compact", "default", "cozy", "airy"];
  const buttons: TokenButtonStyle[] = ["solid", "pill", "block", "ghost"];
  const textures: TokenTexture[] = ["none", "grain", "dots", "lines"];
  const hues = [12, 28, 45, 92, 140, 180, 215, 260, 310, 340];
  const hue = hues[Math.floor(Math.random() * hues.length)];
  const accent = `oklch(0.68 0.18 ${hue})`;
  return {
    ...base,
    fontHead: FONT_CHOICES[Math.floor(Math.random() * FONT_CHOICES.length)].value,
    fontBody: FONT_CHOICES[Math.floor(Math.random() * 5)].value,
    radius: [0, 2, 6, 12, 20, 28][Math.floor(Math.random() * 6)],
    fieldShape: shapes[Math.floor(Math.random() * shapes.length)],
    density: densities[Math.floor(Math.random() * densities.length)],
    buttonStyle: buttons[Math.floor(Math.random() * buttons.length)],
    texture: textures[Math.floor(Math.random() * textures.length)],
    accent,
    sizeHead: 36 + Math.floor(Math.random() * 24),
    trackingHead: -0.01 - Math.random() * 0.03,
  };
}

// ── Layout presets ──────────────────────────────────────────────────────────

export interface LayoutPreset {
  label: string;
  sub: string;
  config: Omit<LayoutConfig, "stickyProgress" | "showBrandPill">;
}

export const LAYOUT_PRESETS: Record<string, LayoutPreset> = {
  classic: {
    label: "Classic",
    sub: "Single column, all at once",
    config: {
      flow: "all",
      container: "boxed",
      hero: "top",
      mobileFlow: "auto",
      mobileContainer: "auto",
    },
  },
  split: {
    label: "Hero Split",
    sub: "Side pane + form",
    config: {
      flow: "all",
      container: "split",
      hero: "side",
      mobileFlow: "stepped",
      mobileContainer: "fullbleed",
    },
  },
  stepped: {
    label: "Stepped",
    sub: "One question at a time",
    config: {
      flow: "stepped",
      container: "fullbleed",
      hero: "floating",
      mobileFlow: "auto",
      mobileContainer: "auto",
    },
  },
  cards: {
    label: "Card Stack",
    sub: "Swipeable cards",
    config: {
      flow: "cards",
      container: "boxed",
      hero: "top",
      mobileFlow: "auto",
      mobileContainer: "auto",
    },
  },
  convo: {
    label: "Conversational",
    sub: "Chat-like progressive reveal",
    config: {
      flow: "conversational",
      container: "centered",
      hero: "none",
      mobileFlow: "auto",
      mobileContainer: "auto",
    },
  },
  magazine: {
    label: "Magazine",
    sub: "Editorial hero, all-at-once",
    config: {
      flow: "all",
      container: "centered",
      hero: "top",
      mobileFlow: "auto",
      mobileContainer: "auto",
    },
  },
};

// ── Default questions ───────────────────────────────────────────────────────

export const DEFAULT_QUESTIONS: StudioQuestion[] = [
  {
    id: "q1",
    type: "stars",
    label: "How would you rate your experience?",
    required: true,
  },
  {
    id: "q2",
    type: "longtext",
    label: "In your own words, what did you love most?",
    placeholder: "Tell us the story...",
    required: true,
    showIf: { questionId: "q1", op: "gte", value: 4 },
  },
  {
    id: "q2b",
    type: "longtext",
    label: "What could we do better?",
    placeholder: "Be candid — we read every word.",
    required: true,
    showIf: { questionId: "q1", op: "lte", value: 3 },
  },
  {
    id: "q3",
    type: "emoji",
    label: "How did it make you feel?",
    required: false,
  },
  {
    id: "q4",
    type: "radio",
    label: "Would you recommend us?",
    options: ["Absolutely", "Probably", "Not sure yet"],
    required: true,
  },
  {
    id: "q5",
    type: "shorttext",
    label: "Your name",
    placeholder: "Jamie R.",
    required: true,
  },
  {
    id: "q6",
    type: "shorttext",
    label: "Role & company",
    placeholder: "Design Lead, Northwind",
    required: false,
  },
];

// ── Default headline ────────────────────────────────────────────────────────

export const DEFAULT_HEADLINE = "How was your experience?";
export const DEFAULT_SUBHEAD =
  "We'd love to hear your story. Your feedback helps us grow — and with your permission, might be shared with future customers.";

// ── Default layout ──────────────────────────────────────────────────────────

export const DEFAULT_LAYOUT: LayoutConfig = {
  flow: "all",
  container: "boxed",
  hero: "top",
  mobileFlow: "auto",
  mobileContainer: "auto",
  stickyProgress: true,
  showBrandPill: true,
};

// ── Build initial studio config ─────────────────────────────────────────────

export function buildDefaultStudioConfig(): StudioConfig {
  const presetId = "editorial";
  const tokens = { ...STYLE_PRESETS[presetId].tokens };
  return {
    tokens,
    layout: { ...DEFAULT_LAYOUT },
    questions: structuredClone(DEFAULT_QUESTIONS),
    headline: DEFAULT_HEADLINE,
    subhead: DEFAULT_SUBHEAD,
    brandName: tokens.brandName,
    logoUrl: null,
    preset: presetId,
    layoutPreset: "classic",
  };
}
