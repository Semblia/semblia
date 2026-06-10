/**
 * forms-core shared types.
 *
 * The hosted form consumes the SAME rich config model the Collect Studio edits
 * — copy, questions (with conditional logic), design tokens, layout (flow ×
 * container × hero), loader screen, and success screen — so customizations
 * made in the studio render faithfully on the public form.
 *
 * `FormDesignTokens` at the bottom is the older flat set kept only for the
 * standalone theme engine (`resolveTheme`); it is not on the render path.
 */

// ── Question model ───────────────────────────────────────────────────────────

/**
 * Every question kind the studio can persist, plus the legacy hosted kinds.
 * The renderer collapses these into a handful of real inputs (see `render/`).
 */
export type FormQuestionType =
  | "shorttext"
  | "longtext"
  | "email"
  | "stars"
  | "nps"
  | "emoji"
  | "radio"
  | "checkbox"
  | "dropdown"
  | "file"
  // legacy hosted kinds
  | "text"
  | "textarea"
  | "rating";

export type ShowIfOp = "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "includes";

/** Conditional visibility: show this question only when another answer matches. */
export interface ShowIfRule {
  questionId: string;
  op: ShowIfOp;
  value: string | number;
}

export interface FormQuestion {
  id: string;
  type: FormQuestionType;
  label: string;
  placeholder?: string;
  /** Optional helper line rendered under the label. */
  description?: string;
  required: boolean;
  options?: string[];
  showIf?: ShowIfRule | null;
}

// ── Layout config (flow × container × hero) ─────────────────────────────────

export type FlowMode = "all" | "stepped" | "cards" | "conversational";
export type ContainerMode = "boxed" | "split" | "fullbleed" | "centered";
export type HeroMode = "none" | "top" | "side" | "floating";

export interface FormLayoutConfig {
  flow: FlowMode;
  container: ContainerMode;
  hero: HeroMode;
  mobileFlow: FlowMode | "auto";
  mobileContainer: ContainerMode | "auto";
  stickyProgress: boolean;
  showBrandPill: boolean;
}

// ── Loader screen config ─────────────────────────────────────────────────────

export type LoaderStyle =
  | "spinner"
  | "dots"
  | "bar"
  | "ring"
  | "pulse"
  | "logo-pulse"
  | "logo-draw";

export type LoaderTint = "accent" | "ink";

export interface FormLoaderConfig {
  /** Whether a loading screen is shown before the form appears. */
  enabled: boolean;
  style: LoaderStyle;
  /** Minimum on-screen time in ms. */
  durationMs: number;
  message: string;
  /** logo-pulse / logo-draw styles render the uploaded logo. */
  useLogo: boolean;
  tint: LoaderTint;
}

// ── Success screen config ────────────────────────────────────────────────────

export type SuccessActionKind = "message" | "redirect" | "cta";

export interface FormSuccessConfig {
  title: string;
  message: string;
  action: SuccessActionKind;
  /** Used when action === "redirect" (the API enforces same-host/https). */
  redirectUrl: string;
  /** Used when action === "cta". */
  ctaLabel: string;
  ctaUrl: string;
  /** Decorative glyph above the title (empty string hides it). */
  emoji: string;
  showConfetti: boolean;
  /** Render the brand logo instead of the emoji glyph. */
  useLogo: boolean;
}

// ── Rich design tokens (canonical, shared with the studio) ───────────────────

export type FieldShape = "rounded" | "square" | "underline" | "pill";
export type TokenDensity = "compact" | "default" | "cozy" | "airy";
export type TokenButtonStyle = "solid" | "pill" | "block" | "ghost";
export type TokenShadow = "none" | "sm" | "soft" | "hard" | "glow";
export type TokenTexture = "none" | "grain" | "dots" | "lines";
export type LabelCasing = "none" | "uppercase";
export type FocusRing = "ring" | "underline" | "none";

export interface FormTokens {
  fontHead: string;
  fontBody: string;
  fontMono: string;
  sizeBase: number;
  sizeHead: number;
  trackingHead: number;
  weightHead: number;
  weightBody: number;
  /** Body copy line-height multiplier. */
  bodyLineHeight: number;
  bg: string;
  surface: string;
  ink: string;
  inkSoft: string;
  line: string;
  accent: string;
  accentInk: string;
  radius: number;
  fieldShape: FieldShape;
  /** Input border thickness in px. */
  fieldBorderWidth: number;
  /** Field-label casing. */
  labelCasing: LabelCasing;
  /** Focus affordance style. */
  focusRing: FocusRing;
  density: TokenDensity;
  buttonStyle: TokenButtonStyle;
  shadow: TokenShadow;
  texture: TokenTexture;
  dark: boolean;
}

export interface FormConfig {
  brandName: string;
  headline: string;
  subhead: string;
  submitLabel: string;
  logoUrl?: string | null;
  questions: FormQuestion[];
  tokens: FormTokens;
  layout: FormLayoutConfig;
  loader: FormLoaderConfig;
  success: FormSuccessConfig;
}

// ── View model (what the renderer consumes) ──────────────────────────────────

export interface FormViewModelQuestion {
  id: string;
  type: FormQuestionType;
  label: string;
  placeholder: string;
  description: string;
  required: boolean;
  options: string[];
  showIf: ShowIfRule | null;
  inputName: string;
}

/** A webfont the hosted page should load (resolved from the token font stacks). */
export interface FormWebFont {
  /** Family name as it appears in the stack, e.g. `Space Grotesk`. */
  family: string;
  /** Google Fonts css2 family spec, e.g. `Space+Grotesk:wght@300..700`. */
  spec: string;
}

export interface FormViewModel {
  brandName: string;
  headline: string;
  subhead: string;
  submitLabel: string;
  logoUrl: string | null;
  questions: FormViewModelQuestion[];
  layout: FormLayoutConfig;
  loader: FormLoaderConfig;
  success: FormSuccessConfig;
  cssVars: Record<string, string>;
  colorScheme: "light" | "dark";
  fieldShape: FieldShape;
  webFonts: FormWebFont[];
}

// ── Legacy flat tokens (theme engine only — not on the render path) ──────────

export interface FormDesignTokens {
  accent: string;
  /** Foreground for text/icons sitting on top of `accent`. */
  accentText: string;
  background: string;
  text: string;
  mutedText: string;
  surface: string;
  border: string;
  radius: number;
  fontFamily: string;
}
