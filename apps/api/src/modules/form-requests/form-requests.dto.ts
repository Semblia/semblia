import { z } from "zod";

const normalizedEmailSchema = z
  .string()
  .trim()
  .max(320)
  .email()
  .transform((email) => email.toLowerCase());

export const createFormRequestBodySchema = z
  .object({
    formId: z.string().trim().min(1),
    emails: z
      .array(normalizedEmailSchema)
      .min(1)
      .transform((emails) => [...new Set(emails)])
      .refine((emails) => emails.length <= 50, {
        message: "A form request can have at most 50 recipients",
      }),
    note: z
      .string()
      .trim()
      .max(1_000)
      .transform((note) => (note.length > 0 ? note : null))
      .nullable()
      .optional(),
  })
  .strict()
  .transform((body) => ({
    ...body,
    note: body.note ?? null,
  }));

export const formRequestsListQuerySchema = z
  .object({
    formId: z.string().trim().min(1).optional(),
  })
  .strict();

export type CreateFormRequestBodyDto = z.infer<
  typeof createFormRequestBodySchema
>;
export type FormRequestsListQueryDto = z.infer<
  typeof formRequestsListQuerySchema
>;
