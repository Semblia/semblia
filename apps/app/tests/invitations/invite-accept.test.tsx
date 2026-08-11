import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, acceptProjectMemberInvite } from "@/lib/semblia-api";
import { InviteAcceptClient } from "@/app/(standalone)/invitations/[inviteId]/_invite-accept";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

// Keep the real `ApiError` class (the component's `error instanceof ApiError`
// classification depends on it) and mock only the one fetcher under test.
vi.mock("@/lib/semblia-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/semblia-api")>();
  return { ...actual, acceptProjectMemberInvite: vi.fn() };
});

const acceptMock = vi.mocked(acceptProjectMemberInvite);

function renderInvite(inviteId = "inv_1") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <InviteAcceptClient inviteId={inviteId} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  acceptMock.mockReset();
});

describe("the invite accept screen", () => {
  it("shows a pending state while the accept is in flight", () => {
    acceptMock.mockReturnValue(new Promise(() => {}));
    renderInvite();
    expect(screen.getByText("Joining…")).toBeTruthy();
  });

  it("names the project and offers to open it once accepted", async () => {
    acceptMock.mockResolvedValue({
      invite: {
        id: "inv_1",
        projectId: "proj_1",
        email: "rowan@meridianlabs.test",
        role: "EDITOR",
        status: "ACCEPTED",
        invitedByUserId: null,
        acceptedByUserId: "user_1",
        acceptedAt: "2026-08-12T00:00:00.000Z",
        expiresAt: "2026-08-26T00:00:00.000Z",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-12T00:00:00.000Z",
      },
      member: {
        id: "mem_1",
        userId: "user_1",
        role: "EDITOR",
        createdAt: "2026-08-12T00:00:00.000Z",
        user: {
          id: "user_1",
          firstName: "Rowan",
          lastName: "Iyer",
          email: "rowan@meridianlabs.test",
          avatar: null,
        },
      },
      projectSlug: "meridian",
      projectName: "Meridian Labs",
    });

    renderInvite();

    await waitFor(() => {
      expect(screen.getByText(/You've joined Meridian Labs/)).toBeTruthy();
    });
    const link = screen.getByRole("link", { name: "Open project" });
    expect(link.getAttribute("href")).toBe("/meridian");
  });

  it("says the invite expired, with no retry, on the API's expired 409", async () => {
    acceptMock.mockRejectedValue(
      new ApiError(409, {
        success: false,
        error: {
          code: "CONFLICT",
          message: "Project member invite has expired",
        },
      }),
    );

    renderInvite();

    await waitFor(() => {
      expect(screen.getByText("This invite has expired")).toBeTruthy();
    });
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });

  it("says the invite is no longer available on a non-expired 409", async () => {
    acceptMock.mockRejectedValue(
      new ApiError(409, {
        success: false,
        error: {
          code: "CONFLICT",
          message: "Project member invite is not pending",
        },
      }),
    );

    renderInvite();

    await waitFor(() => {
      expect(
        screen.getByText("This invite is no longer available"),
      ).toBeTruthy();
    });
  });

  it("names the wrong-email case on a 403, and points at the fix", async () => {
    acceptMock.mockRejectedValue(
      new ApiError(403, {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Project member invite belongs to another email",
        },
      }),
    );

    renderInvite();

    await waitFor(() => {
      expect(
        screen.getByText("This invite is for a different email"),
      ).toBeTruthy();
    });
  });

  it("says the invite can't be found on a 404", async () => {
    acceptMock.mockRejectedValue(
      new ApiError(404, {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Project member invite not found",
        },
      }),
    );

    renderInvite();

    await waitFor(() => {
      expect(screen.getByText("We can't find this invite")).toBeTruthy();
    });
  });

  it("offers a retry for a generic failure, and re-submits the same invite", async () => {
    acceptMock.mockRejectedValue(new ApiError(500, null));

    renderInvite("inv_1");

    const retry = await screen.findByRole("button", { name: /try again/i });
    expect(acceptMock).toHaveBeenCalledTimes(1);

    fireEvent.click(retry);

    await waitFor(() => {
      expect(acceptMock).toHaveBeenCalledTimes(2);
    });
    expect(acceptMock).toHaveBeenNthCalledWith(2, "session-token", "inv_1");
  });

  it("submits the accept exactly once on mount", async () => {
    acceptMock.mockResolvedValue({
      invite: {
        id: "inv_1",
        projectId: "proj_1",
        email: "rowan@meridianlabs.test",
        role: "EDITOR",
        status: "ACCEPTED",
        invitedByUserId: null,
        acceptedByUserId: "user_1",
        acceptedAt: "2026-08-12T00:00:00.000Z",
        expiresAt: "2026-08-26T00:00:00.000Z",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-12T00:00:00.000Z",
      },
      member: {
        id: "mem_1",
        userId: "user_1",
        role: "EDITOR",
        createdAt: "2026-08-12T00:00:00.000Z",
        user: {
          id: "user_1",
          firstName: "Rowan",
          lastName: "Iyer",
          email: "rowan@meridianlabs.test",
          avatar: null,
        },
      },
      projectSlug: "meridian",
      projectName: "Meridian Labs",
    });

    renderInvite();

    await waitFor(() => expect(acceptMock).toHaveBeenCalledTimes(1));
    expect(acceptMock).toHaveBeenCalledWith("session-token", "inv_1");
  });
});
