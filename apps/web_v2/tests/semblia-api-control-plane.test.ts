import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptProjectTransfer,
  cancelProjectOwnershipTransfer,
  createSubscriptionCheckout,
  createOutboundWebhookEndpoint,
  duplicateForm,
  duplicateWidget,
  fetchMyProjectTransfers,
  fetchProjectOwnershipTransfer,
  fetchNotifications,
  initiateProjectOwnershipTransfer,
  recordHostedPageViewEvent,
  resolvePublicSurface,
} from "@/lib/semblia-api";

const responseMeta = { timestamp: "2026-05-14T00:00:00.000Z" };

function mockEnvelope<T>(data: T) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      success: true,
      data,
      meta: responseMeta,
    }),
  } as unknown as Response;
}

describe("semblia-api control-plane contracts", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockEnvelope({})));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches notifications with typed pagination filters", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockEnvelope({
        items: [],
        total: 0,
        page: 2,
        pageSize: 5,
        totalPages: 1,
        hasNext: false,
        hasPrev: true,
      }),
    );

    await fetchNotifications("session-token", {
      page: 2,
      pageSize: 5,
      isRead: false,
      type: "SECURITY_ALERT",
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8100/v2/notifications?page=2&pageSize=5&isRead=false&type=SECURITY_ALERT",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
      }),
    );
  });

  it("records public hosted-page analytics without an auth header", async () => {
    await recordHostedPageViewEvent({
      projectSlug: "launchpad",
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8100/v2/analytics/events/hosted-page-view",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ projectSlug: "launchpad" }),
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
        }),
      }),
    );
  });

  it("resolves public surfaces through the public host resolver", async () => {
    await resolvePublicSurface({
      hostname: "launchpad.semblia.com",
      feature: "WALL",
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8100/v2/public-surfaces/resolve?hostname=launchpad.semblia.com&feature=WALL",
      expect.any(Object),
    );
  });

  it("creates outbound webhook endpoints through the signed-delivery contract", async () => {
    await createOutboundWebhookEndpoint("session-token", "launchpad", {
      name: "Production events",
      url: "https://example.com/semblia",
      subscribedEvents: ["submission.moderated"],
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8100/v2/projects/launchpad/outbound-webhooks",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Production events",
          url: "https://example.com/semblia",
          subscribedEvents: ["submission.moderated"],
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
      }),
    );
  });

  it("creates Razorpay subscription checkout sessions through the account route", async () => {
    await createSubscriptionCheckout("session-token", "PRO");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8100/v2/account/subscription/checkout",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          planId: "PRO",
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
      }),
    );
  });

  it("uses the project ownership transfer handshake routes", async () => {
    await fetchProjectOwnershipTransfer("session-token", "launchpad");
    await initiateProjectOwnershipTransfer("session-token", "launchpad", {
      toUserId: "user_2",
      confirmName: "Launchpad",
    });
    await cancelProjectOwnershipTransfer("session-token", "launchpad");
    await fetchMyProjectTransfers("session-token");
    await acceptProjectTransfer("session-token", "transfer_1");

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8100/v2/projects/launchpad/ownership-transfer",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8100/v2/projects/launchpad/ownership-transfer",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          toUserId: "user_2",
          confirmName: "Launchpad",
        }),
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      "http://localhost:8100/v2/projects/launchpad/ownership-transfer",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      4,
      "http://localhost:8100/v2/me/project-transfers",
      expect.any(Object),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      5,
      "http://localhost:8100/v2/me/project-transfers/transfer_1/accept",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("duplicates collection forms through the project-scoped duplicate route", async () => {
    await duplicateForm("session-token", "launchpad", "form_123");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8100/v2/projects/launchpad/forms/form_123/duplicate",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
      }),
    );
    expect(init?.body).toBeUndefined();
  });

  it("duplicates widgets through the project-scoped duplicate route", async () => {
    await duplicateWidget("session-token", "launchpad", "widget_123");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8100/v2/projects/launchpad/widgets/widget_123/duplicate",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
      }),
    );
    expect(init?.body).toBeUndefined();
  });
});
