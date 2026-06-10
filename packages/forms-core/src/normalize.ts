import {
  DEFAULT_FORM_CONFIG,
  DEFAULT_FORM_LAYOUT,
  DEFAULT_FORM_LOADER,
  DEFAULT_FORM_SUCCESS,
  DEFAULT_FORM_TOKENS,
  DEFAULT_QUESTIONS,
} from "./defaults.js";
import type {
  ContainerMode,
  FieldShape,
  FlowMode,
  FocusRing,
  FormConfig,
  FormLayoutConfig,
  FormLoaderConfig,
  FormQuestion,
  FormQuestionType,
  FormSuccessConfig,
  FormTokens,
  HeroMode,
  LabelCasing,
  LoaderStyle,
  LoaderTint,
  ShowIfOp,
  ShowIfRule,
  SuccessActionKind,
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

/** Like `str` but empty string is a deliberate, respected value. */
function strAllowEmpty(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
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

const FLOW_MODES: readonly FlowMode[] = [
  "all",
  "stepped",
  "cards",
  "conversational",
];

const CONTAINER_MODES: readonly ContainerMode[] = [
  "boxed",
  "split",
  "fullbleed",
  "centered",
];

const HERO_MODES: readonly HeroMode[] = ["none", "top", "side", "floating"];

const LOADER_STYLES: readonly LoaderStyle[] = [
  "spinner",
  "dots",
  "bar",
  "ring",
  "pulse",
  "logo-pulse",
  "logo-draw",
];

const SHOW_IF_OPS: readonly ShowIfOp[] = [
  "eq",
  "neq",
  "gt",
  "lt",
  "gte",
  "lte",
  "includes",
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
    bodyLineHeight: clamp(num(t.bodyLineHeight, d.bodyLineHeight), 1.1, 2.2),
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
    fieldBorderWidth: clamp(
      num(t.fieldBorderWidth, d.fieldBorderWidth),
      0.5,
      4,
    ),
    labelCasing: enumOr<LabelCasing>(
      t.labelCasing,
      ["none", "uppercase"],
      d.labelCasing,
    ),
    focusRing: enumOr<FocusRing>(
      t.focusRing,
      ["ring", "underline", "none"],
      d.focusRing,
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
    dark: bool(t.dark, d.dark),
  };
}

function coerceShowIf(raw: unknown): ShowIfRule | null {
  const r = asRecord(raw);
  if (!r) return null;
  const questionId = typeof r.questionId === "string" ? r.questionId : null;
  const value =
    typeof r.value === "string" || typeof r.value === "number" ? r.value : null;
  if (!questionId || value === null) return null;
  return {
    questionId,
    op: enumOr<ShowIfOp>(r.op, SHOW_IF_OPS, "eq"),
    value,
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
  const showIf = coerceShowIf(q.showIf);
  return {
    id,
    type,
    label,
    placeholder: typeof q.placeholder === "string" ? q.placeholder : undefined,
    description: typeof q.description === "string" ? q.description : undefined,
    required: q.required === true,
    ...(options && options.length > 0 ? { options } : {}),
    ...(showIf ? { showIf } : {}),
  };
}

function coerceQuestions(raw: unknown): FormQuestion[] {
  if (!Array.isArray(raw)) return [...DEFAULT_QUESTIONS];
  const mapped = raw
    .map(coerceQuestion)
    .filter((q): q is FormQuestion => q !== null);
  return mapped.length > 0 ? mapped : [...DEFAULT_QUESTIONS];
}

function coerceLayout(raw: unknown): FormLayoutConfig {
  const l = asRecord(raw);
  const d = DEFAULT_FORM_LAYOUT;
  if (!l) return { ...d };

  const mobileFlow =
    l.mobileFlow === "auto"
      ? "auto"
      : enumOr<FlowMode>(l.mobileFlow, FLOW_MODES, "all");
  const mobileContainer =
    l.mobileContainer === "auto"
      ? "auto"
      : enumOr<ContainerMode>(l.mobileContainer, CONTAINER_MODES, "boxed");

  return {
    flow: enumOr<FlowMode>(l.flow, FLOW_MODES, d.flow),
    container: enumOr<ContainerMode>(l.container, CONTAINER_MODES, d.container),
    hero: enumOr<HeroMode>(l.hero, HERO_MODES, d.hero),
    mobileFlow: typeof l.mobileFlow === "string" ? mobileFlow : d.mobileFlow,
    mobileContainer:
      typeof l.mobileContainer === "string"
        ? mobileContainer
        : d.mobileContainer,
    stickyProgress: bool(l.stickyProgress, d.stickyProgress),
    showBrandPill: bool(l.showBrandPill, d.showBrandPill),
  };
}

function coerceLoader(raw: unknown): FormLoaderConfig {
  const l = asRecord(raw);
  const d = DEFAULT_FORM_LOADER;
  if (!l) return { ...d };
  return {
    enabled: bool(l.enabled, d.enabled),
    style: enumOr<LoaderStyle>(l.style, LOADER_STYLES, d.style),
    durationMs: clamp(num(l.durationMs, d.durationMs), 0, 8000),
    message: strAllowEmpty(l.message, d.message),
    useLogo: bool(l.useLogo, d.useLogo),
    tint: enumOr<LoaderTint>(l.tint, ["accent", "ink"], d.tint),
  };
}

/** Only http(s) absolute URLs or site-relative paths survive into hrefs. */
function safeUrl(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const value = raw.trim();
  if (!value) return "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? value : "";
  } catch {
    return "";
  }
}

function coerceSuccess(raw: unknown): FormSuccessConfig {
  const s = asRecord(raw);
  const d = DEFAULT_FORM_SUCCESS;
  if (!s) return { ...d };
  return {
    title: str(s.title, d.title),
    message: strAllowEmpty(s.message, d.message),
    action: enumOr<SuccessActionKind>(
      s.action,
      ["message", "redirect", "cta"],
      d.action,
    ),
    redirectUrl: safeUrl(s.redirectUrl),
    ctaLabel: strAllowEmpty(s.ctaLabel, d.ctaLabel),
    ctaUrl: safeUrl(s.ctaUrl),
    emoji: strAllowEmpty(s.emoji, d.emoji),
    showConfetti: bool(s.showConfetti, d.showConfetti),
    useLogo: bool(s.useLogo, d.useLogo),
  };
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
    submitLabel: str(c.submitLabel, DEFAULT_FORM_CONFIG.submitLabel),
    logoUrl: typeof c.logoUrl === "string" ? c.logoUrl : null,
    questions: coerceQuestions(c.questions),
    tokens: coerceTokens(c.tokens),
    layout: coerceLayout(c.layout),
    loader: coerceLoader(c.loader),
    success: coerceSuccess(c.success),
  };
}

function first(...vals: unknown[]): unknown {
  return vals.find((v) => typeof v === "string" && v.length > 0);
}
