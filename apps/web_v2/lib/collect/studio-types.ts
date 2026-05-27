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
  required: boolean;
  options?: string[];
  showIf?: ShowIfRule | null;
}

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

export interface DesignTokens {
  fontHead: string;
  fontBody: string;
  fontMono: string;
  sizeBase: number;
  sizeHead: number;
  trackingHead: number;
  weightHead: number;
  weightBody: number;
  bg: string;
  surface: string;
  ink: string;
  inkSoft: string;
  line: string;
  accent: string;
  accentInk: string;
  radius: number;
  fieldShape: FieldShape;
  density: TokenDensity;
  buttonStyle: TokenButtonStyle;
  shadow: TokenShadow;
  texture: TokenTexture;
  dark: boolean;
  brandName: string;
}

// ── Studio config (full state) ──────────────────────────────────────────────

export interface FormConfig {
  tokens: DesignTokens;
  layout: LayoutConfig;
  questions: StudioQuestion[];
  headline: string;
  subhead: string;
  brandName: string;
  logoUrl: string | null;
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
