import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { V2PaginatedResponse, V2ProjectDTO } from "@workspace/types";
import { useProjects } from "@/hooks/use-projects";
import { fetchProjects } from "@/lib/tresta-api";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/lib/tresta-api", () => ({
  fetchProjects: vi.fn(),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const makeProject = (overrides: Partial<V2ProjectDTO> = {}): V2ProjectDTO => ({
  id: "project_1",
  userId: "user_1",
  organizationId: "org_1",
  name: "Launchpad",
  shortDescription: "Project management for indie makers",
  description: null,
  slug: "launchpad",
  logoUrl: null,
  projectType: "SAAS_APP",
  websiteUrl: null,
  collectionFormUrl: null,
  brandColorPrimary: "#6366f1",
  brandColorSecondary: "#4f46e5",
  socialLinks: null,
  tags: ["saas", "productivity"],
  visibility: "PUBLIC",
  isActive: true,
  autoModeration: true,
  autoApproveVerified: false,
  profanityFilterLevel: null,
  createdAt: "2026-05-13T00:00:00.000Z",
  updatedAt: "2026-05-13T00:00:00.000Z",
  formConfig: null,
  _count: {
    testimonials: 12,
    pendingModeration: 3,
    widgets: 2,
    apiKeys: 1,
  },
  access: {
    role: "ORG_ADMIN",
    capabilities: ["VIEW_PROJECT", "MANAGE_PROJECT"],
  },
  ...overrides,
});

describe("useProjects", () => {
  it("derives project list state from the typed v2 projects endpoint", async () => {
    const projects = [
      makeProject(),
      makeProject({
        id: "project_2",
        name: "PortfolioPro",
        slug: "portfoliopro",
        projectType: "PORTFOLIO",
        tags: ["design"],
        _count: {
          testimonials: 5,
          pendingModeration: 0,
          widgets: 1,
          apiKeys: 1,
        },
      }),
    ];
    const response: V2PaginatedResponse<V2ProjectDTO> = {
      items: projects,
      total: projects.length,
      page: 1,
      pageSize: 100,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };
    vi.mocked(fetchProjects).mockResolvedValue(response);

    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchProjects).toHaveBeenCalledWith("session-token", {
      pageSize: 100,
    });
    expect(result.current.projects).toEqual(projects);
    expect(result.current.totalTestimonials).toBe(17);
    expect(result.current.totalPending).toBe(3);
    expect(result.current.typeCounts.get("SAAS_APP")).toBe(1);
    expect(result.current.typeCounts.get("PORTFOLIO")).toBe(1);
  });
});
