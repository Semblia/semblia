import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { V2IntegrationConnectionDTO } from "@workspace/types";
import {
  fetchIntegrationConnections,
  fetchIntegrationResources,
  createIntegrationConnection,
  enableIntegrationConnection,
  revokeIntegrationConnection,
  disableIntegrationConnection,
  createNativeIntegrationExport,
} from "@/lib/semblia-api";
import { IntegrationsClient } from "@/components/developers/integrations/integrations-client";

const clerkMocks = vi.hoisted(() => ({
  createExternalAccount: vi.fn(),
  externalAccounts: [] as Array<{ provider: string }>,
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
  useUser: () => ({
    isLoaded: true,
    user: {
      externalAccounts: clerkMocks.externalAccounts,
      createExternalAccount: clerkMocks.createExternalAccount,
    },
  }),
  useReverification: (callback: unknown) => callback,
}));

vi.mock("@/lib/semblia-api", () => ({
  fetchIntegrationConnections: vi.fn(),
  fetchIntegrationResources: vi.fn(),
  createIntegrationConnection: vi.fn(),
  updateIntegrationConnection: vi.fn(),
  enableIntegrationConnection: vi.fn(),
  revokeIntegrationConnection: vi.fn(),
  disableIntegrationConnection: vi.fn(),
  createNativeIntegrationExport: vi.fn(),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

function connection(
  overrides: Partial<V2IntegrationConnectionDTO> = {},
): V2IntegrationConnectionDTO {
  return {
    id: "conn_1",
    projectId: "proj_1",
    provider: "SLACK",
    authStrategy: "CLERK_OAUTH",
    connectedByUserId: "user_1",
    clerkProvider: "slack",
    externalAccountId: null,
    status: "ACTIVE",
    scopes: [],
    config: { channelId: "C0123456789" },
    lastCheckedAt: null,
    createdAt: "2026-06-04T10:10:00.000Z",
    updatedAt: "2026-06-04T10:10:00.000Z",
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

describe("IntegrationsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clerkMocks.externalAccounts = [{ provider: "slack" }];
  });

  it("lists every provider and says nothing is connected yet", async () => {
    vi.mocked(fetchIntegrationConnections).mockResolvedValue([]);

    renderWithQuery(<IntegrationsClient slug="launchpad" />);

    expect(await screen.findByText(/nothing connected yet/i)).toBeTruthy();
    // Every provider Semblia implements stays listed, available or not.
    expect(screen.getByText("Slack")).toBeTruthy();
    expect(screen.getByText("Notion")).toBeTruthy();
    expect(screen.getByText("Linear")).toBeTruthy();
    expect(screen.getByText("GitHub")).toBeTruthy();
  });

  it("renders an error surface, not an empty state, when connections can't be read", async () => {
    vi.mocked(fetchIntegrationConnections).mockRejectedValue(
      new Error("network down"),
    );

    renderWithQuery(<IntegrationsClient slug="launchpad" />);

    expect(
      await screen.findByText("Couldn't load your integrations"),
    ).toBeTruthy();
    expect(screen.queryByText(/nothing connected yet/i)).toBeNull();
  });

  it("states in place that a provider without a configured OAuth app can't be connected", async () => {
    vi.mocked(fetchIntegrationConnections).mockResolvedValue([]);

    renderWithQuery(<IntegrationsClient slug="launchpad" />);

    await screen.findByText("Slack");

    // Slack's OAuth app is not configured on Semblia's Clerk instance: it must
    // say so in plain language and offer no control that would fail.
    expect(
      screen.getByText(/semblia's slack app isn't set up yet/i),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /connect slack/i })).toBeNull();
    expect(screen.getAllByText("Not available yet").length).toBeGreaterThan(0);

    // GitHub is configured, so it is offered.
    expect(
      screen.getByRole("button", { name: /connect github/i }),
    ).toBeTruthy();
  });

  it("lists a connection with its destination summary", async () => {
    vi.mocked(fetchIntegrationConnections).mockResolvedValue([connection()]);

    renderWithQuery(<IntegrationsClient slug="launchpad" />);

    expect(await screen.findByText("#C0123456789")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /edit destination/i }),
    ).toBeTruthy();
  });

  // GitHub is the one provider whose OAuth app is configured today, so it is
  // the only one whose connect flow can be exercised end to end.
  it("starts provider OAuth when the user has not connected that product", async () => {
    clerkMocks.externalAccounts = [];
    vi.mocked(fetchIntegrationConnections).mockResolvedValue([]);
    clerkMocks.createExternalAccount.mockResolvedValue({
      verification: {
        externalVerificationRedirectURL: {
          href: "https://github.com/login/oauth",
        },
      },
    });

    renderWithQuery(<IntegrationsClient slug="launchpad" />);

    await userEvent.click(
      await screen.findByRole("button", { name: /connect github/i }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: /authorize github/i }),
    );

    await waitFor(() => {
      expect(clerkMocks.createExternalAccount).toHaveBeenCalledWith({
        strategy: "oauth_github",
        additionalScopes: ["repo"],
        redirectUrl: expect.any(String),
      });
    });
  });

  it("connects a provider through an OAuth-discovered resource choice", async () => {
    clerkMocks.externalAccounts = [{ provider: "github" }];
    vi.mocked(fetchIntegrationConnections).mockResolvedValue([]);
    vi.mocked(fetchIntegrationResources).mockResolvedValue({
      provider: "GITHUB",
      items: [
        {
          id: "semblia/semblia",
          provider: "GITHUB",
          label: "semblia/semblia",
          config: { owner: "semblia", repo: "semblia" },
          metadata: { isPrivate: false },
        },
      ],
      nextCursor: null,
    });
    vi.mocked(createIntegrationConnection).mockResolvedValue(
      connection({
        provider: "GITHUB",
        config: { owner: "semblia", repo: "semblia" },
      }),
    );

    renderWithQuery(<IntegrationsClient slug="launchpad" />);

    await userEvent.click(
      await screen.findByRole("button", { name: /connect github/i }),
    );
    // The destination list is a real radio group, so the choice is a radio.
    await userEvent.click(
      await screen.findByRole("radio", { name: "semblia/semblia" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /^connect github$/i }),
    );

    await waitFor(() => {
      expect(fetchIntegrationResources).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        "GITHUB",
        undefined,
      );
      expect(createIntegrationConnection).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        {
          provider: "GITHUB",
          scopes: ["repo"],
          config: { owner: "semblia", repo: "semblia" },
        },
      );
    });
  });

  it("sends a test export for an active connection", async () => {
    vi.mocked(fetchIntegrationConnections).mockResolvedValue([connection()]);
    vi.mocked(createNativeIntegrationExport).mockResolvedValue({} as never);

    renderWithQuery(<IntegrationsClient slug="launchpad" />);

    await screen.findByText("#C0123456789");
    await userEvent.click(screen.getByRole("button", { name: /send test/i }));

    await waitFor(() => {
      expect(createNativeIntegrationExport).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        "conn_1",
        expect.objectContaining({ eventType: "submission.created" }),
      );
    });
  });

  it("disables a connection after confirmation", async () => {
    vi.mocked(fetchIntegrationConnections).mockResolvedValue([connection()]);
    vi.mocked(disableIntegrationConnection).mockResolvedValue(
      connection({ status: "DISABLED" }),
    );

    renderWithQuery(<IntegrationsClient slug="launchpad" />);

    await screen.findByText("#C0123456789");
    await userEvent.click(
      screen.getByRole("button", { name: /disable connection/i }),
    );

    // Confirm in the dialog.
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: /disable connection/i }),
    );

    await waitFor(() => {
      expect(disableIntegrationConnection).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        "conn_1",
      );
    });
  });

  it("re-enables a disabled connection and can revoke it", async () => {
    vi.mocked(fetchIntegrationConnections).mockResolvedValue([
      connection({ status: "DISABLED" }),
    ]);
    vi.mocked(enableIntegrationConnection).mockResolvedValue(connection());
    vi.mocked(revokeIntegrationConnection).mockResolvedValue(
      connection({ status: "REVOKED" }),
    );

    renderWithQuery(<IntegrationsClient slug="launchpad" />);

    await screen.findByText("#C0123456789");
    await userEvent.click(
      screen.getByRole("button", { name: /enable connection/i }),
    );

    await waitFor(() => {
      expect(enableIntegrationConnection).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        "conn_1",
      );
    });

    await userEvent.click(
      screen.getByRole("button", { name: /revoke connection/i }),
    );
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: /revoke connection/i }),
    );

    await waitFor(() => {
      expect(revokeIntegrationConnection).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        "conn_1",
      );
    });
  });
});
