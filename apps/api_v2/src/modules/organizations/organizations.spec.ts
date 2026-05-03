import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationsService } from "./organizations.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

const mockOrganizationUpsert = vi.fn();

const prismaMock = {
  client: {
    organization: {
      upsert: mockOrganizationUpsert,
    },
  },
} as unknown as PrismaService;

describe("OrganizationsService", () => {
  let service: OrganizationsService;

  beforeEach(() => {
    service = new OrganizationsService(prismaMock);
    vi.clearAllMocks();
  });

  it("returns inactive state when there is no active Clerk organization", async () => {
    await expect(service.getCurrent(null)).resolves.toEqual({ active: false });
    expect(mockOrganizationUpsert).not.toHaveBeenCalled();
  });

  it("upserts the local organization mirror from Clerk actor context", async () => {
    const now = new Date("2026-05-03T00:00:00.000Z");
    mockOrganizationUpsert.mockResolvedValue({
      id: "org_1",
      clerkOrgId: "org_clerk_1",
      name: "Acme Team",
      slug: "acme-team",
      createdAt: now,
      updatedAt: now,
    });

    await expect(
      service.getCurrent({
        actorType: "user",
        userId: "user_1",
        clerkOrgId: "org_clerk_1",
        clerkOrgSlug: "acme-team",
        clerkOrgRole: "admin",
        clerkOrgPermissions: [],
        scopes: [],
      }),
    ).resolves.toEqual({
      active: true,
      organization: {
        id: "org_1",
        clerkOrgId: "org_clerk_1",
        name: "Acme Team",
        slug: "acme-team",
        createdAt: now,
        updatedAt: now,
      },
      clerk: {
        orgId: "org_clerk_1",
        orgSlug: "acme-team",
        orgRole: "admin",
      },
    });
    expect(mockOrganizationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clerkOrgId: "org_clerk_1" },
        create: expect.objectContaining({
          clerkOrgId: "org_clerk_1",
          name: "Acme Team",
          slug: "acme-team",
          createdByUserId: "user_1",
        }),
      }),
    );
  });
});
