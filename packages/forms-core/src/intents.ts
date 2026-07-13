import type { z } from "zod";
import {
  formDefinitionDocSchema,
  type FormDefinitionDoc,
  type FormIntent,
} from "./schema/definition.js";
import { formFieldSchema, type FormField } from "./schema/fields.js";
import { defaultTemplateForIntent } from "./templates.js";

/**
 * Intent presets (spec §3, §4). Each intent seeds a strong default form:
 * fields, copy, consent behavior, and the intent's designed default template.
 * The author edits from here; they never start from a blank document.
 */

function field(
  f: Partial<FormField> & Pick<FormField, "id" | "type">,
): FormField {
  return formFieldSchema.parse(f);
}

const consentField = (copy: string): FormField =>
  field({
    id: "consent",
    type: "consent",
    role: "consent",
    label: "Consent",
    required: true,
    private: true,
    consentCopy: copy,
  });

const nameField = (publishable = true): FormField =>
  field({
    id: "name",
    type: "name",
    role: "authorName",
    label: "Your name",
    placeholder: "Jane Doe",
    required: true,
    publishable,
    widgetEligible: publishable,
    displayPriority: 80,
  });

const roleField = (): FormField =>
  field({
    id: "role",
    type: "role",
    role: "authorRole",
    label: "Role / title",
    placeholder: "Head of Product",
    publishable: true,
    widgetEligible: true,
    displayPriority: 60,
  });

const companyField = (): FormField =>
  field({
    id: "company",
    type: "company",
    role: "authorCompany",
    label: "Company",
    placeholder: "Acme Inc.",
    publishable: true,
    widgetEligible: true,
    displayPriority: 50,
  });

const avatarField = (): FormField =>
  field({
    id: "avatar",
    type: "imageUpload",
    role: "authorAvatar",
    label: "Photo",
    description: "A friendly headshot adds credibility.",
    publishable: true,
    widgetEligible: true,
    fileTypes: ["image/png", "image/jpeg", "image/webp"],
    maxFileSize: 5_000_000,
    maxFileCount: 1,
  });

const ratingField = (label = "Your rating"): FormField =>
  field({
    id: "rating",
    type: "rating",
    role: "rating",
    label,
    required: true,
    ratingScale: 5,
    ratingStyle: "stars",
    publishable: true,
    widgetEligible: true,
    displayPriority: 90,
  });

const emailField = (): FormField =>
  field({
    id: "email",
    type: "email",
    role: "authorEmail",
    label: "Email",
    placeholder: "you@company.com",
    private: true,
  });

// Keyed off the schema *input* type so a template may supply partial nested
// objects (e.g. just a couple of `content` fields); the rest fill via defaults
// when `createFormTemplate` parses the seed.
type TemplateSeed = Partial<
  Omit<z.input<typeof formDefinitionDocSchema>, "schemaVersion" | "intent">
>;

const TEMPLATES: Record<FormIntent, TemplateSeed> = {
  TESTIMONIAL: {
    fields: [
      ratingField("How would you rate us?"),
      field({
        id: "video",
        type: "videoUpload",
        role: "custom",
        label: "Record a quick video",
        description:
          "60 seconds is plenty — or skip and write it out below.",
        publishable: true,
        widgetEligible: true,
        displayPriority: 95,
        fileTypes: ["video/mp4", "video/webm", "video/quicktime"],
        maxFileSize: 200_000_000,
        maxFileCount: 1,
        maxDurationSec: 120,
      }),
      field({
        id: "testimonial",
        type: "longText",
        role: "primaryText",
        label: "Your testimonial",
        placeholder: "What did you love about working with us?",
        minLength: 20,
        maxLength: 1000,
        publishable: true,
        widgetEligible: true,
        displayPriority: 100,
      }),
      nameField(),
      roleField(),
      companyField(),
      avatarField(),
      consentField(
        "I agree to let this business publish my response, name, and photo as a testimonial.",
      ),
    ],
    content: {
      title: "Share your experience",
      description: "We'd love to hear how things went.",
      submitButtonText: "Send testimonial",
      successMessage: "Thank you! Your testimonial means a lot to us.",
    },
    settings: { requireConsent: true },
  },

  REVIEW: {
    fields: [
      ratingField("Rate your experience"),
      field({
        id: "review",
        type: "longText",
        role: "primaryText",
        label: "Your review",
        placeholder: "Tell others about your experience…",
        required: true,
        minLength: 10,
        maxLength: 600,
        publishable: true,
        widgetEligible: true,
        displayPriority: 100,
      }),
      nameField(),
      companyField(),
      consentField("I'm happy for this review to be shown publicly."),
    ],
    content: {
      title: "Leave a review",
      description: "Your feedback helps others decide.",
      submitButtonText: "Submit review",
      successMessage: "Thanks for the review!",
    },
    settings: { requireConsent: true },
  },

  PRODUCT_FEEDBACK: {
    fields: [
      field({
        id: "category",
        type: "singleSelect",
        role: "custom",
        label: "What kind of feedback is this?",
        required: true,
        options: [
          { value: "bug", label: "Bug report" },
          { value: "idea", label: "Feature idea" },
          { value: "improvement", label: "Improvement" },
          { value: "praise", label: "Praise" },
          { value: "other", label: "Other" },
        ],
      }),
      ratingField("How satisfied are you?"),
      field({
        id: "feedback",
        type: "longText",
        role: "primaryText",
        label: "Tell us more",
        placeholder: "Describe what happened or what you'd like to see…",
        required: true,
        minLength: 10,
        maxLength: 2000,
      }),
      field({
        id: "improvement",
        type: "longText",
        role: "custom",
        label: "What could we improve?",
        placeholder: "What would have made this better?",
      }),
      field({
        id: "screenshot",
        type: "fileUpload",
        role: "custom",
        label: "Attachment / screenshot",
        private: true,
        fileTypes: ["image/png", "image/jpeg", "application/pdf"],
        maxFileSize: 10_000_000,
        maxFileCount: 3,
      }),
      emailField(),
    ],
    flow: {
      conditionalRules: [
        {
          targetFieldId: "improvement",
          action: "show",
          match: "all",
          conditions: [
            { fieldId: "rating", operator: "lessThanOrEqual", value: 3 },
          ],
        },
      ],
    },
    content: {
      title: "Send us feedback",
      description: "Help us make the product better.",
      submitButtonText: "Send feedback",
      successMessage: "Thanks — we've logged your feedback.",
    },
    settings: { allowAnonymous: true, requireConsent: false },
  },

  CUSTOMER_STORY: {
    fields: [
      nameField(),
      roleField(),
      companyField(),
      field({
        id: "before",
        type: "longText",
        role: "custom",
        label: "Before Semblia, what was the challenge?",
        required: true,
        maxLength: 800,
        publishable: true,
      }),
      field({
        id: "after",
        type: "longText",
        role: "custom",
        label: "What changed after?",
        required: true,
        maxLength: 800,
        publishable: true,
      }),
      field({
        id: "result",
        type: "longText",
        role: "custom",
        label: "What result did you achieve?",
        maxLength: 600,
        publishable: true,
      }),
      field({
        id: "quote",
        type: "longText",
        role: "primaryText",
        label: "A quote we can feature",
        placeholder: "One line that sums it up…",
        maxLength: 280,
        publishable: true,
        widgetEligible: true,
        displayPriority: 100,
      }),
      avatarField(),
      consentField(
        "I agree to let this business publish my story, name, and photo.",
      ),
    ],
    content: {
      title: "Tell your story",
      description: "A few quick questions about your experience.",
      submitButtonText: "Share my story",
      successMessage: "Thank you for sharing your story!",
    },
    settings: { requireConsent: true },
  },

  CUSTOM: {
    fields: [
      nameField(false),
      field({
        id: "message",
        type: "longText",
        role: "primaryText",
        label: "Your message",
        placeholder: "Type your response…",
        required: true,
        maxLength: 1000,
      }),
    ],
    content: {
      title: "Untitled form",
      description: "",
      submitButtonText: "Submit",
      successMessage: "Thanks for your response!",
    },
  },
};

/** Build a complete, validated default doc for an intent (spec §4, §6.1). */
export function createFormTemplate(intent: FormIntent): FormDefinitionDoc {
  const seed = TEMPLATES[intent] ?? TEMPLATES.CUSTOM;
  return formDefinitionDocSchema.parse({
    ...seed,
    intent,
    templateId: defaultTemplateForIntent(intent),
  });
}

export const FORM_INTENTS: readonly FormIntent[] = [
  "TESTIMONIAL",
  "REVIEW",
  "PRODUCT_FEEDBACK",
  "CUSTOMER_STORY",
  "CUSTOM",
];
