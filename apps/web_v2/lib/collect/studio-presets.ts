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
  {
    value: '"JetBrains Mono", ui-monospace, monospace',
    label: "JetBrains Mono",
  },
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

// ── All presets (house + community) ──────────────────────────────────────────

export const ALL_PRESETS: Record<string, StylePreset> = {
  ...STYLE_PRESETS,
};

// ── Randomize helper ─────────────────────────────────────────────────────────

export function randomTokens(): DesignTokens {
  const keys = Object.keys(ALL_PRESETS);
  const base = {
    ...ALL_PRESETS[keys[Math.floor(Math.random() * keys.length)]].tokens,
  };
  const shapes: FieldShape[] = ["rounded", "square", "underline", "pill"];
  const densities: TokenDensity[] = ["compact", "default", "cozy", "airy"];
  const buttons: TokenButtonStyle[] = ["solid", "pill", "block", "ghost"];
  const textures: TokenTexture[] = ["none", "grain", "dots", "lines"];
  const hues = [12, 28, 45, 92, 140, 180, 215, 260, 310, 340];
  const hue = hues[Math.floor(Math.random() * hues.length)];
  const accent = `oklch(0.68 0.18 ${hue})`;
  return {
    ...base,
    fontHead:
      FONT_CHOICES[Math.floor(Math.random() * FONT_CHOICES.length)].value,
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
