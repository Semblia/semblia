/**
 * forms-core shared types.
 *
 * The hosted form consumes the SAME rich token model the Collect Studio edits
 * (`FormTokens`), so customizations made in the studio render faithfully on the
 * public form. `FormDesignTokens` below is the older flat set kept only for the
 * standalone theme engine (`resolveTheme`); it is not on the render path.
 */

// ── Question model ───────────────────────────────────────────────────────────

/**
 * Every question kind the studio can persist, plus the legacy hosted kinds.
 * The renderer collapses these into a handful of real inputs (see `react.tsx`).
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

export interface FormQuestion {
  id: string;
  type: FormQuestionType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

// ── Rich design tokens (canonical, shared with the studio) ───────────────────

export type FieldShape = "rounded" | "square" | "underline" | "pill";
export type TokenDensity = "compact" | "default" | "cozy" | "airy";
export type TokenButtonStyle = "solid" | "pill" | "block" | "ghost";
export type TokenShadow = "none" | "sm" | "soft" | "hard" | "glow";
export type TokenTexture = "none" | "grain" | "dots" | "lines";

export interface FormTokens {
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
}

export interface FormConfig {
  brandName: string;
  headline: string;
  subhead: string;
  logoUrl?: string | null;
  questions: FormQuestion[];
  tokens: FormTokens;
}

// ── View model (what the renderer consumes) ──────────────────────────────────

export interface FormViewModelQuestion {
  id: string;
  type: FormQuestionType;
  label: string;
  placeholder: string;
  required: boolean;
  options: string[];
  inputName: string;
}

export interface FormViewModel {
  brandName: string;
  headline: string;
  subhead: string;
  logoUrl: string | null;
  questions: FormViewModelQuestion[];
  cssVars: Record<string, string>;
  colorScheme: "light" | "dark";
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
