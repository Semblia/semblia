/**
 * Publish pipeline helpers — the write-time guarantees.
 *
 * `publishFormDefinition` is what the API calls when promoting a draft to the
 * live form: strict validation plus the derived theme snapshot, so a published
 * doc is renderable by construction and the serving path does zero derivation.
 */

import { resolvePreset } from "../presets.js";
import { resolveThemeSnapshot } from "../theme.js";
import {
  FORM_SCHEMA_VERSION,
  formDefinitionDocSchema,
  publishedFormDocSchema,
  type FormDefinitionDoc,
  type PublishedFormDoc,
} from "./definition.js";
import { applyColorOverrides } from "./theme-overrides.js";

/** A complete, valid starting document for newly created forms. */
export function defaultFormDefinition(
  overrides: { brandName?: string; brandColor?: string } = {},
): FormDefinitionDoc {
  const inputs = resolvePreset("default", overrides.brandColor ?? "#4f46e5");
  return formDefinitionDocSchema.parse({
    schemaVersion: FORM_SCHEMA_VERSION,
    structure: {
      questions: [
        {
          id: "content",
          type: "longtext",
          label: "Your feedback",
          placeholder: "Tell us what stood out…",
          required: true,
        },
        {
          id: "authorName",
          type: "shorttext",
          label: "Your name",
          placeholder: "Jane Doe",
          required: true,
        },
        {
          id: "authorEmail",
          type: "email",
          label: "Email",
          placeholder: "jane@example.com",
          required: false,
        },
        { id: "rating", type: "stars", label: "Rating", required: false },
      ],
    },
    layout: { preset: "card" },
    theme: { preset: "default", inputs },
    content: {
      brandName: overrides.brandName ?? "",
      headline: "Share your experience",
      subhead: "It takes less than two minutes.",
    },
  });
}

/** Validate + stamp the derived snapshot. Throws on any invalid input. */
export function publishFormDefinition(doc: unknown): PublishedFormDoc {
  const definition = formDefinitionDocSchema.parse(doc);
  const snapshot = resolveThemeSnapshot(definition.theme.inputs);
  const derived = applyColorOverrides(
    snapshot,
    definition.theme.colorOverrides,
  );
  return publishedFormDocSchema.parse({ ...definition, derived });
}
