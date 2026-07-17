import type { FormDefinitionDoc } from "./schema/definition.js";
import type { FormField } from "./schema/fields.js";
import { UPLOAD_TYPES } from "./schema/fields.js";

/**
 * Embed delivery constraints (2026-07-17 product split). An embedded form is
 * a smaller product by design: no upload/capture fields (the embed pipeline
 * has no presign surface and a host page is no place for a recording booth)
 * and a hard cap on asks (an embed borrows someone else's page — it earns a
 * corner, not a journey).
 */
export const EMBED_MAX_FIELDS = 6;

/** Field types an embedded form may carry — everything except uploads. */
export function isEmbedCapableField(field: FormField): boolean {
  return !UPLOAD_TYPES.has(field.type);
}

export interface EmbedFit {
  ok: boolean;
  /** Fields whose type cannot ship in an embed (uploads/capture). */
  incompatibleFields: FormField[];
  /** How many countable asks exceed EMBED_MAX_FIELDS (0 when within cap). */
  overCap: number;
}

/** Consent + hidden fields are platform furniture, not asks — they don't count. */
function countableAsks(doc: FormDefinitionDoc): FormField[] {
  return doc.fields.filter(
    (field) => field.type !== "hidden" && field.type !== "consent",
  );
}

export function checkEmbedFit(doc: FormDefinitionDoc): EmbedFit {
  const incompatibleFields = doc.fields.filter(
    (field) => !isEmbedCapableField(field),
  );
  const overCap = Math.max(0, countableAsks(doc).length - EMBED_MAX_FIELDS);
  return {
    ok: incompatibleFields.length === 0 && overCap === 0,
    incompatibleFields,
    overCap,
  };
}

/** Human-readable fit problems, ready for a 400 body or a studio notice. */
export function embedFitProblems(fit: EmbedFit): string[] {
  const problems: string[] = [];
  if (fit.incompatibleFields.length) {
    const labels = fit.incompatibleFields
      .map((field) => field.label || field.type)
      .join(", ");
    problems.push(
      `Embedded forms cannot include upload or recording fields: ${labels}.`,
    );
  }
  if (fit.overCap > 0) {
    problems.push(
      `Embedded forms are limited to ${EMBED_MAX_FIELDS} questions — remove ${fit.overCap}.`,
    );
  }
  return problems;
}

export class FormDeliveryError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(problems.join(" "));
    this.name = "FormDeliveryError";
    this.problems = problems;
  }
}

/** Publish gate: an embed-delivery doc must fit the embed constraints. */
export function assertDeliveryPublishable(doc: FormDefinitionDoc): void {
  if (doc.delivery !== "embed") return;
  const fit = checkEmbedFit(doc);
  if (!fit.ok) throw new FormDeliveryError(embedFitProblems(fit));
}
