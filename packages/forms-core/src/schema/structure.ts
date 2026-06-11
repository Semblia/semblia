/**
 * Structure — *what's asked*, never *where things sit*.
 *
 * Pure data: question kinds, order, required flags, options, and conditional
 * visibility. This is the only form concern users compose freely; everything
 * visual is owned by layout presets and the theme engine.
 */

import { z } from "zod";

/** Canonical v4 question kinds. Legacy aliases are mapped away by migration. */
export const QUESTION_TYPES = [
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
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

const OPTION_KINDS: ReadonlySet<QuestionType> = new Set([
  "radio",
  "checkbox",
  "dropdown",
]);

export const showIfOpSchema = z.enum([
  "eq",
  "neq",
  "gt",
  "lt",
  "gte",
  "lte",
  "includes",
]);

/** Conditional visibility: show this question only when another answer matches. */
export const showIfRuleSchema = z.object({
  questionId: z.string().min(1).max(64),
  op: showIfOpSchema,
  value: z.union([z.string().max(400), z.number()]),
});

export const questionSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, "question ids are url/attr-safe slugs"),
  type: z.enum(QUESTION_TYPES),
  label: z.string().min(1).max(200),
  placeholder: z.string().max(200).default(""),
  /** Optional helper line rendered under the label. */
  description: z.string().max(400).default(""),
  required: z.boolean().default(false),
  options: z.array(z.string().min(1).max(120)).max(20).default([]),
  showIf: showIfRuleSchema.nullable().default(null),
});

export const formStructureSchema = z
  .object({
    questions: z.array(questionSchema).min(1).max(30),
  })
  .superRefine((structure, ctx) => {
    const ids = new Set<string>();
    for (const q of structure.questions) {
      if (ids.has(q.id)) {
        ctx.addIssue({
          code: "custom",
          message: `duplicate question id "${q.id}"`,
          path: ["questions"],
        });
      }
      ids.add(q.id);
    }
    structure.questions.forEach((q, i) => {
      if (OPTION_KINDS.has(q.type) && q.options.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: `"${q.type}" questions need at least 2 options`,
          path: ["questions", i, "options"],
        });
      }
      if (q.showIf) {
        if (q.showIf.questionId === q.id) {
          ctx.addIssue({
            code: "custom",
            message: "a question cannot depend on its own answer",
            path: ["questions", i, "showIf"],
          });
        } else if (!ids.has(q.showIf.questionId)) {
          ctx.addIssue({
            code: "custom",
            message: `showIf references unknown question "${q.showIf.questionId}"`,
            path: ["questions", i, "showIf"],
          });
        }
      }
    });
  });

export type ShowIfOp = z.infer<typeof showIfOpSchema>;
export type ShowIfRule = z.infer<typeof showIfRuleSchema>;
export type FormQuestion = z.infer<typeof questionSchema>;
export type FormStructure = z.infer<typeof formStructureSchema>;
