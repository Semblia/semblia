import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { V2PaginatedResponse, V2ProjectDTO } from "@workspace/types";
import { fetchProjects } from "@/lib/semblia-api";
import { ProjectsClient } from "@/components/projects/projects-client";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/lib/semblia-api", () => ({
  fetchProjects: vi.fn(),
  fetchMyProjectTransfers: vi.fn().mockResolvedValue([]),
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
      isPrimaryOwner: true,
    },
    ...overrides,
  };
}

function paginated(items: V2ProjectDTO[]): V2PaginatedResponse<V2ProjectDTO> {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 100,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
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

describe("ProjectsClient workspace home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders the workspace summary line and the new-project ghost tile", async () => {
    vi.mocked(fetchProjects).mockResolvedValue(
      paginated([
        makeApiProject({
          _count: {
            responses: 12,
            pendingModeration: 3,
            widgets: 1,
            apiKeys: 0,
          },
        }),
      ]),
    );

    renderWithQuery(<ProjectsClient />);

    await screen.findByText("Test Project");

    expect(screen.getByText(/1 project/)).toBeTruthy();
    // The total also appears in the card footer; the summary line is one of them.
    expect(screen.getAllByText(/12 responses/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText("3 pending review")).toBeTruthy();

    // The grid (default view) ends with the dashed create tile, pointing at
    // the same destination as the header CTA.
    const newProjectLinks = screen.getAllByRole("link", {
      name: /new project/i,
    });
    expect(
      newProjectLinks.every(
        (link) => link.getAttribute("href") === "/projects/new",
      ),
    ).toBe(true);
    expect(newProjectLinks.length).toBeGreaterThanOrEqual(2);
  });

  it("shows a named failure with a retry action when the first load fails", async () => {
    vi.mocked(fetchProjects)
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(paginated([makeApiProject()]));

    renderWithQuery(<ProjectsClient />);

    await screen.findByText(/couldn.t load your projects/i);

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    await screen.findByText("Test Project");
  });
});
