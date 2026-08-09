import type {
  Prisma,
  PublicSurfaceFeature,
} from "@workspace/database/prisma";

/**
 * The single live default host a project holds for a feature, or null.
 * Zero rows means no host was ever issued; two means a default conflict —
 * either way there is no canonical hostname, and callers must surface that
 * instead of fabricating a URL (the defect WS-A exists to remove).
 */
export async function findDefaultLiveHostname(
  client: Pick<Prisma.TransactionClient, "publicSurfaceHost">,
  input: { projectId: string; feature: PublicSurfaceFeature },
): Promise<string | null> {
  const hosts = await client.publicSurfaceHost.findMany({
    where: {
      projectId: input.projectId,
      feature: input.feature,
      resourceType: "PROJECT",
      resourceId: input.projectId,
      isDefault: true,
      status: "ACTIVE",
      verifiedAt: { not: null },
      retiredAt: null,
    },
    select: { hostname: true },
    take: 2,
  });
  return hosts.length === 1 ? (hosts[0]?.hostname ?? null) : null;
}
