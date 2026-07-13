import {
  formDefinitionDocSchema,
  type FormDefinitionDoc,
} from "./schema/definition.js";
import { defaultTemplateForIntent } from "./templates.js";
import { SCHEMA_VERSION } from "./version.js";

/**
 * Project a stored (possibly older) form doc forward to the current schema.
 *
 * v6 is the template-system rebuild: pre-v6 docs carried a `layoutPreset` and
 * a 9-knob `design` object. The projection is intentionally lossy (pre-launch,
 * no production data): brand facts survive (`design.brandColor/mode/logo*` →
 * `brand`), fields/content/settings/conditional rules carry verbatim, and the
 * form lands on its intent's designed default template with default accents.
 * Knob picks (radius/density/fieldStyle/…) are template taste now and drop.
 *
 * Unknown *future* versions throw loudly rather than silently mis-parsing.
 */
export function migrateFormDoc(raw: unknown): FormDefinitionDoc {
  const input: Record<string, unknown> =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const version =
    typeof input.schemaVersion === "string" ? input.schemaVersion : undefined;

  const currentMajor = Number.parseInt(SCHEMA_VERSION.split(".")[0] ?? "", 10);
  const major = version
    ? Number.parseInt(version.split(".")[0] ?? "", 10)
    : undefined;

  if (major !== undefined && Number.isFinite(major) && major > currentMajor) {
    throw new Error(
      `Unsupported form schemaVersion ${version} (newer than ${SCHEMA_VERSION})`,
    );
  }

  const needsProjection =
    (major !== undefined && Number.isFinite(major) && major < currentMajor) ||
    // Version-less legacy blobs that still carry the old design shape.
    (major === undefined && ("design" in input || "layoutPreset" in input));

  const projected = needsProjection ? projectPreV6(input) : input;

  return formDefinitionDocSchema.parse({
    ...projected,
    schemaVersion: SCHEMA_VERSION,
  });
}

function projectPreV6(input: Record<string, unknown>): Record<string, unknown> {
  const design =
    input.design && typeof input.design === "object" && !Array.isArray(input.design)
      ? (input.design as Record<string, unknown>)
      : {};
  const flow =
    input.flow && typeof input.flow === "object" && !Array.isArray(input.flow)
      ? (input.flow as Record<string, unknown>)
      : {};

  const intent = typeof input.intent === "string" ? input.intent : "CUSTOM";

  const str = (v: unknown): string | undefined =>
    typeof v === "string" ? v : undefined;

  return {
    intent: input.intent,
    fields: input.fields,
    content: input.content,
    settings: input.settings,
    flow: { conditionalRules: flow.conditionalRules ?? [] },
    templateId: defaultTemplateForIntent(
      intent as FormDefinitionDoc["intent"],
    ),
    accents: {},
    brand: {
      color: str(design.brandColor),
      appearance: str(design.mode),
      logoAssetId: design.logoAssetId ?? null,
      logoUrl: design.logoUrl ?? null,
    },
    assets: {
      heroImageAssetId: design.backgroundImageAssetId ?? null,
      heroImageUrl: design.backgroundImageUrl ?? null,
    },
  };
}

/** Parse + normalize a draft doc, applying all defaults. Throws on invalid input. */
export function parseFormDoc(raw: unknown): FormDefinitionDoc {
  return formDefinitionDocSchema.parse(raw ?? {});
}
