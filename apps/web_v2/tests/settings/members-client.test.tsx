import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type {
  V2ProjectDTO,
  V2ProjectMemberDTO,
  V2ProjectMemberRole,
} from "@workspace/types";
import { ApiError } from "@/lib/api-client";
import {
  fetchProjectMembers,
  fetchProjectMemberInvites,
} from "@/lib/semblia-api";
import { MembersClient } from "@/components/settings/members-client";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/lib/semblia-api", () => ({
  fetchProjectMembers: vi.fn(),
  fetchProjectMemberInvites: vi.fn(),
  addProjectMember: vi.fn(),
  updateProjectMember: vi.fn(),
  removeProjectMember: vi.fn(),
  createProjectMemberInvite: vi.fn(),
  revokeProjectMemberInvite: vi.fn(),
  acceptProjectMemberInvite: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const membersMock = vi.mocked(fetchProjectMembers);
const invitesMock = vi.mocked(fetchProjectMemberInvites);

function member(
  overrides: Partial<V2ProjectMemberDTO> = {},
): V2ProjectMemberDTO {
  return {
    id: "mem_1",
    projectId: "proj_1",
    userId: "user_1",
    role: "OWNER" as V2ProjectMemberRole,
    createdAt: "2026-06-01T00:00:00.000Z",
    user: {
      id: "user_1",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      avatar: null,
    },
    ...overrides,
  } as V2ProjectMemberDTO;
}

function project(capabilities: string[]): V2ProjectDTO {
  return {
    slug: "launchpad",
    userId: "user_1",
    access: { role: "OWNER", capabilities, isPrimaryOwner: true },
  } as unknown as V2ProjectDTO;
}

function renderMembers(p: V2ProjectDTO) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MembersClient project={p} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  membersMock.mockReset();
  invitesMock.mockReset();
  invitesMock.mockResolvedValue([]);
});

describe("members surface data states", () => {
  /**
   * The flagship defect: `members.data?.length ? rows : "No members yet."`
   * rendered an empty state after a failed request, telling an owner their
   * project had nobody on it. Error must outrank empty, always.
   */
  it("renders an error, never an empty state, when the members query fails", async () => {
    membersMock.mockRejectedValue(new ApiError(500, "boom"));

    renderMembers(project(["VIEW_PROJECT", "MANAGE_MEMBERS"]));

    await waitFor(() => {
      expect(
        screen.getByText(/couldn't load this project's members/i),
      ).toBeDefined();
    });
    expect(screen.queryByText(/no members listed/i)).toBeNull();
    // The response body can carry internals, so only a collapsed correlation
    // digest is ever shown — never the message itself.
    expect(screen.queryByText(/boom/)).toBeNull();
  });

  /**
   * Membership reads need VIEW_PROJECT, so a 403 is reachable. A permission
   * denial must not offer a retry that can only fail again.
   */
  it("renders a permission state without a retry when the API returns 403", async () => {
    membersMock.mockRejectedValue(new ApiError(403, "forbidden"));

    renderMembers(project(["VIEW_PROJECT"]));

    await waitFor(() => {
      expect(screen.getByText(/you don't have access to/i)).toBeDefined();
    });
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });
});

describe("member row actions", () => {
  it("refuses to offer removal or demotion of the only owner, and says why", async () => {
    membersMock.mockResolvedValue([member()]);

    renderMembers(project(["VIEW_PROJECT", "MANAGE_MEMBERS"]));

    const remove = await screen.findByRole("button", {
      name: /remove member/i,
    });
    expect(remove.hasAttribute("disabled")).toBe(true);

    const roleSelect = screen.getByRole("combobox", {
      name: /role for ada lovelace/i,
    });
    expect(roleSelect.hasAttribute("disabled")).toBe(true);

    // The reason is in the flow, not in a tooltip on a control that takes no
    // pointer events while disabled.
    expect(screen.getByText(/must keep at least one owner/i)).toBeDefined();
  });

  it("offers removal once a second owner exists", async () => {
    membersMock.mockResolvedValue([
      member(),
      member({
        id: "mem_2",
        userId: "user_2",
        role: "OWNER",
        user: {
          id: "user_2",
          firstName: "Grace",
          lastName: "Hopper",
          email: "grace@example.com",
          avatar: null,
        },
      }),
    ]);

    renderMembers(project(["VIEW_PROJECT", "MANAGE_MEMBERS"]));

    const buttons = await screen.findAllByRole("button", {
      name: /remove member/i,
    });
    expect(buttons.length).toBe(2);
    expect(buttons.every((b) => !b.hasAttribute("disabled"))).toBe(true);
  });

  it("shows a role badge and no write controls without MANAGE_MEMBERS", async () => {
    membersMock.mockResolvedValue([member({ role: "EDITOR" })]);

    renderMembers(project(["VIEW_PROJECT"]));

    await waitFor(() => {
      expect(screen.getByText("ada@example.com")).toBeDefined();
    });
    // Title Case label from the registry — never the raw enum.
    expect(screen.getByText("Editor")).toBeDefined();
    expect(screen.queryByText("EDITOR")).toBeNull();
    expect(screen.queryByRole("button", { name: /remove member/i })).toBeNull();
    expect(screen.queryByLabelText(/invite by email/i)).toBeNull();
  });
});
