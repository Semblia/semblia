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
import { ImportManualClient } from "@/components/imports/import-manual-client";
import { ImportWebClient } from "@/components/imports/import-web-client";
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
  push: vi.fn(),
  catalog: [] as V2ImportCatalogSourceDTO[],
  connections: [] as V2ImportConnectionDTO[],
  manualPending: false,
  connectionPending: false,
  publicError: false,
  connectionError: false,
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue("session-token") }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/api", () => ({
  useImportCatalog: () => catalogQuery(mocks.catalog),
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

/**
 * The exact query slice `useDataState` reads (see
 * components/shared/data-state.tsx QueryLike) — resolved and ready, so the
 * method pages render their forms immediately.
 */
function catalogQuery(data: V2ImportCatalogSourceDTO[]) {
  return {
    data,
    dataUpdatedAt: Date.now(),
    error: null,
    isError: false,
    isFetching: false,
    isPending: false,
    isRefetching: false,
    refetch: vi.fn(),
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

function manualSource() {
  return source({
    key: "manual",
    label: "Manual text proof",
    group: "Direct",
    modes: ["MANUAL"],
  });
}

function redditPublicSource() {
  return source({
    key: "reddit",
    label: "Reddit",
    modes: ["PUBLIC_URL"],
    publicHosts: ["www.reddit.com"],
  });
}

function defaultCatalog(): V2ImportCatalogSourceDTO[] {
  return [
    manualSource(),
    source({
      key: "slack",
      label: "Slack",
      group: "Manual-only/private",
      modes: ["MANUAL"],
      availability: "MANUAL_ONLY",
    }),
    source({
      key: "whatsapp",
      label: "WhatsApp",
      group: "Manual-only/private",
      modes: ["MANUAL"],
      availability: "MANUAL_ONLY",
    }),
    redditPublicSource(),
    source({
      key: "producthunt",
      label: "Product Hunt",
      modes: ["PUBLIC_URL"],
      publicHosts: ["www.producthunt.com"],
    }),
  ];
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

/**
 * The web method now opens on its source picker, so every test that exercises
 * the form has to name a source first — which is the flow the page is for.
 */
async function renderWebFormFor(
  user: ReturnType<typeof userEvent.setup>,
  sourceName = "Reddit",
) {
  render(<ImportWebClient slug="launchpad" />);
  await user.click(await screen.findByRole("button", { name: sourceName }));
  await screen.findByLabelText(/^Public URL/);
}

/** The method pages are pages, not dialogs — the only dismiss is Cancel. */
function expectDismissControlsDisabled() {
  expect(
    screen.getByRole("button", { name: "Cancel" }).getAttribute("disabled"),
  ).toBe("");
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
  mocks.catalog = defaultCatalog();
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
      screen.getByLabelText(/Drop a spreadsheet/),
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
      screen.getByLabelText(/Drop a spreadsheet/),
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
      screen.getByLabelText(/Drop a spreadsheet/),
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
      screen.getByLabelText(/Drop a spreadsheet/),
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
      screen.getByLabelText(/Drop a spreadsheet/),
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
      screen.getByLabelText(/Drop a spreadsheet/),
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

describe("import method pages", () => {
  it("prevents dismissing a manual import while it is being queued", () => {
    mocks.manualPending = true;
    render(<ImportManualClient slug="launchpad" />);
    expectDismissControlsDisabled();
  });

  it("prevents dismissing while a public connection is being created", async () => {
    mocks.connectionPending = true;
    await renderWebFormFor(userEvent.setup());
    expectDismissControlsDisabled();
  });

  it("opens on a searchable source grid and only then shows the form", async () => {
    const user = userEvent.setup();
    render(<ImportWebClient slug="launchpad" />);

    // The form is gated behind the choice — no URL field before a source.
    expect(screen.queryByLabelText(/^Public URL/)).toBeNull();
    expect(screen.getByRole("button", { name: "Reddit" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Product Hunt" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Product Hunt" }));
    expect(await screen.findByLabelText(/^Public URL/)).toBeTruthy();

    // And the choice is reversible, or it would be a trap.
    await user.click(screen.getByRole("button", { name: "Change source" }));
    expect(await screen.findByRole("button", { name: "Reddit" })).toBeTruthy();
    expect(screen.queryByLabelText(/^Public URL/)).toBeNull();
  });

  it("uses an accessible rights label and submits complete manual proof payloads", async () => {
    const user = userEvent.setup();
    render(<ImportManualClient slug="launchpad" />);

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
    render(<ImportManualClient slug="launchpad" />);

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
    await renderWebFormFor(user);

    await user.type(
      screen.getByLabelText(/^Public URL/),
      "https://www.reddit.com/r/example",
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
        sourceUrl: "https://www.reddit.com/r/example",
        rightsConfirmed: true,
      }),
    );
    expect(mocks.createManual).not.toHaveBeenCalled();
    expect(mocks.createMigration).not.toHaveBeenCalled();
  });

  it("offers the switch when the pasted link belongs to another source", async () => {
    const user = userEvent.setup();
    await renderWebFormFor(user);
    const urlInput = screen.getByLabelText(/^Public URL/);

    // A URL no source claims says nothing — silence beats a wrong guess.
    await user.type(urlInput, "https://unknown.example/reviews");
    expect(screen.queryByText(/That link looks like/)).toBeNull();

    // A URL on the chosen source's own host is simply correct.
    await user.clear(urlInput);
    await user.type(urlInput, "https://www.reddit.com/r/x");
    expect(screen.queryByText(/That link looks like/)).toBeNull();

    // A URL belonging to a *different* source is named, not silently applied:
    // the link may be wrong or the source may be, and only the user knows.
    await user.clear(urlInput);
    await user.type(urlInput, "https://www.producthunt.com/posts/x");
    expect(
      await screen.findByText("That link looks like Product Hunt."),
    ).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Import as Product Hunt" }),
    );
    await waitFor(() =>
      expect(screen.queryByText(/That link looks like/)).toBeNull(),
    );
    // The URL survives the switch — retyping it would be the trap.
    expect(
      (screen.getByLabelText(/^Public URL/) as HTMLInputElement).value,
    ).toBe("https://www.producthunt.com/posts/x");
  });

  it("creates a six-hour public connection instead of a one-time import", async () => {
    const user = userEvent.setup();
    await renderWebFormFor(user);

    await user.type(
      screen.getByLabelText(/^Public URL/),
      "https://www.reddit.com/r/example",
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
        sourceUrl: "https://www.reddit.com/r/example",
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
    await renderWebFormFor(user);

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
        resourceId: "https://www.reddit.com/r/example",
        resourceLabel: "Reddit",
        publicUrl: "https://www.reddit.com/r/example",
        enabled: true,
        autoSyncEnabled: true,
        lastSyncedAt: "2026-07-22T10:00:00.000Z",
        lastErrorCode: "FETCH_FAILED",
        lastErrorMessage: "The source could not be reached.",
        createdAt: "2026-07-22T10:00:00.000Z",
        updatedAt: "2026-07-22T10:00:00.000Z",
      } as V2ImportConnectionDTO,
    ];
    await renderWebFormFor(user);

    expect(await screen.findByText("Existing connections")).toBeTruthy();
    expect(screen.getByText("https://www.reddit.com/r/example")).toBeTruthy();
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
