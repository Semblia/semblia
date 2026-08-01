import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  V2ImportCatalogSourceDTO,
  V2ImportJobDTO,
  V2PaginatedResponse,
  V2ProjectDTO,
} from "@workspace/types";
import { ImportLanding } from "@/components/imports/import-landing";
import { fetchImportCatalog, fetchImportJobs } from "@/lib/imports/import-api";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/lib/imports/import-api", () => ({
  fetchImportCatalog: vi.fn(),
  fetchImportJobs: vi.fn(),
}));

const project = {
  id: "project_1",
  slug: "launchpad",
  name: "Launchpad",
} as V2ProjectDTO;

function catalog(
  overrides: Partial<V2ImportCatalogSourceDTO> = {},
): V2ImportCatalogSourceDTO {
  return {
    key: "manual",
    label: "Manual text proof",
    group: "Files",
    modes: ["MANUAL"],
    availability: "AVAILABLE",
    reasonCode: null,
    reason: null,
    publicHosts: [],
    publicHostSuffixes: [],
    oauthStrategy: null,
    requiredScopes: [],
    ...overrides,
  };
}

function job(overrides: Partial<V2ImportJobDTO> = {}): V2ImportJobDTO {
  return {
    id: "job_1",
    projectId: project.id,
    mode: "MANUAL",
    sourceKey: "manual",
    status: "PARTIAL",
    totalCount: 4,
    importedCount: 2,
    duplicateCount: 1,
    skippedCount: 0,
    failedCount: 1,
    errorCode: "ROW_INVALID",
    errorMessage: "One row could not be read.",
    startedAt: "2026-07-22T10:00:00.000Z",
    completedAt: "2026-07-22T10:01:00.000Z",
    createdAt: "2026-07-22T10:00:00.000Z",
    updatedAt: "2026-07-22T10:01:00.000Z",
    ...overrides,
  };
}

function jobs(items: V2ImportJobDTO[]): V2PaginatedResponse<V2ImportJobDTO> {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };
}

function renderLanding() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ImportLanding project={project} />
    </QueryClientProvider>,
  );
}

describe("ImportLanding", () => {
  beforeEach(() => vi.clearAllMocks());

  it("links the five import methods to their method pages", async () => {
    vi.mocked(fetchImportCatalog).mockResolvedValue([catalog()]);
    // Keep history pending so the loading rung of the ladder is observable.
    vi.mocked(fetchImportJobs).mockReturnValue(new Promise(() => {}));

    renderLanding();

    expect(
      await screen.findByRole("heading", { name: "Import proof" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("navigation", { name: "Import methods" }),
    ).toBeTruthy();

    for (const [name, href] of [
      ["Connect a platform", "/launchpad/import/connect"],
      ["Import from the web", "/launchpad/import/web"],
      ["Upload a spreadsheet", "/launchpad/import/spreadsheet"],
      ["Add proof manually", "/launchpad/import/manual"],
      ["Migrate a wall", "/launchpad/import/migrate"],
    ] as const) {
      expect(screen.getByRole("link", { name }).getAttribute("href")).toBe(
        href,
      );
    }

    // History hasn't resolved yet — the section says so instead of guessing.
    expect(
      screen
        .getByRole("region", { name: "Recent imports" })
        .getAttribute("aria-busy"),
    ).toBe("true");
  });

  it("carries the source count in the header once the catalog resolves", async () => {
    vi.mocked(fetchImportCatalog).mockResolvedValue([
      catalog(),
      catalog({ key: "reddit", label: "Reddit", modes: ["PUBLIC_URL"] }),
      catalog({ key: "spreadsheet", label: "CSV, XLS, XLSX" }),
    ]);
    vi.mocked(fetchImportJobs).mockResolvedValue(jobs([]));

    renderLanding();

    expect(
      await screen.findByText(
        "3 sources · everything you import arrives pending review",
      ),
    ).toBeTruthy();
  });

  it("renders durable exact job counts including the error message", async () => {
    vi.mocked(fetchImportCatalog).mockResolvedValue([catalog()]);
    vi.mocked(fetchImportJobs).mockResolvedValue(jobs([job()]));

    renderLanding();

    expect(
      await screen.findByText("2 imported · 1 duplicate · 1 failed"),
    ).toBeTruthy();
    expect(screen.getByText(/One row could not be read\./)).toBeTruthy();
  });

  it("shows a real error surface with a retry when history fails to load", async () => {
    vi.mocked(fetchImportCatalog).mockResolvedValue([catalog()]);
    vi.mocked(fetchImportJobs).mockRejectedValue(
      new Error("network unavailable"),
    );

    renderLanding();

    expect(
      await screen.findByText("Couldn't load recent imports"),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("states plainly when nothing has been imported yet", async () => {
    vi.mocked(fetchImportCatalog).mockResolvedValue([catalog()]);
    vi.mocked(fetchImportJobs).mockResolvedValue(jobs([]));

    renderLanding();

    expect(await screen.findByText(/Nothing imported yet\./)).toBeTruthy();
  });
});
