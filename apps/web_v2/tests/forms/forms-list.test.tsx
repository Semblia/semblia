import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { V2FormSummaryDTO, V2ProjectDTO } from "@workspace/types";
import { ApiError } from "@/lib/api-client";
import { fetchForms, fetchBillingUsage } from "@/lib/semblia-api";
import { FormList } from "@/components/forms/form-list";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

/** The surface reads its filter out of the URL, so the URL is the test input. */
let search = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/launchpad/forms",
  useSearchParams: () => search,
}));

/**
 * `@workspace/forms-renderer` ships prebuilt and resolves its own React copy
 * under vitest, so mounting the real renderer throws "invalid hook call" before
 * any assertion runs. The picker's live preview is `aria-hidden` decoration —
 * none of these tests read it — so it is stubbed to keep the dialog mountable.
 */
vi.mock("@workspace/forms-renderer", () => ({
  FormRenderer: () => null,
}));

vi.mock("@/lib/semblia-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/semblia-api")>()),
  fetchForms: vi.fn(),
  fetchBillingUsage: vi.fn(),
}));

const project = {
  id: "project_1",
  slug: "launchpad",
  name: "Launchpad",
  brandColorPrimary: "#6366f1",
} as V2ProjectDTO;

function form(overrides: Partial<V2FormSummaryDTO> = {}): V2FormSummaryDTO {
  return {
    id: "form_1",
    projectId: project.id,
    intent: "TESTIMONIAL",
    name: "Customer testimonials",
    slug: null,
    status: "DRAFT",
    open: true,
    draftVersion: 1,
    currentVersion: null,
    draft: {},
    metrics: {
      views: 0,
      submissions: 0,
      responseRate: null,
      lastSubmissionAt: null,
    },
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function renderList() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <FormList project={project} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  search = new URLSearchParams();
  // The list/grid toggle persists to localStorage, so a test that wants the
  // row view has to say so rather than inherit the previous test's choice.
  localStorage.clear();
  vi.mocked(fetchBillingUsage).mockResolvedValue({
    forms: { used: 0, limit: 10 },
    responses: { used: 0, limit: 100 },
    widgets: { used: 0, limit: 10 },
    projects: { used: 1, limit: 3 },
  });
});

describe("FormList — a failed load is never an empty project", () => {
  it("renders the error surface, not the first-run hero, when the list fails", async () => {
    vi.mocked(fetchForms).mockRejectedValue(
      new ApiError(500, "upstream unavailable"),
    );

    renderList();

    // Names the resource, offers the one recovery, and does not claim the
    // project has no forms — the defect this surface shipped with.
    expect(await screen.findByText("Couldn't load forms")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Try again/ })).toBeTruthy();
    expect(screen.queryByText("No forms yet")).toBeNull();
  });

  it("offers no retry on a permission failure, which retrying cannot fix", async () => {
    vi.mocked(fetchForms).mockRejectedValue(new ApiError(403, "forbidden"));

    renderList();

    expect(
      await screen.findByText("You don't have access to forms"),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Try again/ })).toBeNull();
    expect(screen.queryByText("No forms yet")).toBeNull();
  });
});

describe("FormList — first run and filtered miss are different surfaces", () => {
  it("shows the first-run hero when the project genuinely has no forms", async () => {
    vi.mocked(fetchForms).mockResolvedValue([]);

    renderList();

    expect(await screen.findByText("No forms yet")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Create a form/ })).toBeTruthy();
  });

  it("keeps the first-run hero when a filter is active but nothing exists yet", async () => {
    // A filter can't be the reason a project with zero forms looks empty, so
    // the recovery stays "create one" rather than "clear the filter".
    search = new URLSearchParams("status=live");
    vi.mocked(fetchForms).mockResolvedValue([]);

    renderList();

    expect(await screen.findByText("No forms yet")).toBeTruthy();
    expect(screen.queryByText("No live forms")).toBeNull();
  });

  it("shows the filtered miss when forms exist but none match the filter", async () => {
    search = new URLSearchParams("status=live");
    vi.mocked(fetchForms).mockResolvedValue([form({ status: "DRAFT" })]);

    renderList();

    expect(await screen.findByText("No live forms")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show all forms" })).toBeTruthy();
    expect(screen.queryByText("No forms yet")).toBeNull();
  });
});

describe("FormList — a refusal names the reason it is actually true of", () => {
  it("does not tell the owner of a live form to publish it", async () => {
    // `Form.slug` is nullable and nothing in the product assigns it, so a
    // PUBLISHED form reaches the no-link branch too. Reusing the unpublished
    // sentence there states a cause that is false and an action already taken.
    localStorage.setItem("forms:view", "list");
    vi.mocked(fetchForms).mockResolvedValue([
      form({ status: "PUBLISHED", currentVersion: 3, slug: null }),
    ]);

    renderList();

    expect(await screen.findByText("v3 published")).toBeTruthy();
    expect(
      screen.queryByText("Publish this form to get a shareable link."),
    ).toBeNull();
    expect(
      screen.getAllByText("Published, but this form has no public address yet.")
        .length,
    ).toBeGreaterThan(0);
  });

  it("does tell the owner of a draft to publish it", async () => {
    localStorage.setItem("forms:view", "list");
    vi.mocked(fetchForms).mockResolvedValue([form({ status: "DRAFT" })]);

    renderList();

    expect(await screen.findByText("Not published yet")).toBeTruthy();
    expect(
      screen.getAllByText("Publish this form to get a shareable link.").length,
    ).toBeGreaterThan(0);
  });
});

describe("FormList — never offers a create the plan will refuse", () => {
  it("disables New form with the reason in place once the allowance is spent", async () => {
    vi.mocked(fetchForms).mockResolvedValue([form()]);
    vi.mocked(fetchBillingUsage).mockResolvedValue({
      forms: { used: 1, limit: 1 },
      responses: { used: 0, limit: 50 },
      widgets: { used: 0, limit: 4 },
      projects: { used: 1, limit: 1 },
    });

    renderList();

    // The reason is readable beside the control, not buried in a tooltip on a
    // disabled element that receives no pointer events.
    expect(
      await screen.findByText(/Plan limit reached — 1 of 1 form in use/),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Review plan" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /New form/ }).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("disables Create form inside the picker, which `?new=1` opens directly", async () => {
    // The header button being disabled is not enough: `?new=1` survives a
    // bookmark, a refresh, and Back, so the dialog can be reached without ever
    // touching that button. The refusal has to be stated at the control that
    // would actually fire the request.
    search = new URLSearchParams("new=1");
    vi.mocked(fetchForms).mockResolvedValue([form()]);
    vi.mocked(fetchBillingUsage).mockResolvedValue({
      forms: { used: 1, limit: 1 },
      responses: { used: 0, limit: 50 },
      widgets: { used: 0, limit: 4 },
      projects: { used: 1, limit: 1 },
    });

    renderList();

    // The dialog mounts before the usage answer lands, so wait for the reason
    // to be on screen inside it, then assert the control it explains.
    const reasons = await screen.findAllByText(
      /Plan limit reached — 1 of 1 form in use/,
    );
    expect(reasons.length).toBe(2); // beside New form, and inside the dialog
    expect(
      screen
        .getByRole("button", { name: "Create form" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("leaves New form usable when the usage query itself fails", async () => {
    vi.mocked(fetchForms).mockResolvedValue([form()]);
    vi.mocked(fetchBillingUsage).mockRejectedValue(new ApiError(503, "down"));

    renderList();

    // Wait for both queries to settle: the header count only appears once the
    // list resolved, by which point a usage answer would have arrived too.
    expect(await screen.findByText("1 form · 0 live")).toBeTruthy();
    expect(screen.queryByText(/Plan limit reached/)).toBeNull();
    expect(
      screen.getByRole("button", { name: /New form/ }).hasAttribute("disabled"),
    ).toBe(false);
  });
});
