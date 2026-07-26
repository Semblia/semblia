import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  V2ImportCatalogSourceDTO,
  V2ImportConnectionDTO,
  V2ImportProviderResourcePageDTO,
} from "@workspace/types";
import { ConnectedImportDialog } from "@/components/imports/connected-import-dialog";

const mocks = vi.hoisted(() => ({
  createExternalAccount: vi.fn(),
  reauthorize: vi.fn(),
  user: null as unknown,
  connections: [] as V2ImportConnectionDTO[],
  resources: {
    items: [],
    nextCursor: null,
  } as V2ImportProviderResourcePageDTO,
  moreResources: {
    items: [],
    nextCursor: null,
  } as V2ImportProviderResourcePageDTO,
  refetchConnections: vi.fn(),
  refetchResources: vi.fn(),
  connectionsPending: false,
  connectionsError: false,
  resourcesPending: false,
  resourcesError: false,
  createConnectionPending: false,
  createConnection: vi.fn(),
  updateConnection: vi.fn(),
  syncConnection: vi.fn(),
  enableConnection: vi.fn(),
  disableConnection: vi.fn(),
  deleteConnection: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isLoaded: true, user: mocks.user }),
  useReverification: (callback: (...args: never[]) => unknown) => callback,
}));

function mutation(fn: ReturnType<typeof vi.fn>) {
  return {
    mutateAsync: fn,
    reset: vi.fn(),
    isPending: fn === mocks.createConnection && mocks.createConnectionPending,
    isError: false,
  };
}

vi.mock("@/hooks/api", () => ({
  useImportConnections: () => ({
    data: mocks.connections,
    isSuccess: !mocks.connectionsPending && !mocks.connectionsError,
    isPending: mocks.connectionsPending,
    isFetching: mocks.connectionsPending,
    isError: mocks.connectionsError,
    refetch: mocks.refetchConnections,
  }),
  useImportProviderResources: (input: { params?: { cursor?: string } }) => ({
    data: input.params?.cursor ? mocks.moreResources : mocks.resources,
    isPending: mocks.resourcesPending,
    isFetching: mocks.resourcesPending,
    isError: mocks.resourcesError,
    refetch: mocks.refetchResources,
  }),
  useCreateImportConnection: () => mutation(mocks.createConnection),
  useUpdateImportConnection: () => mutation(mocks.updateConnection),
  useSyncImportConnection: () => mutation(mocks.syncConnection),
  useEnableImportConnection: () => mutation(mocks.enableConnection),
  useDisableImportConnection: () => mutation(mocks.disableConnection),
  useDeleteImportConnection: () => mutation(mocks.deleteConnection),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

function source(
  overrides: Partial<V2ImportCatalogSourceDTO> = {},
): V2ImportCatalogSourceDTO {
  return {
    key: "x",
    label: "X",
    group: "Connected social",
    modes: ["CONNECTED_API"],
    availability: "AVAILABLE",
    reasonCode: null,
    reason: null,
    publicHosts: [],
    publicHostSuffixes: [],
    oauthStrategy: "oauth_x",
    requiredScopes: ["tweet.read", "users.read"],
    ...overrides,
  };
}

function externalAccount(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    provider: "x",
    approvedScopes: "tweet.read users.read",
    verification: { status: "verified" },
    reauthorize: mocks.reauthorize,
    ...overrides,
  };
}

function clerkUser(accounts: Record<string, unknown>[] = []) {
  return {
    externalAccounts: accounts,
    createExternalAccount: mocks.createExternalAccount,
  };
}

function connection(
  overrides: Partial<V2ImportConnectionDTO> = {},
): V2ImportConnectionDTO {
  return {
    id: "connection_1",
    projectId: "project_1",
    sourceKey: "x",
    authStrategy: "CLERK_OAUTH",
    publicUrl: null,
    resourceId: "profile_1",
    resourceLabel: "Anubhab on X",
    enabled: true,
    autoSyncEnabled: true,
    lastSyncedAt: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    createdAt: "2026-07-22T10:00:00.000Z",
    updatedAt: "2026-07-22T10:00:00.000Z",
    ...overrides,
  };
}

function renderDialog(sourceValue = source()) {
  return render(
    <ConnectedImportDialog
      slug="launchpad"
      source={sourceValue}
      open
      onOpenChange={vi.fn()}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = null;
  mocks.connections = [];
  mocks.resources = { items: [], nextCursor: null };
  mocks.moreResources = { items: [], nextCursor: null };
  mocks.connectionsPending = false;
  mocks.connectionsError = false;
  mocks.resourcesPending = false;
  mocks.resourcesError = false;
  mocks.createConnectionPending = false;
  mocks.createExternalAccount.mockResolvedValue({
    verification: {
      externalVerificationRedirectURL: new URL("https://accounts.example.test"),
    },
  });
  mocks.reauthorize.mockResolvedValue({
    verification: {
      externalVerificationRedirectURL: new URL("https://accounts.example.test"),
    },
  });
  mocks.createConnection.mockResolvedValue({ id: "connection_1" });
  mocks.updateConnection.mockResolvedValue({ id: "connection_1" });
  mocks.syncConnection.mockResolvedValue({ id: "job_1" });
  mocks.enableConnection.mockResolvedValue({ id: "connection_1" });
  mocks.disableConnection.mockResolvedValue({ id: "connection_1" });
  mocks.deleteConnection.mockResolvedValue({ id: "connection_1" });
  window.history.replaceState({}, "", "/imports/launchpad");
});

describe("ConnectedImportDialog", () => {
  it("starts a new Clerk OAuth connection with the exact provider strategy, scopes, and current redirect", async () => {
    const user = userEvent.setup();
    mocks.user = clerkUser();

    renderDialog();
    await user.click(screen.getByRole("button", { name: "Authorize X" }));

    await waitFor(() =>
      expect(mocks.createExternalAccount).toHaveBeenCalledWith({
        strategy: "oauth_x",
        additionalScopes: ["tweet.read", "users.read"],
        redirectUrl: window.location.href,
      }),
    );
  });

  it("reauthorizes the matching Clerk account when its approved scopes are insufficient", async () => {
    const user = userEvent.setup();
    const account = externalAccount({ approvedScopes: "tweet.read" });
    mocks.user = clerkUser([account]);

    renderDialog();
    await user.click(screen.getByRole("button", { name: "Reauthorize X" }));

    await waitFor(() =>
      expect(mocks.reauthorize).toHaveBeenCalledWith({
        additionalScopes: ["tweet.read", "users.read"],
        redirectUrl: window.location.href,
      }),
    );
    expect(mocks.createExternalAccount).not.toHaveBeenCalled();
  });

  it("discovers Google Play apps and creates a rights-confirmed connection with the chosen sync setting", async () => {
    const user = userEvent.setup();
    mocks.user = clerkUser([
      externalAccount({
        provider: "google",
        approvedScopes: "business.manage",
      }),
    ]);
    mocks.resources = {
      items: [{ id: "app:com.semblia", label: "Semblia for Android" }],
      nextCursor: null,
    };

    renderDialog(
      source({
        key: "google-play",
        label: "Google Play",
        group: "Connected reviews",
        oauthStrategy: "oauth_google",
        requiredScopes: ["business.manage"],
      }),
    );

    expect(await screen.findByText("Authorized")).toBeTruthy();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Connect Google Play" }),
      ).toBeTruthy(),
    );
    expect(
      screen
        .getByRole("button", { name: "Connect Google Play" })
        .getAttribute("disabled"),
    ).toBe("");

    await user.click(
      screen.getByRole("switch", { name: "Enable automatic sync" }),
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: /I confirm I have the right to import/i,
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Connect Google Play" }),
    );

    await waitFor(() =>
      expect(mocks.createConnection).toHaveBeenCalledWith({
        sourceKey: "google-play",
        resourceId: "app:com.semblia",
        rightsConfirmed: true,
        autoSyncEnabled: false,
      }),
    );
  });

  it("accumulates provider resource pages before connecting", async () => {
    const user = userEvent.setup();
    mocks.user = clerkUser([externalAccount()]);
    mocks.resources = {
      items: [{ id: "profile_1", label: "Primary profile" }],
      nextCursor: "next-page",
    };
    mocks.moreResources = {
      items: [{ id: "profile_2", label: "Secondary profile" }],
      nextCursor: null,
    };

    renderDialog();
    await user.click(screen.getByRole("button", { name: "Load more" }));

    await waitFor(() =>
      expect(screen.getByText("Secondary profile")).toBeTruthy(),
    );
  });

  it("continues past an empty provider page when a next cursor exists", async () => {
    const user = userEvent.setup();
    mocks.user = clerkUser([externalAccount()]);
    mocks.resources = { items: [], nextCursor: "next-page" };
    mocks.moreResources = {
      items: [{ id: "profile_2", label: "Secondary profile" }],
      nextCursor: null,
    };

    renderDialog();
    await user.click(
      screen.getByRole("button", { name: "Continue to next page" }),
    );

    expect(await screen.findAllByText("Secondary profile")).not.toHaveLength(0);
  });

  it("retries the connection list after a load failure", async () => {
    const user = userEvent.setup();
    mocks.connectionsError = true;

    renderDialog();
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(mocks.refetchConnections).toHaveBeenCalledOnce();
  });

  it("prevents dismissing a connection while creation is in flight", () => {
    mocks.user = clerkUser([externalAccount()]);
    mocks.resources = {
      items: [{ id: "profile_1", label: "Primary profile" }],
      nextCursor: null,
    };
    mocks.createConnectionPending = true;

    renderDialog();

    expect(
      screen
        .getByRole("button", { name: "Back to sources" })
        .getAttribute("disabled"),
    ).toBe("");
    expect(
      screen.getByRole("button", { name: "Cancel" }).getAttribute("disabled"),
    ).toBe("");
  });

  it("syncs, pauses, updates automatic sync, and confirms removal inline for an active connection", async () => {
    const user = userEvent.setup();
    mocks.user = clerkUser([externalAccount()]);
    mocks.connections = [connection()];

    renderDialog();
    await user.click(screen.getByRole("button", { name: "Sync now" }));
    await waitFor(() =>
      expect(mocks.syncConnection).toHaveBeenCalledWith("connection_1"),
    );

    await user.click(
      screen.getByRole("switch", {
        name: "Automatic sync for Anubhab on X",
      }),
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
    expect(
      screen.getByText(/Syncing stops, but imported proof stays/i),
    ).toBeTruthy();
    expect(mocks.deleteConnection).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Remove connection" }));
    await waitFor(() =>
      expect(mocks.deleteConnection).toHaveBeenCalledWith("connection_1"),
    );
  });

  it("offers Enable for paused connections", async () => {
    const user = userEvent.setup();
    mocks.user = clerkUser([externalAccount()]);
    mocks.connections = [
      connection({ enabled: false, autoSyncEnabled: false }),
    ];

    renderDialog();
    await user.click(screen.getByRole("button", { name: "Enable" }));

    await waitFor(() =>
      expect(mocks.enableConnection).toHaveBeenCalledWith("connection_1"),
    );
  });
});
