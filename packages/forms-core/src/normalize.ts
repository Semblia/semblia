import {
  DEFAULT_FORM_CONFIG,
  DEFAULT_FORM_TOKENS,
  DEFAULT_QUESTIONS,
} from "./defaults.js";
import type {
  FieldShape,
  FormConfig,
  FormQuestion,
  FormQuestionType,
  FormTokens,
  TokenButtonStyle,
  TokenDensity,
  TokenShadow,
  TokenTexture,
} from "./types.js";

type Rec = Record<string, unknown>;

function asRecord(value: unknown): Rec | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Rec)
    : null;
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

function num(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function enumOr<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

const QUESTION_TYPES: readonly FormQuestionType[] = [
  "shorttext",
  "longtext",
  "email",
  "stars",
  "nps",
  "emoji",
  "radio",
  "checkbox",
  "dropdown",
  "file",
  "text",
  "textarea",
  "rating",
];

/** Accepts rich (studio) tokens or the legacy flat token shape; always returns rich. */
function coerceTokens(raw: unknown): FormTokens {
  const t = asRecord(raw);
  const d = DEFAULT_FORM_TOKENS;
  if (!t) return { ...d };

  const first = (...vals: unknown[]) =>
    vals.find((v) => typeof v === "string" && v.length > 0);

  return {
    fontHead: str(first(t.fontHead, t.fontFamily), d.fontHead),
    fontBody: str(first(t.fontBody, t.fontFamily), d.fontBody),
    fontMono: str(t.fontMono, d.fontMono),
    sizeBase: clamp(num(t.sizeBase, d.sizeBase), 10, 28),
    sizeHead: clamp(num(t.sizeHead, d.sizeHead), 16, 96),
    trackingHead: clamp(num(t.trackingHead, d.trackingHead), -0.1, 0.1),
    weightHead: clamp(num(t.weightHead, d.weightHead), 100, 900),
    weightBody: clamp(num(t.weightBody, d.weightBody), 100, 900),
    bg: str(first(t.bg, t.background), d.bg),
    surface: str(t.surface, d.surface),
    ink: str(first(t.ink, t.text), d.ink),
    inkSoft: str(first(t.inkSoft, t.mutedText), d.inkSoft),
    line: str(first(t.line, t.border), d.line),
    accent: str(t.accent, d.accent),
    accentInk: str(first(t.accentInk, t.accentText), d.accentInk),
    radius: clamp(num(t.radius, d.radius), 0, 40),
    fieldShape: enumOr<FieldShape>(
      t.fieldShape,
      ["rounded", "square", "underline", "pill"],
      d.fieldShape,
    ),
    density: enumOr<TokenDensity>(
      t.density,
      ["compact", "default", "cozy", "airy"],
      d.density,
    ),
    buttonStyle: enumOr<TokenButtonStyle>(
      t.buttonStyle,
      ["solid", "pill", "block", "ghost"],
      d.buttonStyle,
    ),
    shadow: enumOr<TokenShadow>(
      t.shadow,
      ["none", "sm", "soft", "hard", "glow"],
      d.shadow,
    ),
    texture: enumOr<TokenTexture>(
      t.texture,
      ["none", "grain", "dots", "lines"],
      d.texture,
    ),
    dark: typeof t.dark === "boolean" ? t.dark : d.dark,
  };
}

function coerceQuestion(raw: unknown): FormQuestion | null {
  const q = asRecord(raw);
  if (!q) return null;
  const id = typeof q.id === "string" ? q.id : null;
  const label = typeof q.label === "string" ? q.label : null;
  if (!id || !label) return null;
  const type = enumOr<FormQuestionType>(q.type, QUESTION_TYPES, "shorttext");
  const options = Array.isArray(q.options)
    ? q.options.filter((o): o is string => typeof o === "string")
    : undefined;
  return {
    id,
    type,
    label,
    placeholder: typeof q.placeholder === "string" ? q.placeholder : undefined,
    required: q.required === true,
    ...(options && options.length > 0 ? { options } : {}),
  };
}

function coerceQuestions(raw: unknown): FormQuestion[] {
  if (!Array.isArray(raw)) return [...DEFAULT_QUESTIONS];
  const mapped = raw
    .map(coerceQuestion)
    .filter((q): q is FormQuestion => q !== null);
  return mapped.length > 0 ? mapped : [...DEFAULT_QUESTIONS];
}

/**
 * Coerce any persisted config (rich studio shape, legacy flat shape, partial,
 * or malformed) into a complete, renderable `FormConfig`. Never throws and
 * never silently drops the whole config over a single bad field.
 */
export function normalizeFormConfig(input: unknown): FormConfig {
  const c = asRecord(input);
  if (!c) return structuredClone(DEFAULT_FORM_CONFIG);

  // Some legacy configs nest copy under `content`.
  const content = asRecord(c.content);

  return {
    brandName: str(c.brandName, DEFAULT_FORM_CONFIG.brandName),
    headline: str(
      first(c.headline, content?.headerTitle),
      DEFAULT_FORM_CONFIG.headline,
    ),
    subhead: str(
      first(c.subhead, content?.headerDescription),
      DEFAULT_FORM_CONFIG.subhead,
    ),
    logoUrl: typeof c.logoUrl === "string" ? c.logoUrl : null,
    questions: coerceQuestions(c.questions),
    tokens: coerceTokens(c.tokens),
  };
}

function first(...vals: unknown[]): unknown {
  return vals.find((v) => typeof v === "string" && v.length > 0);
}
