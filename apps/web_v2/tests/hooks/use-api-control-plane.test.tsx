import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  useAnalyticsSummary,
  useDuplicateForm,
  useDuplicateWidget,
  useExportDeliveries,
  useCurrentOrganization,
  useIntegrationConnections,
  useNotificationsList,
  useOutboundWebhookEndpoints,
  usePublicSurfaceResolution,
} from "@/hooks/api";
import {
  duplicateForm,
  duplicateWidget,
  fetchAnalyticsSummary,
  fetchExportDeliveries,
  fetchCurrentOrganization,
  fetchIntegrationConnections,
  fetchNotifications,
  fetchOutboundWebhookEndpoints,
  resolvePublicSurface,
} from "@/lib/tresta-api";
import { queryKeys } from "@/hooks/api/keys";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/lib/tresta-api", () => ({
  duplicateForm: vi.fn(),
  duplicateWidget: vi.fn(),
  fetchAnalyticsSummary: vi.fn(),
  fetchExportDeliveries: vi.fn(),
  fetchCurrentOrganization: vi.fn(),
  fetchIntegrationConnections: vi.fn(),
  fetchNotifications: vi.fn(),
  fetchOutboundWebhookEndpoints: vi.fn(),
  resolvePublicSurface: vi.fn(),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("control-plane API hooks", () => {
  it("loads the current organization through the typed v2 client", async () => {
    vi.mocked(fetchCurrentOrganization).mockResolvedValue({
      active: true,
      organization: {
        id: "org_1",
        clerkOrgId: "org_clerk_1",
        name: "Launchpad",
        slug: "launchpad",
        createdAt: "2026-05-14T00:00:00.000Z",
        updatedAt: "2026-05-14T00:00:00.000Z",
      },
      clerk: {
        orgId: "org_clerk_1",
        orgSlug: "launchpad",
        orgRole: "admin",
      },
    });

    const { result } = renderHook(() => useCurrentOrganization(), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data?.active).toBe(true));
    expect(fetchCurrentOrganization).toHaveBeenCalledWith("session-token");
  });

  it("loads notifications through the typed v2 client", async () => {
    vi.mocked(fetchNotifications).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    const { result } = renderHook(
      () => useNotificationsList({ isRead: false }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data?.items).toEqual([]));
    expect(fetchNotifications).toHaveBeenCalledWith("session-token", {
      isRead: false,
    });
  });

  it("loads analytics summaries through the typed v2 client", async () => {
    vi.mocked(fetchAnalyticsSummary).mockResolvedValue({
      range: {
        days: 7,
        since: "2026-05-07",
        until: "2026-05-14",
      },
      totals: {
        formViews: 0,
        formSubmissions: 0,
        widgetLoads: 0,
        testimonialImpressions: 0,
        hostedPageViews: 0,
        apiRequests: 0,
        publishedTestimonials: 0,
      },
      daily: [],
    });

    const { result } = renderHook(
      () => useAnalyticsSummary("launchpad", { days: 7 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data?.range.days).toBe(7));
    expect(fetchAnalyticsSummary).toHaveBeenCalledWith(
      "session-token",
      "launchpad",
      {
        days: 7,
      },
    );
  });

  it("loads public surface resolution without requiring Clerk auth", async () => {
    vi.mocked(resolvePublicSurface).mockResolvedValue({
      id: "surface_1",
      hostname: "launchpad.tresta.app",
      feature: "WALL",
      resourceType: "PROJECT",
      resourceId: null,
      isDefault: true,
      canonicalUrl: "https://launchpad.tresta.app",
      project: {
        id: "project_1",
        slug: "launchpad",
        name: "Launchpad",
        logo: null,
        brandColorPrimary: null,
        brandColorSecondary: null,
        websiteUrl: null,
      },
      endpoints: {
        forms: null,
        responses: null,
        wall: "/v2/public/widgets/wall",
      },
      walls: [],
    });

    const { result } = renderHook(
      () =>
        usePublicSurfaceResolution({
          hostname: "launchpad.tresta.app",
          feature: "WALL",
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data?.feature).toBe("WALL"));
    expect(resolvePublicSurface).toHaveBeenCalledWith({
      hostname: "launchpad.tresta.app",
      feature: "WALL",
    });
  });

  it("loads integration and delivery surfaces through typed project hooks", async () => {
    vi.mocked(fetchIntegrationConnections).mockResolvedValue([]);
    vi.mocked(fetchOutboundWebhookEndpoints).mockResolvedValue([]);
    vi.mocked(fetchExportDeliveries).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    const integrations = renderHook(
      () => useIntegrationConnections("launchpad"),
      { wrapper },
    );
    const webhooks = renderHook(
      () => useOutboundWebhookEndpoints("launchpad"),
      { wrapper },
    );
    const exports = renderHook(
      () => useExportDeliveries("launchpad", { status: "FAILED" }),
      { wrapper },
    );

    await waitFor(() => expect(integrations.result.current.data).toEqual([]));
    await waitFor(() => expect(webhooks.result.current.data).toEqual([]));
    await waitFor(() => expect(exports.result.current.data?.items).toEqual([]));

    expect(fetchIntegrationConnections).toHaveBeenCalledWith(
      "session-token",
      "launchpad",
    );
    expect(fetchOutboundWebhookEndpoints).toHaveBeenCalledWith(
      "session-token",
      "launchpad",
    );
    expect(fetchExportDeliveries).toHaveBeenCalledWith(
      "session-token",
      "launchpad",
      { status: "FAILED" },
    );
  });

  it("duplicates forms through the typed project hook and refreshes the form list", async () => {
    const invalidateSpy = vi.spyOn(QueryClient.prototype, "invalidateQueries");
    vi.mocked(duplicateForm).mockResolvedValue({
      id: "form_copy",
      projectId: "project_1",
      entry: {
        id: "form_copy",
        name: "Default Form (copy)",
        description: "Primary form",
        isActive: false,
        abWeight: 0,
        createdAt: "2026-05-16T00:00:00.000Z",
        updatedAt: "2026-05-16T00:00:00.000Z",
        submissions: 0,
        views: 0,
        responseRate: 0,
        avgRating: 0,
        lastSubmissionAt: null,
      },
      config: { content: { headerTitle: "Hello" } },
    });

    const { result } = renderHook(() => useDuplicateForm("launchpad"), {
      wrapper,
    });

    result.current.mutate("form_123");

    await waitFor(() => expect(result.current.data?.id).toBe("form_copy"));
    expect(duplicateForm).toHaveBeenCalledWith(
      "session-token",
      "launchpad",
      "form_123",
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.forms.list("launchpad"),
    });
    invalidateSpy.mockRestore();
  });

  it("duplicates widgets through the typed project hook and refreshes the widget list", async () => {
    const invalidateSpy = vi.spyOn(QueryClient.prototype, "invalidateQueries");
    vi.mocked(duplicateWidget).mockResolvedValue({
      id: "widget_copy",
      projectId: "project_1",
      entry: {
        id: "widget_copy",
        name: "Proof Widget (copy)",
        widgetType: "EMBED",
        layoutType: "CAROUSEL",
        themeMode: "LIGHT",
        preset: "clean",
        createdAt: "2026-05-17T00:00:00.000Z",
        updatedAt: "2026-05-17T00:00:00.000Z",
        totalLoads: 0,
        avgLoadMs: 0,
        lastLoadAt: null,
        isActive: false,
      },
      config: {
        name: "Proof Widget (copy)",
        widgetType: "EMBED",
        layoutType: "CAROUSEL",
        themeMode: "LIGHT",
        tokens: {
          preset: "clean",
          accentColor: "#111111",
          bgColor: "#ffffff",
          textColor: "#111111",
          borderRadius: 12,
          fontFamily: '"Geist", system-ui, sans-serif',
          cardStyle: "BORDERED",
          density: "DEFAULT",
        },
        visibility: {
          showRating: true,
          showAvatar: true,
          showCompany: true,
          showDate: false,
          showSource: false,
        },
        behavior: {
          maxItems: 9,
          autoRotate: true,
          rotateInterval: 5000,
          showBranding: true,
        },
        wall: null,
      },
    });

    const { result } = renderHook(() => useDuplicateWidget("launchpad"), {
      wrapper,
    });

    result.current.mutate("widget_123");

    await waitFor(() => expect(result.current.data?.id).toBe("widget_copy"));
    expect(duplicateWidget).toHaveBeenCalledWith(
      "session-token",
      "launchpad",
      "widget_123",
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.widgets.list("launchpad"),
    });
    invalidateSpy.mockRestore();
  });
});
