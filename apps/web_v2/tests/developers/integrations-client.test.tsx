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

  it("renders an empty state and provider cards when nothing is connected", async () => {
    vi.mocked(fetchIntegrationConnections).mockResolvedValue([]);

    renderWithQuery(<IntegrationsClient slug="launchpad" />);

    expect(await screen.findByText("No integrations connected")).toBeTruthy();
    // All four provider connect cards are offered.
    expect(screen.getByText("Slack")).toBeTruthy();
    expect(screen.getByText("Notion")).toBeTruthy();
    expect(screen.getByText("Linear")).toBeTruthy();
    expect(screen.getByText("GitHub")).toBeTruthy();
  });

  it("lists a connection with its destination summary", async () => {
    vi.mocked(fetchIntegrationConnections).mockResolvedValue([connection()]);

    renderWithQuery(<IntegrationsClient slug="launchpad" />);

    expect(await screen.findByText("#C0123456789")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /edit destination/i }),
    ).toBeTruthy();
  });

  it("starts provider OAuth when the user has not connected that product", async () => {
    clerkMocks.externalAccounts = [];
    vi.mocked(fetchIntegrationConnections).mockResolvedValue([]);
    clerkMocks.createExternalAccount.mockResolvedValue({
      verification: {
        externalVerificationRedirectURL: {
          href: "https://slack.com/oauth",
        },
      },
    });

    renderWithQuery(<IntegrationsClient slug="launchpad" />);

    await screen.findByText("No integrations connected");
    await userEvent.click(screen.getByText("Slack"));
    await userEvent.click(
      await screen.findByRole("button", { name: /authorize slack/i }),
    );

    await waitFor(() => {
      expect(clerkMocks.createExternalAccount).toHaveBeenCalledWith({
        strategy: "oauth_slack",
        additionalScopes: ["chat:write", "channels:read", "groups:read"],
        redirectUrl: expect.any(String),
      });
    });
  });

  it("connects a provider through an OAuth-discovered resource choice", async () => {
    vi.mocked(fetchIntegrationConnections).mockResolvedValue([]);
    vi.mocked(fetchIntegrationResources).mockResolvedValue({
      provider: "SLACK",
      items: [
        {
          id: "C9999999999",
          provider: "SLACK",
          label: "customer-love",
          config: { channelId: "C9999999999" },
          metadata: { isPrivate: false },
        },
      ],
      nextCursor: null,
    });
    vi.mocked(createIntegrationConnection).mockResolvedValue(
      connection({ config: { channelId: "C9999999999" } }),
    );

    renderWithQuery(<IntegrationsClient slug="launchpad" />);

    await screen.findByText("No integrations connected");

    await userEvent.click(screen.getByText("Slack"));
    await userEvent.click(await screen.findByText("customer-love"));
    await userEvent.click(
      screen.getByRole("button", { name: /connect slack/i }),
    );

    await waitFor(() => {
      expect(fetchIntegrationResources).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        "SLACK",
        undefined,
      );
      expect(createIntegrationConnection).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        {
          provider: "SLACK",
          scopes: ["chat:write", "channels:read", "groups:read"],
          config: { channelId: "C9999999999" },
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
    await userEvent.click(screen.getByRole("button", { name: /^disable$/i }));

    // Confirm in the dialog.
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: /^disable$/i }),
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
    await userEvent.click(screen.getByRole("button", { name: /^enable$/i }));

    await waitFor(() => {
      expect(enableIntegrationConnection).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        "conn_1",
      );
    });

    await userEvent.click(screen.getByRole("button", { name: /^revoke$/i }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: /^revoke$/i }),
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
