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
  ContainerMode,
  FormConfig,
  LoaderConfig,
  SuccessConfig,
  StudioQuestion,
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
  /**
   * Layout containers this style is designed to look great in.
   * Informational only — no combination is blocked.
   */
  suggestedLayouts: ContainerMode[];
}

export const STYLE_PRESETS: Record<string, StylePreset> = {
  // ── Cadence ──────────────────────────────────────────────────────────────
  // First of the product-inspired house presets. Translates a crisp,
  // calendar-software-first marketing system into the form runtime: white
  // card on a soft-gray page, near-black monochrome CTA, geometric display
  // type at weight 600 with tight negative tracking, and a soft modern
  // drop shadow. Brand voltage comes from the type + monochrome action layer,
  // never from accent color.
  cadence: {
    label: "Cadence",
    sub: "Crisp white, black CTAs",
    // Clean SaaS card reads best framed; split shows the headline + form well
    suggestedLayouts: ["boxed", "centered", "split"],
    tokens: {
      fontHead: '"Inter", system-ui, sans-serif',
      fontBody: '"Inter", system-ui, sans-serif',
      fontMono: '"JetBrains Mono", ui-monospace, monospace',
      sizeBase: 16,
      sizeHead: 42,
      // The Cal-Sans-substitute signature: Inter 600 with -0.04em tracking.
      trackingHead: -0.04,
      weightHead: 600,
      weightBody: 400,
      bodyLineHeight: 1.5,
      bg: "#f8f9fa",
      surface: "#ffffff",
      ink: "#111111",
      inkSoft: "#6b7280",
      line: "#e5e7eb",
      // Monochrome action layer — the CTA + stars stay near-black, not blue.
      accent: "#111111",
      accentInk: "#ffffff",
      radius: 10,
      fieldShape: "rounded",
      fieldBorderWidth: 1,
      labelCasing: "none",
      focusRing: "ring",
      density: "default",
      buttonStyle: "solid",
      shadow: "sm",
      texture: "none",
      dark: false,
      brandName: "Cadence",
    },
  },
  editorial: {
    label: "Editorial",
    sub: "Warm paper, serif-forward",
    // Best in centered/boxed; large sizeHead (54) overflows split hero
    suggestedLayouts: ["centered", "boxed"],
    tokens: {
      fontHead: '"Fraunces", "Playfair Display", Georgia, serif',
      fontBody: '"Instrument Serif", Georgia, serif',
      fontMono: '"Geist Mono", ui-monospace, monospace',
      sizeBase: 17,
      sizeHead: 54,
      trackingHead: -0.02,
      weightHead: 420,
      weightBody: 400,
      bodyLineHeight: 1.62,
      bg: "#f3ede0",
      surface: "#faf6ec",
      ink: "#191612",
      inkSoft: "#6d6254",
      line: "#dcd3bf",
      accent: "#b5441f",
      accentInk: "#fff8ec",
      radius: 4,
      fieldShape: "underline",
      fieldBorderWidth: 1,
      labelCasing: "none",
      focusRing: "underline",
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
    // Hard shadow meaningful in boxed/split; pointless in fullbleed
    suggestedLayouts: ["boxed", "split"],
    tokens: {
      fontHead: '"Space Grotesk", sans-serif',
      fontBody: '"Geist Mono", ui-monospace, monospace',
      fontMono: '"JetBrains Mono", ui-monospace, monospace',
      sizeBase: 14,
      sizeHead: 44,
      trackingHead: -0.01,
      weightHead: 700,
      weightBody: 400,
      bodyLineHeight: 1.5,
      bg: "#eeece4",
      surface: "#ffffff",
      ink: "#0a0a0a",
      inkSoft: "#555551",
      line: "#0a0a0a",
      accent: "#f14a1a",
      accentInk: "#ffffff",
      radius: 0,
      fieldShape: "square",
      fieldBorderWidth: 2,
      labelCasing: "uppercase",
      focusRing: "ring",
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
    suggestedLayouts: ["boxed", "centered", "fullbleed"],
    tokens: {
      fontHead: '"DM Sans", system-ui, sans-serif',
      fontBody: '"DM Sans", system-ui, sans-serif',
      fontMono: '"Geist Mono", ui-monospace, monospace',
      sizeBase: 16,
      sizeHead: 40,
      trackingHead: -0.025,
      weightHead: 600,
      weightBody: 400,
      bodyLineHeight: 1.6,
      bg: "#fff4ea",
      surface: "#ffffff",
      ink: "#2a1d17",
      inkSoft: "#8a7668",
      line: "#f2e4d4",
      accent: "#ff8a5c",
      accentInk: "#2a1d17",
      radius: 18,
      fieldShape: "rounded",
      fieldBorderWidth: 1,
      labelCasing: "none",
      focusRing: "ring",
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
    suggestedLayouts: ["boxed", "centered", "split"],
    tokens: {
      fontHead: '"Geist", "Inter", sans-serif',
      fontBody: '"Geist", "Inter", sans-serif',
      fontMono: '"Geist Mono", ui-monospace, monospace',
      sizeBase: 15,
      sizeHead: 46,
      trackingHead: -0.035,
      weightHead: 600,
      weightBody: 400,
      bodyLineHeight: 1.55,
      bg: "#0d0d0e",
      surface: "#151517",
      ink: "#f4f3ef",
      inkSoft: "#8c8a84",
      line: "#26262a",
      accent: "#c8ff3e",
      accentInk: "#0d0d0e",
      radius: 10,
      fieldShape: "rounded",
      fieldBorderWidth: 1,
      labelCasing: "none",
      focusRing: "ring",
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
    fieldBorderWidth: [1, 1, 2][Math.floor(Math.random() * 3)],
    labelCasing: Math.random() > 0.8 ? "uppercase" : "none",
    focusRing: (["ring", "ring", "underline"] as const)[
      Math.floor(Math.random() * 3)
    ],
    bodyLineHeight: 1.5 + Math.random() * 0.2,
  };
}

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

// ── Default questions (a real starter form, not an empty shell) ──────────────

export const DEFAULT_QUESTIONS: StudioQuestion[] = [
  {
    id: "rating",
    type: "stars",
    label: "How would you rate your experience?",
    required: true,
    showIf: null,
  },
  {
    id: "story",
    type: "longtext",
    label: "Your testimonial",
    placeholder: "What stood out about working together?",
    required: true,
    showIf: null,
  },
  {
    id: "authorName",
    type: "shorttext",
    label: "Your name",
    placeholder: "Jordan Rivera",
    required: true,
    showIf: null,
  },
  {
    id: "authorEmail",
    type: "shorttext",
    label: "Email",
    placeholder: "you@example.com",
    required: false,
    showIf: null,
  },
];

// ── Default loader + success screens ─────────────────────────────────────────

export const DEFAULT_LOADER: LoaderConfig = {
  enabled: true,
  style: "ring",
  durationMs: 1400,
  message: "Loading your form…",
  useLogo: false,
  tint: "accent",
};

export const DEFAULT_SUCCESS: SuccessConfig = {
  title: "Thank you!",
  message:
    "Your testimonial has been received. We really appreciate you taking the time.",
  action: "message",
  redirectUrl: "",
  ctaLabel: "Back to site",
  ctaUrl: "",
  emoji: "🎉",
  showConfetti: true,
  useLogo: false,
};

// ── Build initial studio config ─────────────────────────────────────────────

export function buildDefaultFormConfig(): FormConfig {
  const presetId = "editorial";
  const tokens = { ...STYLE_PRESETS[presetId].tokens };
  return {
    tokens,
    layout: { ...DEFAULT_LAYOUT },
    questions: DEFAULT_QUESTIONS.map((q) => ({ ...q })),
    headline: DEFAULT_HEADLINE,
    subhead: DEFAULT_SUBHEAD,
    brandName: tokens.brandName,
    submitLabel: "Send testimonial",
    logoUrl: null,
    logoAssetId: null,
    loader: { ...DEFAULT_LOADER },
    success: { ...DEFAULT_SUCCESS },
    preset: presetId,
    layoutPreset: "classic",
  };
}

/**
 * Deep-fill any section missing from a persisted draft so older drafts (saved
 * before loader/success/questions/atomic-tokens existed) render and edit
 * cleanly. Never throws; unknown fields are preserved on the spread base.
 */
export function withConfigDefaults(partial: Partial<FormConfig>): FormConfig {
  const base = buildDefaultFormConfig();
  const questions = Array.isArray(partial.questions)
    ? partial.questions
    : base.questions;
  return {
    ...base,
    ...partial,
    tokens: { ...base.tokens, ...(partial.tokens ?? {}) },
    layout: { ...base.layout, ...(partial.layout ?? {}) },
    loader: { ...base.loader, ...(partial.loader ?? {}) },
    success: { ...base.success, ...(partial.success ?? {}) },
    questions: questions.length > 0 ? questions : base.questions,
  };
}
