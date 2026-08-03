import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { V2ProjectDTO, V2ProjectMemberDTO } from "@workspace/types";
import { ApiError } from "@/lib/api-client";
import {
  fetchAllowedOrigins,
  fetchProjectMembers,
  fetchProjectOwnershipTransfer,
} from "@/lib/semblia-api";
import { DangerClient } from "@/components/settings/danger-client";
import { TrustClient } from "@/components/settings/trust-client";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/semblia-api", () => ({
  fetchProjectMembers: vi.fn(),
  fetchProjectOwnershipTransfer: vi.fn(),
  initiateProjectOwnershipTransfer: vi.fn(),
  cancelProjectOwnershipTransfer: vi.fn(),
  deleteProject: vi.fn(),
  fetchAllowedOrigins: vi.fn(),
  replaceAllowedOrigins: vi.fn(),
  generateSigningSecret: vi.fn(),
  clearSigningSecret: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const membersMock = vi.mocked(fetchProjectMembers);
const transferMock = vi.mocked(fetchProjectOwnershipTransfer);
const originsMock = vi.mocked(fetchAllowedOrigins);

function project(capabilities: string[], isPrimaryOwner = true): V2ProjectDTO {
  return {
    slug: "launchpad",
    name: "Launchpad",
    userId: "user_1",
    access: { role: "OWNER", capabilities, isPrimaryOwner },
  } as unknown as V2ProjectDTO;
}

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  membersMock.mockReset();
  transferMock.mockReset();
  originsMock.mockReset();
  transferMock.mockResolvedValue(null);
});

describe("danger zone", () => {
  /**
   * `eligibleMembers.length === 0` was true both when nobody was eligible and
   * when the request failed, so a 500 told the owner to go add a member they
   * already had. The two facts now read differently.
   */
  it("distinguishes 'members failed to load' from 'nobody is eligible'", async () => {
    membersMock.mockRejectedValue(new ApiError(500, "boom"));

    renderWithQuery(
      <DangerClient project={project(["VIEW_PROJECT", "MANAGE_PROJECT"])} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/couldn't load this project's members/i),
      ).toBeDefined();
    });
    expect(screen.queryByText(/add a member/i)).toBeNull();

    const transfer = screen.getByRole("button", {
      name: /transfer ownership/i,
    });
    expect(transfer.hasAttribute("disabled")).toBe(true);
  });

  it("says nobody is eligible only when the list actually arrived empty", async () => {
    membersMock.mockResolvedValue([
      {
        id: "mem_1",
        projectId: "proj_1",
        userId: "user_1",
        role: "OWNER",
        createdAt: "2026-06-01T00:00:00.000Z",
        user: {
          id: "user_1",
          firstName: "Ada",
          lastName: null,
          email: "ada@example.com",
          avatar: null,
        },
      } as unknown as V2ProjectMemberDTO,
    ]);

    renderWithQuery(
      <DangerClient project={project(["VIEW_PROJECT", "MANAGE_PROJECT"])} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/ownership can only move to an existing member/i),
      ).toBeDefined();
    });
  });

  /** Delete is guarded by MANAGE_PROJECT — a view-only role must not reach the
   *  typed-confirmation modal only to be refused by the API afterwards. */
  it("does not offer deletion without MANAGE_PROJECT, and says why", async () => {
    membersMock.mockResolvedValue([]);

    renderWithQuery(
      <DangerClient project={project(["VIEW_PROJECT"], false)} />,
    );

    const del = await screen.findByRole("button", { name: /delete project/i });
    expect(del.hasAttribute("disabled")).toBe(true);
    expect(
      screen.getByText(/only a project owner or admin can delete/i),
    ).toBeDefined();
  });
});

describe("trust surface", () => {
  /**
   * `GET /allowed-origins` is guarded by MANAGE_PROJECT. The old ladder showed
   * "No origins yet. Add one below" after the 403, inviting a write that would
   * also fail.
   */
  it("renders a permission state, not an empty list, on 403", async () => {
    originsMock.mockRejectedValue(new ApiError(403, "forbidden"));

    renderWithQuery(<TrustClient project={project(["VIEW_PROJECT"])} />);

    await waitFor(() => {
      expect(screen.getByText(/you don't have access to/i)).toBeDefined();
    });
    expect(screen.queryByText(/no trusted origins yet/i)).toBeNull();
    expect(screen.queryByLabelText(/add origin/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });

  it("keeps write controls inert for a view-only role", async () => {
    originsMock.mockResolvedValue({ origins: [] });

    renderWithQuery(<TrustClient project={project(["VIEW_PROJECT"])} />);

    const generate = await screen.findByRole("button", {
      name: /generate secret/i,
    });
    expect(generate.hasAttribute("disabled")).toBe(true);
    expect(
      screen.getAllByText(/your role on this project is view-only/i).length,
    ).toBeGreaterThan(0);
  });

  it("offers Add only once the current list has loaded", async () => {
    originsMock.mockResolvedValue({ origins: ["https://example.com"] });

    renderWithQuery(
      <TrustClient project={project(["VIEW_PROJECT", "MANAGE_PROJECT"])} />,
    );

    await waitFor(() => {
      expect(screen.getByText("https://example.com")).toBeDefined();
    });
    // Empty input: nothing to add yet, so the control stays inert.
    const add = screen.getByRole("button", { name: /add origin/i });
    expect(add.hasAttribute("disabled")).toBe(true);
  });
});
