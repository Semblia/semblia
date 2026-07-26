import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  V2ImportCatalogSourceDTO,
  V2ImportConnectionDTO,
  V2SpreadsheetImportPreviewDTO,
  V2UploadIntentDTO,
} from "@workspace/types";
import { DirectImportDialog } from "@/components/imports/direct-import-dialog";
import { SpreadsheetImportDialog } from "@/components/imports/spreadsheet-import-dialog";
import { previewSpreadsheetImport } from "@/lib/imports/import-api";

const mocks = vi.hoisted(() => ({
  createIntent: vi.fn(),
  confirmUpload: vi.fn(),
  deleteAsset: vi.fn(),
  createSpreadsheet: vi.fn(),
  createManual: vi.fn(),
  createPublic: vi.fn(),
  createMigration: vi.fn(),
  createConnection: vi.fn(),
  updateConnection: vi.fn(),
  syncConnection: vi.fn(),
  enableConnection: vi.fn(),
  disableConnection: vi.fn(),
  deleteConnection: vi.fn(),
  connections: [] as V2ImportConnectionDTO[],
  manualPending: false,
  connectionPending: false,
  publicError: false,
  connectionError: false,
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue("session-token") }),
}));

vi.mock("@/hooks/api", () => ({
  useCreateUploadIntent: () => mutation(mocks.createIntent),
  useConfirmUpload: () => mutation(mocks.confirmUpload),
  useDeleteMediaAsset: () => mutation(mocks.deleteAsset),
  useCreateManualImport: () => mutation(mocks.createManual),
  useCreatePublicUrlImport: () => mutation(mocks.createPublic),
  useCreateMigrationImport: () => mutation(mocks.createMigration),
  useImportConnections: () => ({ data: mocks.connections }),
  useCreateImportConnection: () => mutation(mocks.createConnection),
  useUpdateImportConnection: () => mutation(mocks.updateConnection),
  useSyncImportConnection: () => mutation(mocks.syncConnection),
  useEnableImportConnection: () => mutation(mocks.enableConnection),
  useDisableImportConnection: () => mutation(mocks.disableConnection),
  useDeleteImportConnection: () => mutation(mocks.deleteConnection),
}));

vi.mock("@/hooks/api/use-imports-api", () => ({
  useCreateSpreadsheetImport: () => mutation(mocks.createSpreadsheet),
}));

vi.mock("@/lib/imports/import-api", () => ({
  previewSpreadsheetImport: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

function mutation(fn: ReturnType<typeof vi.fn>) {
  return {
    mutateAsync: fn,
    reset: vi.fn(),
    isPending:
      (fn === mocks.createManual && mocks.manualPending) ||
      (fn === mocks.createConnection && mocks.connectionPending),
    isError:
      (fn === mocks.createPublic && mocks.publicError) ||
      (fn === mocks.createConnection && mocks.connectionError),
  };
}

function source(overrides: Partial<V2ImportCatalogSourceDTO> = {}) {
  return {
    key: "spreadsheet",
    label: "CSV, XLS, XLSX",
    group: "Files",
    modes: ["SPREADSHEET"],
    availability: "AVAILABLE",
    reasonCode: null,
    reason: null,
    publicHosts: [],
    publicHostSuffixes: [],
    oauthStrategy: null,
    requiredScopes: [],
    ...overrides,
  } as V2ImportCatalogSourceDTO;
}

function intent(): V2UploadIntentDTO {
  return {
    assetId: "asset_1",
    uploadUrl: "https://uploads.example.test/import.csv",
    storageKey: "projects/project_1/imports/asset_1.csv",
    expiresAt: "2026-07-22T10:10:00.000Z",
    requiredHeaders: { "x-upload-token": "opaque" },
  };
}

function preview(): V2SpreadsheetImportPreviewDTO {
  return {
    sheets: [
      {
        selected: true,
        name: "Responses",
        headers: ["Testimonial", "Author", "Rating"],
        samples: [["A very helpful product", "Avery", 5]],
        rowCount: 1,
      },
    ],
  };
}

function multiSheetPreview(
  selected: "Responses" | "Archive",
): V2SpreadsheetImportPreviewDTO {
  return {
    sheets: [
      selected === "Responses"
        ? {
            selected: true,
            name: "Responses",
            headers: ["Testimonial", "Author", "Rating"],
            samples: [["A very helpful product", "Avery", 5]],
            rowCount: 1,
          }
        : { selected: false, name: "Responses" },
      selected === "Archive"
        ? {
            selected: true,
            name: "Archive",
            headers: ["Quote", "Customer"],
            samples: [["Still useful", "Jordan"]],
            rowCount: 1,
          }
        : { selected: false, name: "Archive" },
    ],
  };
}

function renderDirectImport(input: {
  source: V2ImportCatalogSourceDTO;
  mode: "MANUAL" | "PUBLIC_URL" | "MIGRATION";
}) {
  render(
    <DirectImportDialog
      slug="launchpad"
      source={input.source}
      mode={input.mode}
      open
      onOpenChange={vi.fn()}
    />,
  );
}

function redditPublicSource() {
  return source({
    key: "reddit",
    label: "Reddit",
    modes: ["PUBLIC_URL"],
  });
}

function expectDismissControlsDisabled() {
  for (const name of ["Back to sources", "Cancel"])
    expect(screen.getByRole("button", { name }).getAttribute("disabled")).toBe(
      "",
    );
}

class SuccessfulUploadXhr {
  static instances: SuccessfulUploadXhr[] = [];
  status = 200;
  method?: string;
  url?: string;
  headers: Record<string, string> = {};
  timeout = 0;
  private listeners = new Map<string, () => void>();

  constructor() {
    SuccessfulUploadXhr.instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(key: string, value: string) {
    this.headers[key] = value;
  }

  addEventListener(name: string, listener: () => void) {
    this.listeners.set(name, listener);
  }

  send() {
    queueMicrotask(() => this.listeners.get("load")?.());
  }
}

const realXhr = globalThis.XMLHttpRequest;
const realScrollIntoView = Element.prototype.scrollIntoView;

beforeEach(() => {
  vi.clearAllMocks();
  SuccessfulUploadXhr.instances = [];
  globalThis.XMLHttpRequest =
    SuccessfulUploadXhr as unknown as typeof XMLHttpRequest;
  Element.prototype.scrollIntoView = vi.fn();
  mocks.createIntent.mockResolvedValue(intent());
  mocks.confirmUpload.mockResolvedValue({ id: "asset_1" });
  mocks.deleteAsset.mockResolvedValue({ id: "asset_1" });
  mocks.createSpreadsheet.mockResolvedValue({ id: "job_1" });
  mocks.createManual.mockResolvedValue({ id: "job_1" });
  mocks.createPublic.mockResolvedValue({ id: "job_1" });
  mocks.createMigration.mockResolvedValue({ id: "job_1" });
  mocks.createConnection.mockResolvedValue({ id: "connection_1" });
  mocks.updateConnection.mockResolvedValue({ id: "connection_1" });
  mocks.syncConnection.mockResolvedValue({ id: "job_1" });
  mocks.enableConnection.mockResolvedValue({ id: "connection_1" });
  mocks.disableConnection.mockResolvedValue({ id: "connection_1" });
  mocks.deleteConnection.mockResolvedValue({ id: "connection_1" });
  mocks.connections = [];
  mocks.manualPending = false;
  mocks.connectionPending = false;
  mocks.publicError = false;
  mocks.connectionError = false;
  vi.mocked(previewSpreadsheetImport).mockResolvedValue(preview());
});

afterEach(() => {
  globalThis.XMLHttpRequest = realXhr;
  if (realScrollIntoView) Element.prototype.scrollIntoView = realScrollIntoView;
  else Reflect.deleteProperty(Element.prototype, "scrollIntoView");
});

describe("SpreadsheetImportDialog", () => {
  it("derives CSV MIME from the filename and completes intent, PUT, confirm, and preview in order", async () => {
    const user = userEvent.setup();
    render(
      <SpreadsheetImportDialog
        slug="launchpad"
        source={source()}
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.upload(
      screen.getByLabelText("Spreadsheet"),
      new File(["Testimonial,Author\nGreat,Avery"], "proof.csv", {
        type: "application/pdf",
      }),
    );

    await waitFor(() =>
      expect(previewSpreadsheetImport).toHaveBeenCalledWith({
        token: "session-token",
        slug: "launchpad",
        assetId: "asset_1",
      }),
    );
    expect(mocks.createIntent).toHaveBeenCalledWith({
      purpose: "IMPORT_SOURCE",
      projectSlug: "launchpad",
      fileName: "proof.csv",
      contentType: "text/csv",
      byteSize: 30,
    });
    expect(SuccessfulUploadXhr.instances).toHaveLength(1);
    expect(SuccessfulUploadXhr.instances[0]).toMatchObject({
      method: "PUT",
      url: "https://uploads.example.test/import.csv",
      headers: { "x-upload-token": "opaque" },
    });
    expect(mocks.confirmUpload).toHaveBeenCalledWith({
      assetId: "asset_1",
      body: { byteSize: 30 },
    });
    expect(mocks.createIntent.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.confirmUpload.mock.invocationCallOrder[0],
    );
    expect(mocks.confirmUpload.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(previewSpreadsheetImport).mock.invocationCallOrder[0],
    );
  });

  it("deletes a confirmed source asset when its initial preview fails", async () => {
    const user = userEvent.setup();
    vi.mocked(previewSpreadsheetImport).mockRejectedValueOnce(
      new Error("preview unavailable"),
    );
    render(
      <SpreadsheetImportDialog
        slug="launchpad"
        source={source()}
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.upload(
      screen.getByLabelText("Spreadsheet"),
      new File(["x"], "proof.xlsx", { type: "text/plain" }),
    );

    await waitFor(() =>
      expect(mocks.deleteAsset).toHaveBeenCalledWith("asset_1"),
    );
    expect(await screen.findByText("Spreadsheet preview failed.")).toBeTruthy();
  });

  it("deletes a confirmed source asset when the workflow is abandoned", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <SpreadsheetImportDialog
        slug="launchpad"
        source={source()}
        open
        onOpenChange={onOpenChange}
      />,
    );

    await user.upload(
      screen.getByLabelText("Spreadsheet"),
      new File(["x"], "proof.csv", { type: "text/plain" }),
    );
    await screen.findByText("Match columns");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() =>
      expect(mocks.deleteAsset).toHaveBeenCalledWith("asset_1"),
    );
  });

  it("deletes a confirmed source asset when sidebar navigation unmounts the workflow", async () => {
    const user = userEvent.setup();
    const view = render(
      <SpreadsheetImportDialog
        slug="launchpad"
        source={source()}
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.upload(
      screen.getByLabelText("Spreadsheet"),
      new File(["Testimonial\nGreat"], "proof.csv", { type: "text/csv" }),
    );
    await screen.findByText("Match columns");

    view.unmount();

    await waitFor(() =>
      expect(mocks.deleteAsset).toHaveBeenCalledWith("asset_1"),
    );
  });

  it("previews a selected sheet through the shared client and ignores changes after the asset is cleared", async () => {
    const user = userEvent.setup();
    vi.mocked(previewSpreadsheetImport).mockImplementation(async (request) =>
      multiSheetPreview(
        request.sheetName === "Archive" ? "Archive" : "Responses",
      ),
    );
    render(
      <SpreadsheetImportDialog
        slug="launchpad"
        source={source()}
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.upload(
      screen.getByLabelText("Spreadsheet"),
      new File(["x"], "proof.xlsx", { type: "application/octet-stream" }),
    );
    const sheetSelect = await screen.findByRole("combobox", { name: "Sheet" });
    sheetSelect.focus();
    await user.keyboard("{Enter}{ArrowDown}{Enter}");

    await waitFor(() =>
      expect(previewSpreadsheetImport).toHaveBeenLastCalledWith({
        token: "session-token",
        slug: "launchpad",
        assetId: "asset_1",
        sheetName: "Archive",
      }),
    );
    await screen.findByText("First 1 rows from Archive.");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(mocks.deleteAsset).toHaveBeenCalledWith("asset_1"),
    );

    expect(previewSpreadsheetImport).toHaveBeenCalledTimes(2);
    sheetSelect.focus();
    await user.keyboard("{Enter}{ArrowUp}{Enter}");
    expect(previewSpreadsheetImport).toHaveBeenCalledTimes(2);
  });

  it("requires rights confirmation and sends the selected column mapping", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <SpreadsheetImportDialog
        slug="launchpad"
        source={source()}
        open
        onOpenChange={onOpenChange}
      />,
    );

    await user.upload(
      screen.getByLabelText("Spreadsheet"),
      new File(["x"], "proof.csv", { type: "application/pdf" }),
    );
    await screen.findByText("Match columns");
    expect(
      screen
        .getByRole("button", { name: "Start import" })
        .getAttribute("disabled"),
    ).toBe("");

    await user.click(
      screen.getByRole("checkbox", {
        name: /I have the right to import this proof/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Start import" }));

    await waitFor(() =>
      expect(mocks.createSpreadsheet).toHaveBeenCalledWith({
        assetId: "asset_1",
        sourceKey: "spreadsheet",
        mapping: {
          sheetName: "Responses",
          text: "Testimonial",
          authorName: "Author",
          ratingValue: "Rating",
        },
        rightsConfirmed: true,
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("DirectImportDialog", () => {
  it("prevents dismissing a direct import while it is being queued", () => {
    mocks.manualPending = true;
    renderDirectImport({
      source: source({ key: "manual", label: "Manual proof" }),
      mode: "MANUAL",
    });
    expectDismissControlsDisabled();
  });

  it("prevents dismissing while a public connection is being created", () => {
    mocks.connectionPending = true;
    renderDirectImport({ source: redditPublicSource(), mode: "PUBLIC_URL" });
    expectDismissControlsDisabled();
  });

  it("uses an accessible rights label and submits complete manual proof payloads", async () => {
    const user = userEvent.setup();
    render(
      <DirectImportDialog
        slug="launchpad"
        source={source({
          key: "manual",
          label: "Manual proof",
          modes: ["MANUAL"],
        })}
        mode="MANUAL"
        open
        onOpenChange={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/^Proof/), "Useful proof");
    await user.type(screen.getByLabelText("Author name"), "Avery");
    await user.type(screen.getByLabelText("Rating out of 5"), "5");
    await user.type(
      screen.getByLabelText("Original source URL (optional)"),
      "https://example.test/proof",
    );
    expect(
      screen
        .getByRole("button", { name: "Import proof" })
        .getAttribute("disabled"),
    ).toBe("");
    await user.click(
      screen.getByRole("checkbox", { name: /I confirm I have the right/i }),
    );
    await user.click(screen.getByRole("button", { name: "Import proof" }));

    await waitFor(() =>
      expect(mocks.createManual).toHaveBeenCalledWith({
        sourceKey: "manual",
        text: "Useful proof",
        authorName: "Avery",
        authorRole: undefined,
        authorCompany: undefined,
        ratingValue: 5,
        ratingScale: 5,
        sourceUrl: "https://example.test/proof",
        rightsConfirmed: true,
      }),
    );
  });

  it("rejects ratings outside zero to five and accepts zero", async () => {
    const user = userEvent.setup();
    renderDirectImport({
      source: source({
        key: "manual",
        label: "Manual proof",
        modes: ["MANUAL"],
      }),
      mode: "MANUAL",
    });

    await user.type(screen.getByLabelText(/^Proof/), "Useful proof");
    await user.click(
      screen.getByRole("checkbox", { name: /I confirm I have the right/i }),
    );
    const ratingInput = screen.getByLabelText("Rating out of 5");
    expect(ratingInput.getAttribute("min")).toBe("0");
    expect(ratingInput.getAttribute("max")).toBe("5");
    expect(ratingInput.getAttribute("step")).toBe("any");

    await user.type(ratingInput, "6");
    expect(screen.getByRole("alert").textContent).toContain(
      "Enter a number from 0 to 5.",
    );
    expect(
      screen
        .getByRole("button", { name: "Import proof" })
        .getAttribute("disabled"),
    ).toBe("");
    expect(mocks.createManual).not.toHaveBeenCalled();

    await user.clear(ratingInput);
    await user.type(ratingInput, "0");
    await user.click(screen.getByRole("button", { name: "Import proof" }));

    await waitFor(() =>
      expect(mocks.createManual).toHaveBeenCalledWith({
        sourceKey: "manual",
        text: "Useful proof",
        authorName: undefined,
        authorRole: undefined,
        authorCompany: undefined,
        ratingValue: 0,
        ratingScale: 5,
        sourceUrl: undefined,
        rightsConfirmed: true,
      }),
    );
  });

  it("sends public URLs through the public import path only after rights confirmation", async () => {
    const user = userEvent.setup();
    renderDirectImport({ source: redditPublicSource(), mode: "PUBLIC_URL" });

    await user.type(
      screen.getByLabelText(/^Public URL/),
      "https://reddit.com/r/example",
    );
    expect(
      screen
        .getByRole("button", { name: "Import proof" })
        .getAttribute("disabled"),
    ).toBe("");
    await user.click(
      screen.getByRole("checkbox", { name: /I confirm I have the right/i }),
    );
    await user.click(screen.getByRole("button", { name: "Import proof" }));

    await waitFor(() =>
      expect(mocks.createPublic).toHaveBeenCalledWith({
        sourceKey: "reddit",
        sourceUrl: "https://reddit.com/r/example",
        rightsConfirmed: true,
      }),
    );
    expect(mocks.createManual).not.toHaveBeenCalled();
    expect(mocks.createMigration).not.toHaveBeenCalled();
  });

  it("creates a six-hour public connection instead of a one-time import", async () => {
    const user = userEvent.setup();
    renderDirectImport({ source: redditPublicSource(), mode: "PUBLIC_URL" });

    await user.type(
      screen.getByLabelText(/^Public URL/),
      "https://reddit.com/r/example",
    );
    await user.click(
      screen.getByRole("switch", {
        name: "Keep this source in sync every 6 hours",
      }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: /I confirm I have the right/i }),
    );
    await user.click(screen.getByRole("button", { name: "Create connection" }));

    await waitFor(() =>
      expect(mocks.createConnection).toHaveBeenCalledWith({
        sourceKey: "reddit",
        sourceUrl: "https://reddit.com/r/example",
        mode: "PUBLIC_URL",
        rightsConfirmed: true,
        autoSyncEnabled: true,
      }),
    );
    expect(mocks.createPublic).not.toHaveBeenCalled();
  });

  it("shows only the error for the currently selected URL behavior", async () => {
    const user = userEvent.setup();
    mocks.connectionError = true;
    render(
      <DirectImportDialog
        slug="launchpad"
        source={source({
          key: "reddit",
          label: "Reddit",
          modes: ["PUBLIC_URL"],
        })}
        mode="PUBLIC_URL"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole("alert")).toBeNull();
    const autoSync = screen.getByRole("switch", {
      name: "Keep this source in sync every 6 hours",
    });
    await user.click(autoSync);
    expect(screen.getByRole("alert").textContent).toContain(
      "connection could not be created",
    );
    await user.click(autoSync);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("manages an existing public connection inline", async () => {
    const user = userEvent.setup();
    mocks.connections = [
      {
        id: "connection_1",
        projectId: "project_1",
        sourceKey: "reddit",
        authStrategy: "PUBLIC_URL",
        resourceId: "https://reddit.com/r/example",
        resourceLabel: "Reddit",
        publicUrl: "https://reddit.com/r/example",
        enabled: true,
        autoSyncEnabled: true,
        lastSyncedAt: "2026-07-22T10:00:00.000Z",
        lastErrorCode: "FETCH_FAILED",
        lastErrorMessage: "The source could not be reached.",
        createdAt: "2026-07-22T10:00:00.000Z",
        updatedAt: "2026-07-22T10:00:00.000Z",
      } as V2ImportConnectionDTO,
    ];
    render(
      <DirectImportDialog
        slug="launchpad"
        source={source({
          key: "reddit",
          label: "Reddit",
          modes: ["PUBLIC_URL"],
        })}
        mode="PUBLIC_URL"
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(await screen.findByText("Existing connections")).toBeTruthy();
    expect(screen.getByText("https://reddit.com/r/example")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(
      "could not be reached",
    );

    await user.click(screen.getByRole("button", { name: "Sync now" }));
    await waitFor(() =>
      expect(mocks.syncConnection).toHaveBeenCalledWith("connection_1"),
    );
    await user.click(
      screen.getByRole("switch", { name: "Automatic sync for Reddit" }),
    );
    await waitFor(() =>
      expect(mocks.updateConnection).toHaveBeenCalledWith({
        autoSyncEnabled: false,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Pause" }));
    await waitFor(() =>
      expect(mocks.disableConnection).toHaveBeenCalledWith("connection_1"),
    );
    await user.click(screen.getByRole("button", { name: "Remove" }));
    await user.click(screen.getByRole("button", { name: "Remove connection" }));
    await waitFor(() =>
      expect(mocks.deleteConnection).toHaveBeenCalledWith("connection_1"),
    );
  });
});
