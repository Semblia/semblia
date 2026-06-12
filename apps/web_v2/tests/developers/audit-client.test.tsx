import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type {
  V2PaginatedResponse,
  V2ProjectActionAuditDTO,
} from "@workspace/types";
import { fetchProjectActionAudit } from "@/lib/semblia-api";
import { AuditClient } from "@/components/developers/audit/audit-client";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/lib/semblia-api", () => ({
  fetchProjectActionAudit: vi.fn(),
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

describe("AuditClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an empty state when there is no activity", async () => {
    vi.mocked(fetchProjectActionAudit).mockResolvedValue(page([]));

    renderWithQuery(<AuditClient slug="launchpad" />);

    expect(await screen.findByText("No activity yet")).toBeTruthy();
  });

  it("lists audit events with humanized action and actor chip", async () => {
    vi.mocked(fetchProjectActionAudit).mockResolvedValue(page([event()]));

    renderWithQuery(<AuditClient slug="launchpad" />);

    expect(await screen.findByText("Response Moderated")).toBeTruthy();
    // Actor chip label appears for the user actor.
    expect(screen.getByText("User")).toBeTruthy();
  });
});
