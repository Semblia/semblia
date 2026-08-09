import { z } from "zod";
import { paginationQuerySchema } from "../../common/dto/pagination.dto.js";
import { projectSlugParamsSchema } from "../projects/projects.dto.js";

export const createCsvExportBodySchema = z.object({
  filename: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[A-Za-z0-9._ -]+\.csv$/, {
      message: "filename must be a simple .csv filename",
    })
    .optional(),
});

export const exportDeliveryParamsSchema = projectSlugParamsSchema.extend({
  deliveryId: z.string().trim().min(1),
});

export const exportDeliveriesQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum(["PENDING", "DELIVERING", "SUCCEEDED", "FAILED", "EXHAUSTED", "ALL"])
    .default("ALL"),
});

export type CreateCsvExportBodyDto = z.infer<typeof createCsvExportBodySchema>;
export type ExportDeliveryParamsDto = z.infer<
  typeof exportDeliveryParamsSchema
>;
export type ExportDeliveriesQueryDto = z.infer<
  typeof exportDeliveriesQuerySchema
>;
