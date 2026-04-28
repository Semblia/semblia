import { z } from "zod";

export const alertsStatusQuerySchema = z.object({});

export type AlertsStatusQueryDto = z.infer<typeof alertsStatusQuerySchema>;
