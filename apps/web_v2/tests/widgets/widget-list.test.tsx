import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { V2ProjectDTO, V2WidgetDTO } from "@workspace/types";
import { ApiError } from "@/lib/api-client";
import { fetchWidgets, fetchBillingUsage } from "@/lib/semblia-api";
import { WidgetList } from "@/components/widgets/widget-list";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

/** The surface reads its kind filter out of the URL, so the URL is the input. */
let search = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/launchpad/studio",
  useSearchParams: () => search,
}));

vi.mock("@/lib/semblia-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/semblia-api")>()),
  fetchWidgets: vi.fn(),
  fetchBillingUsage: vi.fn(),
}));

const project = {
  id: "project_1",
  slug: "launchpad",
  name: "Launchpad",
  brandColorPrimary: "#6366f1",
} as V2ProjectDTO;

/**
 * Only `entry` drives the list; `config` is handed to the studio-config adapter
 * for the preview and the wall address. This stub deliberately carries no
 * definition — a real production shape for a record written by an older
 * contract version — and whether the adapter rejects it or not, the surface has
 * to survive it.
 */
function widget(overrides: Partial<V2WidgetDTO["entry"]> = {}): V2WidgetDTO {
  return {
    id: overrides.id ?? "widget_1",
    projectId: project.id,
    entry: {
      id: "widget_1",
      name: "Homepage carousel",
      widgetType: "EMBED",
      layoutType: "CAROUSEL",
      themeMode: "LIGHT",
      preset: "meridian",
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
      totalLoads: 0,
      avgLoadMs: 0,
      lastLoadAt: null,
      isActive: true,
      isPrimaryWall: false,
      publicUrl: null,
      ...overrides,
    },
    config: {} as V2WidgetDTO["config"],
  };
}

function renderList() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <WidgetList project={project} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  search = new URLSearchParams();
  // Rows are lighter than tiles and render no preview, which keeps these tests
  // about the state ladder rather than about the widget renderer.
  window.localStorage.setItem("widgets:view", "list");
  vi.mocked(fetchBillingUsage).mockResolvedValue({
    forms: { used: 0, limit: 10 },
    responses: { used: 0, limit: 100 },
    widgets: { used: 0, limit: 10 },
    projects: { used: 1, limit: 3 },
  });
});

describe("WidgetList — a failed load is never an empty project", () => {
  it("renders the error surface, not the first-run picker, when the list fails", async () => {
    vi.mocked(fetchWidgets).mockRejectedValue(
      new ApiError(500, "upstream unavailable"),
    );

    renderList();

    // Names the resource, offers the one recovery, and does not claim the
    // project has no widgets — the defect this surface shipped with.
    expect(await screen.findByText("Couldn't load widgets")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Try again/ })).toBeTruthy();
    expect(screen.queryByText("Wall of Love")).toBeNull();
  });

  it("offers no retry on a permission failure, which retrying cannot fix", async () => {
    vi.mocked(fetchWidgets).mockRejectedValue(new ApiError(403, "forbidden"));

    renderList();

    expect(
      await screen.findByText("You don't have access to widgets"),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Try again/ })).toBeNull();
    expect(screen.queryByText("Wall of Love")).toBeNull();
  });
});

describe("WidgetList — first run and filtered miss are different surfaces", () => {
  it("shows the kind picker when the project genuinely has no widgets", async () => {
    vi.mocked(fetchWidgets).mockResolvedValue([]);

    renderList();

    expect(await screen.findByText("Wall of Love")).toBeTruthy();
    expect(screen.getByText("Embed widget")).toBeTruthy();
  });

  it("keeps the kind picker when a filter is active but nothing exists yet", async () => {
    // A filter can't be the reason a project with zero widgets looks empty, so
    // the recovery stays "create one" rather than "clear the filter".
    search = new URLSearchParams("type=wall");
    vi.mocked(fetchWidgets).mockResolvedValue([]);

    renderList();

    expect(await screen.findByText("Wall of Love")).toBeTruthy();
    expect(screen.queryByText("No walls in this project")).toBeNull();
  });

  it("shows the filtered miss when widgets exist but none match the kind", async () => {
    search = new URLSearchParams("type=wall");
    vi.mocked(fetchWidgets).mockResolvedValue([widget()]);

    renderList();

    expect(await screen.findByText("No walls in this project")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Show all widgets" }),
    ).toBeTruthy();
  });
});

describe("WidgetList — the controls that scope the view stay mounted", () => {
  it("keeps the kind filter usable while the list is still loading", () => {
    // Never resolves: the assertion is about the loading frame specifically.
    vi.mocked(fetchWidgets).mockReturnValue(new Promise(() => {}));

    renderList();

    expect(screen.getByRole("radio", { name: /Embeds/ })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /Walls/ })).toBeTruthy();
  });

  it("shows no kind counts until the list has answered", () => {
    vi.mocked(fetchWidgets).mockReturnValue(new Promise(() => {}));

    renderList();

    // Exact accessible names: a count whose source hasn't arrived is hidden,
    // never rendered as a fabricated 0 beside the label.
    expect(screen.getByRole("radio", { name: "All" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Embeds" })).toBeTruthy();
  });

  it("counts only the kinds that exist once the list has answered", async () => {
    vi.mocked(fetchWidgets).mockResolvedValue([widget()]);

    renderList();

    expect(
      await screen.findByRole("radio", { name: /^Embeds\s*1$/ }),
    ).toBeTruthy();
    // Zero walls: the pill stays, the count does not appear as `0`.
    expect(screen.getByRole("radio", { name: "Walls" })).toBeTruthy();
  });
});

describe("WidgetList — never offers a create the plan will refuse", () => {
  it("disables both create actions with the reason in place once the allowance is spent", async () => {
    vi.mocked(fetchWidgets).mockResolvedValue([widget()]);
    vi.mocked(fetchBillingUsage).mockResolvedValue({
      forms: { used: 0, limit: 10 },
      responses: { used: 0, limit: 100 },
      widgets: { used: 1, limit: 1 },
      projects: { used: 1, limit: 3 },
    });

    renderList();

    // The reason is readable beside the controls, not buried in a tooltip on a
    // disabled element that receives no pointer events.
    expect(
      await screen.findByText(/Plan limit reached — 1 of 1 widget in use/),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Review plan" })).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: /Create embed/ })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen
        .getByRole("button", { name: /Create wall/ })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("leaves both create actions usable when the usage query itself fails", async () => {
    vi.mocked(fetchWidgets).mockResolvedValue([widget()]);
    vi.mocked(fetchBillingUsage).mockRejectedValue(new ApiError(503, "down"));

    renderList();

    expect(await screen.findByText("1 widget · 0 paused")).toBeTruthy();
    expect(screen.queryByText(/Plan limit reached/)).toBeNull();
    expect(
      screen
        .getByRole("button", { name: /Create embed/ })
        .hasAttribute("disabled"),
    ).toBe(false);
  });
});
