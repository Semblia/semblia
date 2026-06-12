import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type {
  V2NotificationDTO,
  V2NotificationPreferencesDTO,
  V2PaginatedResponse,
} from "@workspace/types";
import { NotificationBell } from "@/components/nav/notification-bell";
import { NotificationsClient } from "@/components/notifications/notifications-client";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/tresta-api";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/lib/tresta-api", () => ({
  fetchNotifications: vi.fn(),
  fetchUnreadNotificationCount: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  fetchNotificationPreferences: vi.fn(),
  updateNotificationPreferences: vi.fn(),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function notification(
  overrides: Partial<V2NotificationDTO> = {},
): V2NotificationDTO {
  return {
    id: "notif_1",
    userId: "user_1",
    type: "SUBMISSION_CREATED",
    title: "New feedback arrived",
    message: "Ada submitted feedback for Launchpad.",
    link: "/projects/launchpad/responses",
    metadata: null,
    isRead: false,
    createdAt: "2026-05-14T12:00:00.000Z",
    ...overrides,
  };
}

function paginated(
  items: V2NotificationDTO[],
): V2PaginatedResponse<V2NotificationDTO> {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };
}

const preferences: V2NotificationPreferencesDTO = {
  userId: "user_1",
  emailEnabled: true,
  typePreferences: {},
  updatedAt: "2026-05-14T12:00:00.000Z",
};

describe("live notifications surfaces", () => {
  it("loads the notification bell from live notification hooks", async () => {
    vi.mocked(fetchNotifications).mockResolvedValueOnce(
      paginated([notification()]),
    );
    vi.mocked(fetchUnreadNotificationCount).mockResolvedValueOnce({
      count: 1,
    });

    render(<NotificationBell />, { wrapper });

    await waitFor(() =>
      expect(fetchNotifications).toHaveBeenCalledWith("session-token", {
        pageSize: 5,
      }),
    );
    expect(fetchUnreadNotificationCount).toHaveBeenCalledWith("session-token");
    expect(
      await screen.findByRole("button", { name: "1 unread notification" }),
    ).toBeTruthy();

    await userEvent.click(screen.getByRole("button"));
    expect(await screen.findByText("New feedback arrived")).toBeTruthy();
  });

  it("renders the account notifications page from live notification hooks", async () => {
    const item = notification();
    vi.mocked(fetchNotifications).mockResolvedValueOnce(paginated([item]));
    vi.mocked(fetchUnreadNotificationCount).mockResolvedValueOnce({
      count: 1,
    });
    vi.mocked(fetchNotificationPreferences).mockResolvedValueOnce(preferences);
    vi.mocked(markNotificationRead).mockResolvedValueOnce({
      ...item,
      isRead: true,
    });
    vi.mocked(markAllNotificationsRead).mockResolvedValueOnce({
      updatedCount: 1,
    });

    render(<NotificationsClient />, { wrapper });

    expect(await screen.findByText("New feedback arrived")).toBeTruthy();
    expect(fetchNotifications).toHaveBeenCalledWith("session-token", {
      pageSize: 20,
    });
    expect(fetchNotificationPreferences).toHaveBeenCalledWith("session-token");

    await userEvent.click(screen.getByRole("button", { name: "Mark read" }));
    expect(markNotificationRead).toHaveBeenCalledWith(
      "session-token",
      "notif_1",
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Mark all read" }),
    );
    expect(markAllNotificationsRead).toHaveBeenCalledWith("session-token");
  });

  it("toggles email notification preferences from the inbox header", async () => {
    vi.mocked(fetchNotifications).mockResolvedValue(paginated([]));
    vi.mocked(fetchUnreadNotificationCount).mockResolvedValue({ count: 0 });
    vi.mocked(fetchNotificationPreferences).mockResolvedValue(preferences);
    vi.mocked(updateNotificationPreferences).mockResolvedValue({
      ...preferences,
      emailEnabled: false,
    });

    render(<NotificationsClient />, { wrapper });

    const emailSwitch = await screen.findByRole("switch", {
      name: "Email alerts",
    });
    expect(emailSwitch.getAttribute("aria-checked")).toBe("true");

    await userEvent.click(emailSwitch);
    expect(updateNotificationPreferences).toHaveBeenCalledWith(
      "session-token",
      { emailEnabled: false },
    );
    await waitFor(() =>
      expect(
        screen
          .getByRole("switch", { name: "Email alerts" })
          .getAttribute("aria-checked"),
      ).toBe("false"),
    );
  });

  it("loads more notifications when more pages exist", async () => {
    vi.mocked(fetchNotifications).mockImplementation(async (_token, params) =>
      params?.pageSize === 20
        ? { ...paginated([notification()]), hasNext: true }
        : {
            ...paginated([
              notification(),
              notification({ id: "notif_2", title: "Export completed" }),
            ]),
            hasNext: false,
          },
    );
    vi.mocked(fetchUnreadNotificationCount).mockResolvedValue({ count: 1 });
    vi.mocked(fetchNotificationPreferences).mockResolvedValue(preferences);

    render(<NotificationsClient />, { wrapper });

    await userEvent.click(
      await screen.findByRole("button", { name: "Show more" }),
    );

    expect(await screen.findByText("Export completed")).toBeTruthy();
    expect(fetchNotifications).toHaveBeenCalledWith("session-token", {
      pageSize: 40,
    });
    expect(screen.queryByRole("button", { name: "Show more" })).toBeNull();
  });
});
