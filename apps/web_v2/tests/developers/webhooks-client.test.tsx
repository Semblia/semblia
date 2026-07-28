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

// The active tab lives in the URL so a refresh, a bookmark, and the back
// button all reproduce the same view. jsdom mounts no app router, so the
// navigation hooks are stubbed with a params object the tests can seed.
const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  params: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  usePathname: () => "/launchpad/developers/webhooks",
  useSearchParams: () => nav.params,
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

/** Open the surface directly on the deliveries view, as a shared link would. */
function openDeliveriesView() {
  nav.params = new URLSearchParams("view=deliveries");
}

describe("WebhooksClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.params = new URLSearchParams();
    vi.mocked(fetchOutboundWebhookDeliveries).mockResolvedValue(page([]));
  });

  it("renders an empty state when there are no endpoints", async () => {
    vi.mocked(fetchOutboundWebhookEndpoints).mockResolvedValue([]);

    renderWithQuery(<WebhooksClient slug="launchpad" />);

    expect(await screen.findByText("No endpoints yet")).toBeTruthy();
  });

  it("renders an error surface, not an empty state, when endpoints can't be loaded", async () => {
    vi.mocked(fetchOutboundWebhookEndpoints).mockRejectedValue(
      new Error("network down"),
    );

    renderWithQuery(<WebhooksClient slug="launchpad" />);

    expect(
      await screen.findByText("Couldn't load your webhook endpoints"),
    ).toBeTruthy();
    expect(screen.queryByText("No endpoints yet")).toBeNull();
  });

  it("lists endpoints with status and management actions", async () => {
    vi.mocked(fetchOutboundWebhookEndpoints).mockResolvedValue([endpoint()]);

    renderWithQuery(<WebhooksClient slug="launchpad" />);

    expect(await screen.findByText("Production listener")).toBeTruthy();
    expect(
      screen.getByText("https://example.com/webhooks/semblia"),
    ).toBeTruthy();
    // One badge per row, Title Case, never the raw enum.
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.queryByText("active")).toBeNull();
    expect(screen.getByRole("button", { name: /edit endpoint/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /rotate secret/i })).toBeTruthy();
  });

  it("offers no management actions on a revoked endpoint and says why", async () => {
    vi.mocked(fetchOutboundWebhookEndpoints).mockResolvedValue([
      endpoint({ status: "REVOKED" }),
    ]);

    renderWithQuery(<WebhooksClient slug="launchpad" />);

    await screen.findByText("Production listener");
    expect(screen.getByText("Revoked")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /edit endpoint/i })).toBeNull();
    expect(
      screen.getByText(/revoked endpoints are kept for the record/i),
    ).toBeTruthy();
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
    await userEvent.click(
      screen.getByRole("button", { name: /revoke endpoint/i }),
    );

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

  it("records the active tab in the URL so the view survives a refresh", async () => {
    vi.mocked(fetchOutboundWebhookEndpoints).mockResolvedValue([endpoint()]);

    renderWithQuery(<WebhooksClient slug="launchpad" />);

    await screen.findByText("Production listener");
    await userEvent.click(screen.getByRole("tab", { name: /deliveries/i }));

    await waitFor(() => {
      expect(nav.replace).toHaveBeenCalledWith(
        "/launchpad/developers/webhooks?view=deliveries",
        { scroll: false },
      );
    });
  });

  it("lists failed deliveries on the Deliveries view and retries them", async () => {
    openDeliveriesView();
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

    expect(await screen.findByText("Receiver returned 500")).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", { name: /retry delivery/i }),
    );

    await waitFor(() => {
      expect(retryOutboundWebhookDelivery).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        "whd_fail",
      );
    });
  });

  it("blocks retry with a stated reason when the endpoint can no longer receive", async () => {
    openDeliveriesView();
    vi.mocked(fetchOutboundWebhookEndpoints).mockResolvedValue([
      endpoint({ status: "REVOKED" }),
    ]);
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

    renderWithQuery(<WebhooksClient slug="launchpad" />);

    const retryButton = await screen.findByRole("button", {
      name: /retry delivery/i,
    });
    expect(retryButton.hasAttribute("disabled")).toBe(true);
    // The reason is on screen, not only in a tooltip on a dead control.
    expect(
      screen.getByText(/this endpoint is disabled or revoked/i),
    ).toBeTruthy();
    expect(retryOutboundWebhookDelivery).not.toHaveBeenCalled();
  });

  it("renders the pagination affordance from the API envelope", async () => {
    openDeliveriesView();
    vi.mocked(fetchOutboundWebhookEndpoints).mockResolvedValue([endpoint()]);
    vi.mocked(fetchOutboundWebhookDeliveries).mockResolvedValue(
      page([delivery()], { total: 142, totalPages: 8, hasNext: true }),
    );

    renderWithQuery(<WebhooksClient slug="launchpad" />);

    // The range, not "Page 1 of 8" — the reader has to know how many exist.
    expect(await screen.findByText("1–20 of 142")).toBeTruthy();
    expect(
      screen.getByRole("navigation", { name: /pagination/i }),
    ).toBeTruthy();
  });
});
