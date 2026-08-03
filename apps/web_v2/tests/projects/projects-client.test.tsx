import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type {
  V2PaginatedResponse,
  V2ProjectDTO,
  V2UsageDTO,
} from "@workspace/types";
import { fetchBillingUsage, fetchProjects } from "@/lib/semblia-api";
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
  fetchBillingUsage: vi.fn(),
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
    publicSurfaceHosts: [],
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

function paginated(
  items: V2ProjectDTO[],
  envelope: Partial<V2PaginatedResponse<V2ProjectDTO>> = {},
): V2PaginatedResponse<V2ProjectDTO> {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 24,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
    ...envelope,
  };
}

function usage(projects: { used: number; limit: number }): V2UsageDTO {
  return {
    forms: { used: 0, limit: 5 },
    responses: { used: 0, limit: 50 },
    widgets: { used: 0, limit: 4 },
    projects,
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
    vi.mocked(fetchBillingUsage).mockResolvedValue(
      usage({ used: 1, limit: 25 }),
    );
  });

  it("reports the server's own total, not the rows on this page", async () => {
    // The regression this pins: the header used to report `projects.length`
    // over a hard `pageSize: 100`, so a 140-project workspace was told it had
    // 100 — and there was no pagination affordance to reveal the rest.
    vi.mocked(fetchProjects).mockResolvedValue(
      paginated([makeApiProject()], { total: 140, totalPages: 6 }),
    );

    renderWithQuery(<ProjectsClient />);

    await screen.findByText("Test Project");

    expect(screen.getByText(/140 projects/)).toBeTruthy();
    expect(
      screen.getByRole("navigation", { name: /pagination/i }),
    ).toBeTruthy();
  });

  it("keeps every project's counts on the project itself", async () => {
    // Both counts render in both views: the row used to show pending XOR
    // responses, so switching view changed the information, not the layout.
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

    expect(screen.getByText("3 pending review")).toBeTruthy();
    expect(screen.getByText("12 responses")).toBeTruthy();
    expect(screen.getByText("1 widget")).toBeTruthy();
    // …and the workspace-wide aggregate is gone from the header: the global
    // view is a project selector, never a dashboard of summed metrics.
    expect(screen.getByText(/1 project$/)).toBeTruthy();
  });

  it("offers exactly one create affordance, pointing at real creation", async () => {
    vi.mocked(fetchProjects).mockResolvedValue(paginated([makeApiProject()]));

    renderWithQuery(<ProjectsClient />);

    await screen.findByText("Test Project");

    const createLinks = screen.getAllByRole("link", { name: /new project/i });
    expect(createLinks).toHaveLength(1);
    expect(createLinks[0].getAttribute("href")).toBe("/new");
  });

  it("refuses creation in place when the plan's project limit is used up", async () => {
    // The API answers a create over the cap with a flat 403. Offering the
    // action anyway walked Free-plan users through the whole form into a
    // refusal they could not have predicted.
    vi.mocked(fetchProjects).mockResolvedValue(paginated([makeApiProject()]));
    vi.mocked(fetchBillingUsage).mockResolvedValue(
      usage({ used: 1, limit: 1 }),
    );

    renderWithQuery(<ProjectsClient />);

    await screen.findByText("Test Project");
    await screen.findByRole("button", { name: /new project/i });

    const create = screen.getByRole("button", { name: /new project/i });
    expect(create.hasAttribute("disabled")).toBe(true);
    // The reason is stated in place, not left to a tooltip on a control that
    // takes no pointer events.
    expect(screen.getByText(/all 1 are in use/i)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /plan limit reached/i })
        .getAttribute("href"),
    ).toBe("/account/billing");
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

  it("does not claim the page is still loading once the load has failed", async () => {
    // The header's count came from `data.total`, which stays undefined on a
    // failure — so the header said "Loading…" underneath an error surface that
    // had already given up.
    vi.mocked(fetchProjects).mockRejectedValue(new Error("network down"));

    renderWithQuery(<ProjectsClient />);

    await screen.findByText(/couldn.t load your projects/i);

    expect(screen.queryByText(/loading/i)).toBeNull();
  });

  it("humanizes a project type the label map has not learned yet", async () => {
    // The API can grow `V2ProjectType` before this app grows a pretty name for
    // it. The filter pill fell back to the raw enum, putting `QUANTUM_BAKERY`
    // in front of a user.
    vi.mocked(fetchProjects).mockResolvedValue(
      paginated(
        Array.from({ length: 6 }, (_, i) =>
          makeApiProject({
            id: `proj_${i}`,
            slug: `p-${i}`,
            name: `Site ${i}`,
            projectType: "QUANTUM_BAKERY" as V2ProjectDTO["projectType"],
          }),
        ),
      ),
    );

    renderWithQuery(<ProjectsClient />);

    await screen.findByText("Site 0");

    expect(screen.getAllByText("Quantum Bakery").length).toBeGreaterThan(0);
    expect(screen.queryByText("QUANTUM_BAKERY")).toBeNull();
  });

  it("fails open when the plan's project limit is not a usable number", async () => {
    // A stored plan record reaches the client untouched, so a limit of 0 is
    // reachable — and `used >= 0` would refuse creation forever, in the name of
    // a plan that "includes 0 projects".
    vi.mocked(fetchProjects).mockResolvedValue(paginated([makeApiProject()]));
    vi.mocked(fetchBillingUsage).mockResolvedValue(
      usage({ used: 3, limit: 0 }),
    );

    renderWithQuery(<ProjectsClient />);

    await screen.findByText("Test Project");

    expect(
      screen.getByRole("link", { name: /new project/i }).getAttribute("href"),
    ).toBe("/new");
    expect(screen.queryByText(/are in use/i)).toBeNull();
  });

  it("shows the filtered-empty surface instead of a blank canvas", async () => {
    // A filter that matched nothing used to fall through to an empty grid: a
    // header, a toolbar, and then nothing at all on screen.
    vi.mocked(fetchProjects).mockResolvedValue(
      paginated(
        Array.from({ length: 6 }, (_, i) =>
          makeApiProject({
            id: `proj_${i}`,
            slug: `p-${i}`,
            name: `Site ${i}`,
          }),
        ),
      ),
    );

    renderWithQuery(<ProjectsClient />);

    await screen.findByText("Site 0");

    fireEvent.change(screen.getByLabelText("Search projects"), {
      target: { value: "zzz-no-such-project" },
    });

    // The query is quoted back verbatim, and the recovery clears every filter.
    expect(await screen.findByText(/zzz-no-such-project/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /show all projects/i }));
    await screen.findByText("Site 0");
  });
});
