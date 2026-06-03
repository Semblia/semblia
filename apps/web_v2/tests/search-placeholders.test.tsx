import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type {
  V2PaginatedResponse,
  V2ProjectDTO,
  V2ResponseDTO,
} from "@workspace/types";
import { fetchProjects, fetchResponses } from "@/lib/tresta-api";
import { ProjectsClient } from "@/components/projects/projects-client";
import { ResponsesClient } from "@/components/responses/responses-client";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/lib/tresta-api", () => ({
  fetchProjects: vi.fn(),
  fetchResponses: vi.fn(),
}));

function makeApiProject(overrides: Partial<V2ProjectDTO> = {}): V2ProjectDTO {
  return {
    id: "proj_test",
    userId: "user_test",
    organizationId: "org_test",
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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    formConfig: null,
    _count: {
      responses: 0,
      pendingModeration: 0,
      widgets: 0,
      apiKeys: 0,
    },
    access: {
      role: "ORG_ADMIN",
      capabilities: ["VIEW_PROJECT"],
    },
    ...overrides,
  };
}

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe("search placeholders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the projects search placeholder with an ellipsis glyph", async () => {
    // ProjectsClient gates the toolbar (search + filter pills + view toggle)
    // on `projects.length >= 6` so it stops being noise at small workspaces;
    // seed 6 distinct projects so the search field renders.
    const items = Array.from({ length: 6 }, (_, i) =>
      makeApiProject({
        id: `proj_${i}`,
        slug: `project-${i}`,
        name: `Project ${i}`,
      }),
    );
    const response: V2PaginatedResponse<V2ProjectDTO> = {
      items,
      total: items.length,
      page: 1,
      pageSize: 100,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };
    vi.mocked(fetchProjects).mockResolvedValueOnce(response);

    renderWithQuery(<ProjectsClient />);

    await screen.findByLabelText("Search projects");

    expect(
      screen.getByLabelText("Search projects").getAttribute("placeholder"),
    ).toBe("Search projects…");
  });

  it("renders the responses search placeholder with an ellipsis glyph", async () => {
    const response: V2PaginatedResponse<V2ResponseDTO> = {
      items: [],
      total: 0,
      page: 1,
      pageSize: 8,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };
    vi.mocked(fetchResponses).mockResolvedValue(response);

    renderWithQuery(<ResponsesClient slug="launchpad" status="ALL" />);

    // Empty-state copy without a collection URL — used here as a sync point
    // for the async "no items" branch.
    await screen.findByText("Nothing yet");

    expect(
      screen.getByLabelText("Search responses").getAttribute("placeholder"),
    ).toBe("Search responses…");
  });
});
