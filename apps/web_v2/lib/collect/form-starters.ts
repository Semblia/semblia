/**
 * Form starters — curated, ready-to-edit forms offered at creation time.
 *
 * Each starter is a *constrained* combination of the existing forms-v4 building
 * blocks: a hand-designed layout preset, a theme seed, a sensible starter
 * question set, and copy. They are NOT freeform templates — every starter
 * resolves to a valid `FormDefinitionDoc` that passes the same write-time
 * `publishFormDefinition` validation the API enforces (covered by
 * `tests/collect/form-starters.test.ts`), so creation can post `config`
 * directly with no risk of a 422.
 *
 * This is the "template system" lesson from Jotform/Fillout and the layout
 * variety from Typeform/Fillout, expressed inside the locked parametric model.
 */

import {
  defaultFormDefinition,
  formDefinitionDocSchema,
  type FormDefinitionDoc,
  type FormQuestion,
  type LayoutPresetId,
} from "@workspace/forms-core/schema";

type QuestionInput = Pick<FormQuestion, "id" | "type" | "label"> &
  Partial<Pick<FormQuestion, "placeholder" | "description" | "required">>;

export interface FormStarter {
  id: string;
  name: string;
  /** One-line value pitch shown on the gallery card. */
  description: string;
  /** Layout preset — also selects the gallery thumbnail (FormCardPreview). */
  layout: LayoutPresetId;
  /** Build a valid FormDefinitionDoc, optionally seeded with the project brand. */
  build: (opts?: {
    brandColor?: string;
    brandName?: string;
  }) => FormDefinitionDoc;
}

function buildStarterDoc(spec: {
  brandColor?: string;
  brandName?: string;
  layout: LayoutPresetId;
  themePreset?: "default" | "clean";
  themeOverrides?: Partial<FormDefinitionDoc["theme"]["inputs"]>;
  questions: QuestionInput[];
  headline: string;
  subhead: string;
  submitLabel?: string;
}): FormDefinitionDoc {
  const base = defaultFormDefinition({
    brandColor: spec.brandColor,
    brandName: spec.brandName,
  });
  return formDefinitionDocSchema.parse({
    ...base,
    structure: { questions: spec.questions },
    layout: { ...base.layout, preset: spec.layout },
    theme: {
      ...base.theme,
      preset: spec.themePreset ?? base.theme.preset,
      inputs: { ...base.theme.inputs, ...(spec.themeOverrides ?? {}) },
    },
    content: {
      ...base.content,
      headline: spec.headline,
      subhead: spec.subhead,
      ...(spec.submitLabel ? { submitLabel: spec.submitLabel } : {}),
    },
  });
}

export const FORM_STARTERS: FormStarter[] = [
  {
    id: "quick-testimonial",
    name: "Quick testimonial",
    description: "Three fields — the fastest way to collect a glowing quote.",
    layout: "card",
    build: (opts) =>
      buildStarterDoc({
        ...opts,
        layout: "card",
        headline: "Share your experience",
        subhead: "It takes less than a minute.",
        questions: [
          {
            id: "content",
            type: "longtext",
            label: "What did you love?",
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
          { id: "rating", type: "stars", label: "Overall rating" },
        ],
      }),
  },
  {
    id: "detailed-review",
    name: "Detailed review",
    description: "Role, company, and a star rating for richer social proof.",
    layout: "split",
    build: (opts) =>
      buildStarterDoc({
        ...opts,
        layout: "split",
        headline: "Write a review",
        subhead: "Your words help others decide with confidence.",
        questions: [
          {
            id: "rating",
            type: "stars",
            label: "How would you rate us?",
            required: true,
          },
          {
            id: "content",
            type: "longtext",
            label: "Your review",
            placeholder: "What worked well? What could be better?",
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
            id: "authorRole",
            type: "shorttext",
            label: "Role",
            placeholder: "Head of Marketing",
          },
          {
            id: "authorCompany",
            type: "shorttext",
            label: "Company",
            placeholder: "Acme Inc.",
          },
          {
            id: "authorEmail",
            type: "email",
            label: "Email",
            placeholder: "jane@example.com",
          },
        ],
      }),
  },
  {
    id: "guided",
    name: "Guided flow",
    description: "One question at a time, Typeform-style — best on mobile.",
    layout: "conversational",
    build: (opts) =>
      buildStarterDoc({
        ...opts,
        layout: "conversational",
        headline: "We'd love your feedback",
        subhead: "Just a few quick questions.",
        questions: [
          {
            id: "rating",
            type: "stars",
            label: "How was your experience?",
            required: true,
          },
          {
            id: "content",
            type: "longtext",
            label: "Tell us more",
            placeholder: "What made it great (or not)?",
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
            label: "Email (optional)",
            placeholder: "jane@example.com",
          },
        ],
      }),
  },
  {
    id: "compact-inline",
    name: "Compact inline",
    description:
      "A minimal two-field form that drops cleanly inline on a page.",
    layout: "inline",
    build: (opts) =>
      buildStarterDoc({
        ...opts,
        layout: "inline",
        themePreset: "clean",
        themeOverrides: { radius: 3, typePairing: "inter" },
        headline: "Leave a quick note",
        subhead: "",
        submitLabel: "Submit",
        questions: [
          {
            id: "content",
            type: "longtext",
            label: "Your feedback",
            placeholder: "Type here…",
            required: true,
          },
          {
            id: "authorName",
            type: "shorttext",
            label: "Your name",
            placeholder: "Jane Doe",
            required: true,
          },
        ],
      }),
  },
];
