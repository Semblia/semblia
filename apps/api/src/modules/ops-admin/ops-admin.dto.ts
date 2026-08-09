import { z } from "zod";

export const opsAdminStatusQuerySchema = z.object({});

export type OpsAdminStatusQueryDto = z.infer<typeof opsAdminStatusQuerySchema>;
