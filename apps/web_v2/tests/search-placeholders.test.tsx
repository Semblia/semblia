import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type {
  V2PaginatedResponse,
  V2ProjectDTO,
  V2TestimonialDTO,
} from "@workspace/types";
import { fetchProjects, fetchTestimonials } from "@/lib/tresta-api";
import { ProjectsClient } from "@/components/projects/projects-client";
import { TestimonialsClient } from "@/components/testimonials/testimonials-client";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/lib/tresta-api", () => ({
  fetchProjects: vi.fn(),
  fetchTestimonials: vi.fn(),
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
      testimonials: 0,
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
    const items = [makeApiProject()];
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

  it("renders the testimonials search placeholder with an ellipsis glyph", async () => {
    const response: V2PaginatedResponse<V2TestimonialDTO> = {
      items: [],
      total: 0,
      page: 1,
      pageSize: 8,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };
    vi.mocked(fetchTestimonials).mockResolvedValue(response);

    renderWithQuery(<TestimonialsClient slug="launchpad" status="ALL" />);

    // Empty-state copy without a collection URL — used here as a sync point
    // for the async "no items" branch.
    await screen.findByText("Nothing yet");

    expect(
      screen.getByLabelText("Search testimonials").getAttribute("placeholder"),
    ).toBe("Search testimonials…");
  });
});
