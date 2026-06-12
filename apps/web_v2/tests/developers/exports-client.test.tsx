import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  V2ExportDeliveryDTO,
  V2PaginatedResponse,
} from "@workspace/types";
import {
  createCsvExport,
  downloadExport,
  fetchExportDeliveries,
} from "@/lib/semblia-api";
import { ExportsClient } from "@/components/developers/exports/exports-client";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/lib/semblia-api", () => ({
  createCsvExport: vi.fn(),
  downloadExport: vi.fn(),
  fetchExportDeliveries: vi.fn(),
  fetchExportDelivery: vi.fn(),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

function delivery(
  overrides: Partial<V2ExportDeliveryDTO> = {},
): V2ExportDeliveryDTO {
  return {
    id: "del_1",
    projectId: "proj_1",
    destinationId: "dest_1",
    ruleId: null,
    eventType: "export.csv",
    payload: { filename: "responses-launch.csv" },
    status: "SUCCEEDED",
    attempts: 1,
    nextAttemptAt: null,
    error: null,
    artifactAssetId: "asset_1",
    completedAt: "2026-06-04T10:11:00.000Z",
    createdAt: "2026-06-04T10:10:00.000Z",
    updatedAt: "2026-06-04T10:11:00.000Z",
    ...overrides,
  };
}

function page(
  items: V2ExportDeliveryDTO[],
  overrides: Partial<V2PaginatedResponse<V2ExportDeliveryDTO>> = {},
): V2PaginatedResponse<V2ExportDeliveryDTO> {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
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

describe("ExportsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an empty state when there are no deliveries", async () => {
    vi.mocked(fetchExportDeliveries).mockResolvedValue(page([]));

    renderWithQuery(<ExportsClient slug="launchpad" />);

    expect(await screen.findByText("No exports yet")).toBeTruthy();
  });

  it("lists deliveries and surfaces a download action for ready artifacts", async () => {
    vi.mocked(fetchExportDeliveries).mockResolvedValue(page([delivery()]));

    renderWithQuery(<ExportsClient slug="launchpad" />);

    expect(await screen.findByText("responses-launch.csv")).toBeTruthy();
    expect(screen.getByRole("button", { name: /download csv/i })).toBeTruthy();
  });

  it("triggers a browser download when the artifact is downloaded", async () => {
    vi.mocked(fetchExportDeliveries).mockResolvedValue(page([delivery()]));
    vi.mocked(downloadExport).mockResolvedValue({
      blob: new Blob(["a,b,c"], { type: "text/csv" }),
      filename: "responses-launch.csv",
    });

    const createObjectURL = vi.fn().mockReturnValue("blob:mock");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    renderWithQuery(<ExportsClient slug="launchpad" />);

    const downloadBtn = await screen.findByRole("button", {
      name: /download csv/i,
    });
    await userEvent.click(downloadBtn);

    await waitFor(() => {
      expect(downloadExport).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        "del_1",
      );
      expect(createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });

    clickSpy.mockRestore();
  });

  it("queues a new export from the header action", async () => {
    vi.mocked(fetchExportDeliveries).mockResolvedValue(page([delivery()]));
    vi.mocked(createCsvExport).mockResolvedValue(delivery({ id: "del_new" }));

    renderWithQuery(<ExportsClient slug="launchpad" />);

    await screen.findByText("responses-launch.csv");
    await userEvent.click(
      screen.getByRole("button", { name: /export responses/i }),
    );

    await waitFor(() => {
      expect(createCsvExport).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        undefined,
      );
      expect(toastSuccess).toHaveBeenCalled();
    });
  });

  it("hides the download action for failed deliveries and shows the error", async () => {
    vi.mocked(fetchExportDeliveries).mockResolvedValue(
      page([
        delivery({
          id: "del_fail",
          status: "FAILED",
          artifactAssetId: null,
          error: "Upstream storage timeout",
          payload: {},
        }),
      ]),
    );

    renderWithQuery(<ExportsClient slug="launchpad" />);

    expect(await screen.findByText("Upstream storage timeout")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /download csv/i })).toBeNull();
  });
});
