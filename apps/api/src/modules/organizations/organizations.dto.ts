import { z } from "zod";

export const organizationResponseSchema = z.object({
  id: z.string(),
  clerkOrgId: z.string(),
  name: z.string(),
  slug: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const currentOrganizationResponseSchema = z.discriminatedUnion(
  "active",
  [
    z.object({ active: z.literal(false) }),
    z.object({
      active: z.literal(true),
      organization: organizationResponseSchema,
      clerk: z.object({
        orgId: z.string(),
        orgSlug: z.string().nullable(),
        orgRole: z.string().nullable(),
      }),
    }),
  ],
);

export type OrganizationResponseDto = z.infer<
  typeof organizationResponseSchema
>;
export type CurrentOrganizationResponseDto = z.infer<
  typeof currentOrganizationResponseSchema
>;
