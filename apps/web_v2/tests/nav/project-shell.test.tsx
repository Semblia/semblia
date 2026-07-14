import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { V2PaginatedResponse, V2ProjectDTO } from "@workspace/types";
import { ProjectSidebarNav } from "@/components/nav/project-sidebar";
import { ProjectSwitcher } from "@/components/nav/project-switcher";
import { fetchProjects } from "@/lib/semblia-api";

const navigation = vi.hoisted(() => ({
  pathname: "/projects/launchpad/widgets",
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({
    push: navigation.push,
  }),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/lib/semblia-api", () => ({
  fetchProjects: vi.fn(),
}));

function makeProject(overrides: Partial<V2ProjectDTO> = {}): V2ProjectDTO {
  return {
    id: "project_1",
    userId: "user_1",
    organizationId: "org_1",
    name: "Launchpad",
    shortDescription: "Project management for indie makers",
    description: null,
    slug: "launchpad",
    logo: null,
    projectType: "SAAS_APP",
    websiteUrl: null,
    collectionFormUrl: null,
    brandColorPrimary: "#6366f1",
    brandColorSecondary: "#4f46e5",
    socialLinks: null,
    tags: ["saas"],
    visibility: "PUBLIC",
    isActive: true,
    autoModeration: true,
    autoApproveVerified: false,
    profanityFilterLevel: null,
    createdAt: "2026-05-13T00:00:00.000Z",
    updatedAt: "2026-05-13T00:00:00.000Z",
    formConfig: null,
    publicSurfaceHosts: [],
    _count: {
      responses: 12,
      pendingModeration: 4,
      widgets: 2,
      apiKeys: 1,
    },
    access: {
      role: "ORG_ADMIN",
      capabilities: ["VIEW_PROJECT", "MANAGE_PROJECT"],
      isPrimaryOwner: true,
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

describe("project shell navigation", () => {
  it("renders sidebar identity and marks the active section from a typed project dto", () => {
    render(<ProjectSidebarNav slug="launchpad" project={makeProject()} />);

    expect(screen.getAllByText("Launchpad").length).toBeGreaterThan(0);
    expect(screen.getByText("Public")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /widgets/i })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("links the developer surface as a single Developers entry", () => {
    render(<ProjectSidebarNav slug="launchpad" project={makeProject()} />);

    const link = screen.getByRole("link", { name: /developers/i });
    expect(link.getAttribute("href")).toBe("/projects/launchpad/developers");
    expect(screen.queryByRole("link", { name: /^api keys$/i })).toBeNull();
  });

  it("loads switcher options from the typed projects endpoint", async () => {
    const current = makeProject();
    const second = makeProject({
      id: "project_2",
      name: "PortfolioPro",
      slug: "portfoliopro",
      _count: {
        responses: 1,
        pendingModeration: 0,
        widgets: 0,
        apiKeys: 0,
      },
    });
    const response: V2PaginatedResponse<V2ProjectDTO> = {
      items: [current, second],
      total: 2,
      page: 1,
      pageSize: 100,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };
    vi.mocked(fetchProjects).mockResolvedValueOnce(response);

    renderWithQuery(<ProjectSwitcher current={current} />);
    await userEvent.click(screen.getByRole("button", { name: /launchpad/i }));

    await waitFor(() =>
      expect(fetchProjects).toHaveBeenCalledWith("session-token", {
        pageSize: 100,
      }),
    );
    expect(await screen.findByText("PortfolioPro")).toBeTruthy();
  });
});
