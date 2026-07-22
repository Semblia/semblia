import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  V2ImportCatalogSourceDTO,
  V2ImportJobDTO,
  V2PaginatedResponse,
  V2ProjectDTO,
} from "@workspace/types";
import { ImportCenter } from "@/components/imports/import-center";
import { fetchImportCatalog, fetchImportJobs } from "@/lib/semblia-api";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/lib/semblia-api", () => ({
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

function renderCenter() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ImportCenter project={project} />
    </QueryClientProvider>,
  );
}

describe("ImportCenter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps real API catalog groups into the four import methods", async () => {
    vi.mocked(fetchImportCatalog).mockResolvedValue([
      catalog({ key: "spreadsheet", label: "CSV, XLS, XLSX", group: "Files" }),
      catalog({ key: "manual", label: "Manual text proof", group: "Direct" }),
      catalog({
        key: "linkedin",
        label: "LinkedIn",
        group: "Connected social",
        availability: "SETUP_REQUIRED",
        reason: "Connect LinkedIn first.",
      }),
      catalog({
        key: "google-business",
        label: "Google Business Profile",
        group: "Connected reviews",
        availability: "SETUP_REQUIRED",
      }),
      catalog({
        key: "reddit",
        label: "Reddit",
        group: "Public social/community",
      }),
      catalog({
        key: "g2",
        label: "G2",
        group: "Public reviews",
        availability: "MANUAL_ONLY",
        reason: "Public automation is not approved.",
      }),
      catalog({
        key: "testimonial-to",
        label: "Testimonial.to",
        group: "Wall migrations",
        availability: "BLOCKED",
        reason: "Use a CSV export instead.",
      }),
      catalog({
        key: "threads",
        label: "Threads",
        group: "Manual-only/private",
        availability: "MANUAL_ONLY",
      }),
    ]);
    vi.mocked(fetchImportJobs).mockResolvedValue(jobs([]));

    renderCenter();

    expect(
      await screen.findByRole("heading", { name: "Import proof" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("navigation", { name: "Import methods" }),
    ).toBeTruthy();
    expect(screen.getByText("Quick import")).toBeTruthy();
    expect(screen.getByText("Connected sources")).toBeTruthy();
    expect(screen.getByText("Public sources")).toBeTruthy();
    expect(screen.getByText("Migrate")).toBeTruthy();
    expect(
      within(
        await screen.findByRole("region", { name: "Quick import" }),
      ).getByText("CSV, XLS, XLSX"),
    ).toBeTruthy();
    expect(
      within(
        screen.getByRole("region", { name: "Connected sources" }),
      ).getByText("LinkedIn"),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("region", { name: "Public sources" })).getByText(
        "Reddit",
      ),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("region", { name: "Migrate" })).getByText(
        "Testimonial.to",
      ),
    ).toBeTruthy();
    expect(screen.getAllByText("Setup required")).toHaveLength(2);
    expect(screen.getAllByText("Manual only")).toHaveLength(2);
    expect(screen.getByText("Blocked")).toBeTruthy();
    expect(screen.queryByText("Details")).toBeNull();

    const navigation = screen.getByRole("navigation", {
      name: "Import methods",
    });
    for (const [label, targetId] of [
      ["Quick import", "quick-import"],
      ["Connected sources", "connected-sources"],
      ["Public sources", "public-sources"],
      ["Migrate", "migrate"],
    ] as const) {
      expect(
        within(navigation)
          .getByRole("link", { name: label })
          .getAttribute("href"),
      ).toBe(`#${targetId}`);
      expect(document.getElementById(targetId)).toBeTruthy();
    }
  });

  it("keeps unknown API groups visible in an honest fallback section", async () => {
    vi.mocked(fetchImportCatalog).mockResolvedValue([
      catalog({
        key: "future",
        label: "Future network",
        group: "Emerging partners",
      }),
    ]);
    vi.mocked(fetchImportJobs).mockResolvedValue(jobs([]));

    renderCenter();

    const fallback = await screen.findByRole("region", {
      name: "Other sources",
    });
    expect(fallback.id).toBe("other-sources");
    expect(within(fallback).getByText("Future network")).toBeTruthy();
    expect(
      within(fallback).getByText(
        "Unrecognized source group: Emerging partners",
      ),
    ).toBeTruthy();
  });

  it("uses safe fallbacks and makes loading, empty, and failed states explicit", async () => {
    vi.mocked(fetchImportCatalog).mockResolvedValue([
      catalog({ availability: "FUTURE" as never, reason: null }),
    ]);
    vi.mocked(fetchImportJobs).mockRejectedValue(
      new Error("network unavailable"),
    );

    renderCenter();

    expect(
      screen
        .getByRole("region", { name: "Import catalog" })
        .getAttribute("aria-busy"),
    ).toBe("true");
    expect(await screen.findByText("Unavailable")).toBeTruthy();
    expect(screen.getByText("Import history couldn't load.")).toBeTruthy();
  });

  it("renders durable exact job counts", async () => {
    vi.mocked(fetchImportCatalog).mockResolvedValue([catalog()]);
    vi.mocked(fetchImportJobs).mockResolvedValue(jobs([job()]));

    renderCenter();

    expect(
      await screen.findByText("2 imported · 1 duplicate · 1 failed"),
    ).toBeTruthy();
    expect(screen.getByText("One row could not be read.")).toBeTruthy();
  });
});
