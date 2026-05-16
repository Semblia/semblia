import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createOutboundWebhookEndpoint,
  duplicateForm,
  fetchAnalyticsSummary,
  fetchNotifications,
  recordHostedPageViewEvent,
  resolvePublicSurface,
} from "@/lib/tresta-api";

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

describe("tresta-api control-plane contracts", () => {
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

  it("fetches project analytics summaries through the authenticated project route", async () => {
    await fetchAnalyticsSummary("session-token", "launchpad", { days: 7 });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8100/v2/projects/launchpad/analytics/summary?days=7",
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
      hostname: "launchpad.tresta.app",
      feature: "WALL",
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8100/v2/public-surfaces/resolve?hostname=launchpad.tresta.app&feature=WALL",
      expect.any(Object),
    );
  });

  it("creates outbound webhook endpoints through the signed-delivery contract", async () => {
    await createOutboundWebhookEndpoint("session-token", "launchpad", {
      name: "Production events",
      url: "https://example.com/tresta",
      subscribedEvents: ["testimonial.published"],
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8100/v2/projects/launchpad/outbound-webhooks",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Production events",
          url: "https://example.com/tresta",
          subscribedEvents: ["testimonial.published"],
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
      }),
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
});
