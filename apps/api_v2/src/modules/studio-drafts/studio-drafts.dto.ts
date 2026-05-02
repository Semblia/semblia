import { z } from "zod";

const opaqueJsonObjectSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => !Array.isArray(value), {
    message: "Expected a JSON object",
  });

export const studioDraftBodySchema = z.object({
  draft: opaqueJsonObjectSchema,
  expectedVersion: z.number().int().min(0),
});

export type StudioDraftBodyDto = z.infer<typeof studioDraftBodySchema>;
