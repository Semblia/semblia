import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  V2OutboundWebhookEndpointDTO,
  V2CreatedOutboundWebhookEndpointDTO,
  V2OutboundWebhookDeliveryDTO,
  V2PaginatedResponse,
} from "@workspace/types";
import {
  fetchOutboundWebhookEndpoints,
  fetchOutboundWebhookDeliveries,
  rotateOutboundWebhookSecret,
  revokeOutboundWebhookEndpoint,
  retryOutboundWebhookDelivery,
} from "@/lib/semblia-api";
import { WebhooksClient } from "@/components/developers/webhooks/webhooks-client";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/lib/semblia-api", () => ({
  fetchOutboundWebhookEndpoints: vi.fn(),
  fetchOutboundWebhookEndpoint: vi.fn(),
  createOutboundWebhookEndpoint: vi.fn(),
  updateOutboundWebhookEndpoint: vi.fn(),
  disableOutboundWebhookEndpoint: vi.fn(),
  revokeOutboundWebhookEndpoint: vi.fn(),
  rotateOutboundWebhookSecret: vi.fn(),
  fetchOutboundWebhookDeliveries: vi.fn(),
  fetchOutboundWebhookDelivery: vi.fn(),
  retryOutboundWebhookDelivery: vi.fn(),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

function endpoint(
  overrides: Partial<V2OutboundWebhookEndpointDTO> = {},
): V2OutboundWebhookEndpointDTO {
  return {
    id: "ep_1",
    projectId: "proj_1",
    name: "Production listener",
    url: "https://example.com/webhooks/semblia",
    subscribedEvents: ["submission.created"],
    status: "ACTIVE",
    lastSuccessAt: "2026-06-04T10:00:00.000Z",
    lastFailureAt: null,
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-04T10:00:00.000Z",
    ...overrides,
  };
}

function delivery(
  overrides: Partial<V2OutboundWebhookDeliveryDTO> = {},
): V2OutboundWebhookDeliveryDTO {
  return {
    id: "whd_1",
    endpointId: "ep_1",
    projectId: "proj_1",
    eventType: "submission.created",
    payload: {},
    status: "SUCCEEDED",
    attempts: 1,
    nextAttemptAt: null,
    responseStatus: 200,
    responseBodySnippet: null,
    error: null,
    createdAt: "2026-06-04T10:10:00.000Z",
    updatedAt: "2026-06-04T10:11:00.000Z",
    ...overrides,
  };
}

function page(
  items: V2OutboundWebhookDeliveryDTO[],
  overrides: Partial<V2PaginatedResponse<V2OutboundWebhookDeliveryDTO>> = {},
): V2PaginatedResponse<V2OutboundWebhookDeliveryDTO> {
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

describe("WebhooksClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchOutboundWebhookDeliveries).mockResolvedValue(page([]));
  });

  it("renders an empty state when there are no endpoints", async () => {
    vi.mocked(fetchOutboundWebhookEndpoints).mockResolvedValue([]);

    renderWithQuery(<WebhooksClient slug="launchpad" />);

    expect(await screen.findByText("No endpoints yet")).toBeTruthy();
  });

  it("lists endpoints with status and management actions", async () => {
    vi.mocked(fetchOutboundWebhookEndpoints).mockResolvedValue([endpoint()]);

    renderWithQuery(<WebhooksClient slug="launchpad" />);

    expect(await screen.findByText("Production listener")).toBeTruthy();
    expect(
      screen.getByText("https://example.com/webhooks/semblia"),
    ).toBeTruthy();
    expect(screen.getByText("active")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^edit$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /rotate secret/i })).toBeTruthy();
  });

  it("rotates the signing secret and reveals it once", async () => {
    vi.mocked(fetchOutboundWebhookEndpoints).mockResolvedValue([endpoint()]);
    vi.mocked(rotateOutboundWebhookSecret).mockResolvedValue({
      ...endpoint(),
      signingSecret: "whsec_rotated_value",
    } as V2CreatedOutboundWebhookEndpointDTO);

    renderWithQuery(<WebhooksClient slug="launchpad" />);

    await screen.findByText("Production listener");
    await userEvent.click(
      screen.getByRole("button", { name: /rotate secret/i }),
    );

    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: /rotate secret/i }),
    );

    await waitFor(() => {
      expect(rotateOutboundWebhookSecret).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        "ep_1",
      );
    });
    expect(await screen.findByText("whsec_rotated_value")).toBeTruthy();
  });

  it("revokes an endpoint after confirmation", async () => {
    vi.mocked(fetchOutboundWebhookEndpoints).mockResolvedValue([endpoint()]);
    vi.mocked(revokeOutboundWebhookEndpoint).mockResolvedValue(
      endpoint({ status: "REVOKED" }),
    );

    renderWithQuery(<WebhooksClient slug="launchpad" />);

    await screen.findByText("Production listener");
    await userEvent.click(screen.getByRole("button", { name: /^revoke$/i }));

    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: /revoke endpoint/i }),
    );

    await waitFor(() => {
      expect(revokeOutboundWebhookEndpoint).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        "ep_1",
      );
    });
  });

  it("lists failed deliveries on the Deliveries tab and retries them", async () => {
    vi.mocked(fetchOutboundWebhookEndpoints).mockResolvedValue([endpoint()]);
    vi.mocked(fetchOutboundWebhookDeliveries).mockResolvedValue(
      page([
        delivery({
          id: "whd_fail",
          status: "FAILED",
          attempts: 3,
          responseStatus: 500,
          error: "Receiver returned 500",
        }),
      ]),
    );
    vi.mocked(retryOutboundWebhookDelivery).mockResolvedValue(
      delivery({ id: "whd_fail", status: "PENDING" }),
    );

    renderWithQuery(<WebhooksClient slug="launchpad" />);

    await userEvent.click(screen.getByRole("tab", { name: /deliveries/i }));

    expect(await screen.findByText("Receiver returned 500")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /^retry$/i }));

    await waitFor(() => {
      expect(retryOutboundWebhookDelivery).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        "whd_fail",
      );
    });
  });
});
