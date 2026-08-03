import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type {
  V2PaginatedResponse,
  V2ProjectActionAuditDTO,
} from "@workspace/types";
import {
  fetchProjectActionAudit,
  fetchProjectMembers,
} from "@/lib/semblia-api";
import { AuditClient } from "@/components/developers/audit/audit-client";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/lib/semblia-api", () => ({
  fetchProjectActionAudit: vi.fn(),
  fetchProjectMembers: vi.fn().mockResolvedValue([]),
}));

function event(
  overrides: Partial<V2ProjectActionAuditDTO> = {},
): V2ProjectActionAuditDTO {
  return {
    id: "aud_1",
    projectId: "proj_1",
    actorType: "user",
    actorId: "user_abc123def456",
    credentialId: null,
    action: "response.moderated",
    targetType: "response",
    targetId: "resp_xyz789",
    metadata: null,
    createdAt: "2026-06-04T10:10:00.000Z",
    ...overrides,
  };
}

function page(
  items: V2ProjectActionAuditDTO[],
  overrides: Partial<V2PaginatedResponse<V2ProjectActionAuditDTO>> = {},
): V2PaginatedResponse<V2ProjectActionAuditDTO> {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 25,
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

function member(userId: string, firstName: string, lastName: string) {
  return {
    userId,
    user: { firstName, lastName, email: `${userId}@example.com` },
  };
}

describe("AuditClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchProjectMembers).mockResolvedValue([] as never);
  });

  it("renders an empty state when there is no activity", async () => {
    vi.mocked(fetchProjectActionAudit).mockResolvedValue(page([]));

    renderWithQuery(<AuditClient slug="launchpad" />);

    expect(await screen.findByText("No activity yet")).toBeTruthy();
  });

  it("lists audit events with a humanized action and an actor badge", async () => {
    vi.mocked(fetchProjectActionAudit).mockResolvedValue(page([event()]));

    renderWithQuery(<AuditClient slug="launchpad" />);

    expect(await screen.findByText("Response Moderated")).toBeTruthy();
    // The actor type is the row's one badge — never the raw enum.
    const row = screen.getByRole("listitem");
    expect(within(row).getByText("User")).toBeTruthy();
  });

  it("never renders a raw actor id, and resolves user actors to a member name", async () => {
    vi.mocked(fetchProjectActionAudit).mockResolvedValue(page([event()]));
    vi.mocked(fetchProjectMembers).mockResolvedValue([
      member("user_abc123def456", "Ada", "Lovelace"),
    ] as never);

    renderWithQuery(<AuditClient slug="launchpad" />);

    expect(await screen.findByText("Ada Lovelace")).toBeTruthy();
    expect(screen.queryByText(/user_abc123def456/)).toBeNull();
  });

  it("collapses a same-actor burst into one expandable block", async () => {
    const user = (await import("@testing-library/user-event")).default;
    vi.mocked(fetchProjectActionAudit).mockResolvedValue(
      page([
        event({ id: "aud_1", createdAt: "2026-08-01T10:02:00.000Z" }),
        event({
          id: "aud_2",
          action: "response.annotated",
          createdAt: "2026-08-01T10:01:00.000Z",
        }),
        event({
          id: "aud_3",
          action: "api_key.rotated",
          actorType: "api_key",
          actorId: "key_1",
          createdAt: "2026-08-01T10:00:30.000Z",
        }),
      ]),
    );

    renderWithQuery(<AuditClient slug="launchpad" />);

    // The two user events collapse to one block; the api_key event stands alone.
    const header = await screen.findByRole("button", { name: /2 changes/ });
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Response Annotated")).toBeNull();
    expect(screen.getByText("API Key Rotated")).toBeTruthy();

    await user.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Response Moderated")).toBeTruthy();
    expect(screen.getByText("Response Annotated")).toBeTruthy();
  });

  it("renders an error surface, not an empty state, when the log can't be read", async () => {
    vi.mocked(fetchProjectActionAudit).mockRejectedValue(
      new Error("network down"),
    );

    renderWithQuery(<AuditClient slug="launchpad" />);

    expect(
      await screen.findByText("Couldn't load this project's activity"),
    ).toBeTruthy();
    expect(screen.queryByText("No activity yet")).toBeNull();
  });
});
