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
  const input = asRecord(raw);

  const version =
    typeof input.schemaVersion === "string" ? input.schemaVersion : undefined;

  const currentMajor = Number.parseInt(SCHEMA_VERSION.split(".")[0] ?? "", 10);
  const major = finiteMajor(version);

  if (major !== undefined && major > currentMajor) {
    throw new Error(
      `Unsupported form schemaVersion ${version} (newer than ${SCHEMA_VERSION})`,
    );
  }

  const projected = needsPreV6Projection(major, currentMajor, version, input)
    ? projectPreV6(input)
    : input;

  return formDefinitionDocSchema.parse({
    ...projected,
    schemaVersion: SCHEMA_VERSION,
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** The major of a semver string, or undefined when absent/unparsable. */
function finiteMajor(version: string | undefined): number | undefined {
  if (!version) return undefined;
  const major = Number.parseInt(version.split(".")[0] ?? "", 10);
  return Number.isFinite(major) ? major : undefined;
}

function needsPreV6Projection(
  major: number | undefined,
  currentMajor: number,
  version: string | undefined,
  input: Record<string, unknown>,
): boolean {
  if (major !== undefined) return major < currentMajor;
  // Version-less legacy blobs that still carry the old design shape.
  return !version && ("design" in input || "layoutPreset" in input);
}

const str = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

function projectPreV6(input: Record<string, unknown>): Record<string, unknown> {
  const design = asRecord(input.design);
  const flow = asRecord(input.flow);

  const intent = typeof input.intent === "string" ? input.intent : "CUSTOM";

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
