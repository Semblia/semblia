import type { V2ProjectDTO } from "@workspace/types";

export function makeProject(
  overrides: Partial<V2ProjectDTO> = {},
): V2ProjectDTO {
  return {
    id: "proj_test",
    userId: "user_test",
    organizationId: null,
    name: "Test Project",
    shortDescription: null,
    description: null,
    slug: "test-project",
    logo: null,
    projectType: "SAAS_APP",
    websiteUrl: null,
    collectionFormUrl: null,
    brandColorPrimary: "#6366f1",
    brandColorSecondary: "#f59e0b",
    socialLinks: null,
    tags: [],
    visibility: "PUBLIC",
    isActive: true,
    autoModeration: true,
    autoApproveVerified: false,
    profanityFilterLevel: null,
    formConfig: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    _count: {
      responses: 0,
      pendingModeration: 0,
      widgets: 0,
      apiKeys: 0,
    },
    access: {
      role: "OWNER",
      capabilities: [],
    },
    ...overrides,
  };
}
