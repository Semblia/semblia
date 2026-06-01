/**
 * Studio types — extended form builder model with composable layout,
 * rich design tokens, custom questions, and conditional logic.
 *
 * These types drive the "Testimonial Studio" UI. The canonical FormConfig
 * is still the persistence format; studio state converts to/from it on save.
 */

// ── Question types ──────────────────────────────────────────────────────────

export type QuestionType =
  | "shorttext"
  | "longtext"
  | "stars"
  | "nps"
  | "emoji"
  | "radio"
  | "checkbox"
  | "dropdown"
  | "file";

export type ShowIfOp = "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "includes";

export interface ShowIfRule {
  questionId: string;
  op: ShowIfOp;
  value: string | number;
}

export interface StudioQuestion {
  id: string;
  type: QuestionType;
  label: string;
  placeholder?: string;
  /** Optional helper line rendered under the label. */
  description?: string;
  required: boolean;
  options?: string[];
  showIf?: ShowIfRule | null;
}

/** Human label + sensible defaults for each question kind (used by the builder). */
export const QUESTION_TYPE_META: Record<
  QuestionType,
  { label: string; hasOptions: boolean; defaultLabel: string }
> = {
  shorttext: {
    label: "Short text",
    hasOptions: false,
    defaultLabel: "Your answer",
  },
  longtext: {
    label: "Long text",
    hasOptions: false,
    defaultLabel: "Tell us more",
  },
  stars: {
    label: "Star rating",
    hasOptions: false,
    defaultLabel: "Your rating",
  },
  nps: {
    label: "NPS (0–10)",
    hasOptions: false,
    defaultLabel: "How likely are you to recommend us?",
  },
  emoji: {
    label: "Emoji scale",
    hasOptions: false,
    defaultLabel: "How do you feel?",
  },
  radio: { label: "Single choice", hasOptions: true, defaultLabel: "Pick one" },
  checkbox: {
    label: "Multi choice",
    hasOptions: true,
    defaultLabel: "Select all that apply",
  },
  dropdown: {
    label: "Dropdown",
    hasOptions: true,
    defaultLabel: "Choose an option",
  },
  file: {
    label: "File upload",
    hasOptions: false,
    defaultLabel: "Attach a file",
  },
};

// ── Layout config ───────────────────────────────────────────────────────────

export type FlowMode = "all" | "stepped" | "cards" | "conversational";
export type ContainerMode = "boxed" | "split" | "fullbleed" | "centered";
export type HeroMode = "none" | "top" | "side" | "floating";

export interface LayoutConfig {
  flow: FlowMode;
  container: ContainerMode;
  hero: HeroMode;
  mobileFlow: FlowMode | "auto";
  mobileContainer: ContainerMode | "auto";
  stickyProgress: boolean;
  showBrandPill: boolean;
}

// ── Design tokens ───────────────────────────────────────────────────────────

export type FieldShape = "rounded" | "square" | "underline" | "pill";
export type TokenDensity = "compact" | "default" | "cozy" | "airy";
export type TokenButtonStyle = "solid" | "pill" | "block" | "ghost";
export type TokenShadow = "none" | "sm" | "soft" | "hard" | "glow";
export type TokenTexture = "none" | "grain" | "dots" | "lines";
export type LabelCasing = "none" | "uppercase";
export type FocusRing = "ring" | "underline" | "none";

export interface DesignTokens {
  fontHead: string;
  fontBody: string;
  fontMono: string;
  sizeBase: number;
  sizeHead: number;
  trackingHead: number;
  weightHead: number;
  weightBody: number;
  /** Body copy line-height multiplier (atomic). */
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
  /** Input/border thickness in px (atomic). */
  fieldBorderWidth: number;
  /** Field-label casing (atomic). */
  labelCasing: LabelCasing;
  /** Focus affordance style (atomic). */
  focusRing: FocusRing;
  density: TokenDensity;
  buttonStyle: TokenButtonStyle;
  shadow: TokenShadow;
  texture: TokenTexture;
  dark: boolean;
  brandName: string;
}

// ── Loader screen config ──────────────────────────────────────────────────────

export type LoaderStyle =
  | "spinner"
  | "dots"
  | "bar"
  | "ring"
  | "pulse"
  | "logo-pulse"
  | "logo-draw";

export type LoaderTint = "accent" | "ink";

export interface LoaderConfig {
  /** Whether a loading screen is shown before the form appears. */
  enabled: boolean;
  style: LoaderStyle;
  /** Minimum on-screen time in ms (also drives the preview demo loop). */
  durationMs: number;
  message: string;
  /** logo-pulse / logo-draw styles render the uploaded logo. */
  useLogo: boolean;
  tint: LoaderTint;
}

// ── Success screen config ─────────────────────────────────────────────────────

export type SuccessActionKind = "message" | "redirect" | "cta";

export interface SuccessConfig {
  title: string;
  message: string;
  action: SuccessActionKind;
  /** Used when action === "redirect". */
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

// ── Studio config (full state) ──────────────────────────────────────────────

export interface FormConfig {
  tokens: DesignTokens;
  layout: LayoutConfig;
  questions: StudioQuestion[];
  headline: string;
  subhead: string;
  brandName: string;
  submitLabel: string;
  logoUrl: string | null;
  logoAssetId: string | null;
  loader: LoaderConfig;
  success: SuccessConfig;
  preset: string;
  layoutPreset: string;
}

// ── Form config entry (per-project form list / A-B testing) ─────────────────

export interface FormConfigEntry {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  /** Traffic weight for A/B testing (0–100). Active forms split traffic by weight. */
  abWeight: number;
  createdAt: number;
  updatedAt: number;
  /** Total form submissions received. */
  submissions: number;
  /** Total form impressions / views. */
  views: number;
  /** Submission-to-view conversion rate (0–100). */
  responseRate: number;
  /** Average star rating from submissions (0–5). */
  avgRating: number;
  /** Timestamp of the most recent submission, or null if none. */
  lastSubmissionAt: number | null;
  /** Form layout (flow / container / hero), or null if config is malformed. */
  layout: LayoutConfig | null;
}

// ── Device preview ──────────────────────────────────────────────────────────

export type StudioDevice = "desktop" | "tablet" | "mobile";

// ── Conditional logic evaluator ─────────────────────────────────────────────

export function evalShowIf(
  q: StudioQuestion,
  values: Record<string, unknown>,
): boolean {
  if (!q.showIf) return true;
  const { questionId, op, value: target } = q.showIf;
  const actual = values[questionId];
  if (actual == null) return false;

  const numActual = typeof actual === "number" ? actual : Number(actual);
  const numTarget = typeof target === "number" ? target : Number(target);

  switch (op) {
    case "eq":
      return actual === target || numActual === numTarget;
    case "neq":
      return actual !== target && numActual !== numTarget;
    case "gt":
      return numActual > numTarget;
    case "lt":
      return numActual < numTarget;
    case "gte":
      return numActual >= numTarget;
    case "lte":
      return numActual <= numTarget;
    case "includes":
      if (typeof actual === "string")
        return actual.toLowerCase().includes(String(target).toLowerCase());
      if (Array.isArray(actual)) return actual.includes(target);
      return false;
    default:
      return true;
  }
}
