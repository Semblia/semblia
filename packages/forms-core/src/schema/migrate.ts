/**
 * Migrations registry. Every persisted form config funnels through
 * `migrateFormDoc` at the read/backfill boundary and comes out as the current
 * `FormDefinitionDoc` — or throws, which means the row needs human attention
 * rather than a silent fallback.
 *
 * v1 → v2 is a deliberately LOSSY projection: the freeform composition layer
 * (rich tokens × flow × container × hero) collapses onto the nearest layout
 * preset + constrained theme knobs. This module reads the legacy shape
 * defensively and imports none of its types, so the v1 code can be deleted.
 */

import { DEFAULT_PRESET_ID } from "../presets.js";
import type { FormThemeInputs } from "../theme.js";
import {
  FORM_SCHEMA_VERSION,
  formDefinitionDocSchema,
  type FormDefinitionDoc,
  type LayoutPresetId,
} from "./definition.js";
import type { FormQuestion, QuestionType } from "./structure.js";

// ── Defensive readers ────────────────────────────────────────────────────────

type Rec = Record<string, unknown>;

function rec(v: unknown): Rec {
  return typeof v === "object" && v !== null ? (v as Rec) : {};
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

// ── v1 question projection ───────────────────────────────────────────────────

const LEGACY_TYPE_MAP: Record<string, QuestionType> = {
  shorttext: "shorttext",
  longtext: "longtext",
  email: "email",
  stars: "stars",
  nps: "nps",
  emoji: "emoji",
  radio: "radio",
  checkbox: "checkbox",
  dropdown: "dropdown",
  file: "file",
  // legacy hosted kinds
  text: "shorttext",
  textarea: "longtext",
  rating: "stars",
};

const FALLBACK_QUESTIONS: FormQuestion[] = [
  {
    id: "content",
    type: "longtext",
    label: "Your feedback",
    placeholder: "Tell us what stood out…",
    description: "",
    required: true,
    options: [],
    showIf: null,
  },
  {
    id: "authorName",
    type: "shorttext",
    label: "Your name",
    placeholder: "Jane Doe",
    description: "",
    required: true,
    options: [],
    showIf: null,
  },
];

function projectQuestions(raw: unknown): FormQuestion[] {
  if (!Array.isArray(raw)) return FALLBACK_QUESTIONS;
  const out: FormQuestion[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const q = rec(item);
    const type = LEGACY_TYPE_MAP[str(q.type)];
    const id = str(q.id).replace(/[^a-zA-Z0-9_-]/g, "");
    const label = str(q.label).slice(0, 200);
    if (!type || !id || !label || seen.has(id)) continue;
    seen.add(id);
    const options = Array.isArray(q.options)
      ? q.options
          .filter((o): o is string => typeof o === "string" && o.length > 0)
          .map((o) => o.slice(0, 120))
          .slice(0, 20)
      : [];
    // Option kinds without enough options can't render a choice — demote.
    const needsOptions =
      type === "radio" || type === "checkbox" || type === "dropdown";
    out.push({
      id,
      type: needsOptions && options.length < 2 ? "shorttext" : type,
      label,
      placeholder: str(q.placeholder).slice(0, 200),
      description: str(q.description).slice(0, 400),
      required: bool(q.required, false),
      options: needsOptions && options.length >= 2 ? options : [],
      showIf: null, // re-attached below once all ids are known
    });
  }
  if (out.length === 0) return FALLBACK_QUESTIONS;

  // Second pass: carry over showIf rules whose target still exists.
  const ids = new Set(out.map((q) => q.id));
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const q = rec(item);
      const target = out.find((o) => o.id === str(q.id));
      const rule = rec(q.showIf);
      const ref = str(rule.questionId);
      const op = str(rule.op);
      const value = rule.value;
      if (
        target &&
        ids.has(ref) &&
        ref !== target.id &&
        ["eq", "neq", "gt", "lt", "gte", "lte", "includes"].includes(op) &&
        (typeof value === "string" || typeof value === "number")
      ) {
        target.showIf = {
          questionId: ref,
          op: op as NonNullable<FormQuestion["showIf"]>["op"],
          value,
        };
      }
    }
  }
  return out.slice(0, 30);
}

// ── v1 layout projection ─────────────────────────────────────────────────────

function projectLayoutPreset(layout: Rec): LayoutPresetId {
  const flow = str(layout.flow);
  const container = str(layout.container);
  if (flow === "conversational") return "conversational";
  if (container === "split") return "split";
  if (flow === "all" && (container === "fullbleed" || container === "centered"))
    return "inline";
  return "card";
}

// ── v1 theme projection ──────────────────────────────────────────────────────

const RADIUS_STOPS: Array<[number, FormThemeInputs["radius"]]> = [
  [0, 0],
  [6, 1],
  [12, 2],
  [18, 3],
  [26, 4],
];

function nearestRadius(px: number): FormThemeInputs["radius"] {
  let best: FormThemeInputs["radius"] = 2;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const [stop, scale] of RADIUS_STOPS) {
    const d = Math.abs(px - stop);
    if (d < bestDist) {
      bestDist = d;
      best = scale;
    }
  }
  return best;
}

function projectTypePairing(fontBody: string): FormThemeInputs["typePairing"] {
  const family = (fontBody.split(",")[0] ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .toLowerCase();
  if (family.includes("geist")) return "geist";
  if (family.includes("inter")) return "inter";
  if (
    ["fraunces", "lora", "crimson", "playfair", "newsreader", "georgia"].some(
      (serif) => family.includes(serif),
    )
  )
    return "serif-editorial";
  if (family.startsWith("ui-") || family.includes("system")) return "system";
  return "inter";
}

function projectThemeInputs(tokens: Rec): FormThemeInputs {
  const shadow = str(tokens.shadow, "none");
  return {
    brandColor: /^#[0-9a-fA-F]{3,8}$/.test(str(tokens.accent))
      ? str(tokens.accent).slice(0, 7)
      : "#4f46e5",
    appearance: bool(tokens.dark, false) ? "dark" : "light",
    radius: nearestRadius(num(tokens.radius, 12)),
    density:
      str(tokens.density) === "compact"
        ? "compact"
        : str(tokens.density) === "airy"
          ? "spacious"
          : "cozy",
    typePairing: projectTypePairing(str(tokens.fontBody)),
    surfaceStyle:
      shadow === "none"
        ? num(tokens.fieldBorderWidth, 1.5) > 0
          ? "bordered"
          : "flat"
        : "elevated",
    accentIntensity: "balanced",
    neutralTone: "auto",
    buttonStyle: str(tokens.buttonStyle) === "ghost" ? "outline" : "solid",
  };
}

// ── The registry ─────────────────────────────────────────────────────────────

/** Project a legacy (pre-envelope) rich config onto the v2 document. Lossy by design. */
export function projectV1ToV2(raw: unknown): FormDefinitionDoc {
  const cfg = rec(raw);
  const tokens = rec(cfg.tokens);
  const layout = rec(cfg.layout);
  const loader = rec(cfg.loader);
  const success = rec(cfg.success);

  return formDefinitionDocSchema.parse({
    schemaVersion: FORM_SCHEMA_VERSION,
    structure: { questions: projectQuestions(cfg.questions) },
    layout: { preset: projectLayoutPreset(layout) },
    theme: {
      preset: DEFAULT_PRESET_ID,
      inputs: projectThemeInputs(tokens),
    },
    content: {
      brandName: str(cfg.brandName).slice(0, 120),
      headline: str(cfg.headline).slice(0, 200),
      subhead: str(cfg.subhead).slice(0, 400),
      submitLabel: str(cfg.submitLabel, "Send feedback").slice(0, 60) ||
        "Send feedback",
      logoUrl: str(cfg.logoUrl) || null,
      loaderMessage: str(loader.message).slice(0, 120),
      success: {
        title: str(success.title, "Thank you!").slice(0, 120) || "Thank you!",
        message:
          str(success.message, "Your feedback has been received.").slice(
            0,
            400,
          ) || "Your feedback has been received.",
        action: ["message", "redirect", "cta"].includes(str(success.action))
          ? (str(success.action) as "message" | "redirect" | "cta")
          : "message",
        redirectUrl: str(success.redirectUrl).slice(0, 2000),
        ctaLabel: str(success.ctaLabel).slice(0, 60),
        ctaUrl: str(success.ctaUrl).slice(0, 2000),
      },
    },
  });
}

/**
 * Bring any persisted config to the current schema version.
 * Unknown shapes go through the v1 projection; a v2 envelope is validated
 * strictly. Throws on irrecoverable input — callers must not swallow this
 * into a silent default.
 */
export function migrateFormDoc(raw: unknown): FormDefinitionDoc {
  const candidate = rec(raw);
  if (candidate.schemaVersion === FORM_SCHEMA_VERSION) {
    return formDefinitionDocSchema.parse(candidate);
  }
  if (typeof candidate.schemaVersion === "number") {
    throw new Error(
      `Unknown form schemaVersion ${String(candidate.schemaVersion)} — no migration registered`,
    );
  }
  return projectV1ToV2(raw);
}
