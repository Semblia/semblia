import * as React from "react";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RememberLastProject } from "@/components/projects/remember-last-project";
import { setLastUsedProject } from "@/lib/semblia-api";

const auth = vi.hoisted(() => ({
  getToken: vi.fn(),
  isSignedIn: true as boolean | undefined,
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => auth,
}));

vi.mock("@/lib/semblia-api", () => ({
  setLastUsedProject: vi.fn(),
}));

describe("RememberLastProject", () => {
  beforeEach(() => {
    auth.getToken.mockReset();
    auth.getToken.mockResolvedValue("session-token");
    auth.isSignedIn = true;
    vi.mocked(setLastUsedProject).mockReset();
    vi.mocked(setLastUsedProject).mockResolvedValue({
      project: { id: "project_1", slug: "launchpad" },
    });
  });

  it("stores the open project as the account's last-used one", async () => {
    render(<RememberLastProject slug="launchpad" />);

    await waitFor(() =>
      expect(setLastUsedProject).toHaveBeenCalledWith("session-token", {
        slug: "launchpad",
      }),
    );
  });

  it("swallows persistence failures so the open project is unaffected", async () => {
    vi.mocked(setLastUsedProject).mockRejectedValueOnce(new Error("offline"));

    render(<RememberLastProject slug="launchpad" />);

    await waitFor(() => expect(setLastUsedProject).toHaveBeenCalledTimes(1));
  });

  it("does not write for a signed-out visitor", async () => {
    auth.isSignedIn = false;

    render(<RememberLastProject slug="launchpad" />);

    await waitFor(() => expect(setLastUsedProject).not.toHaveBeenCalled());
  });

  it("waits for Clerk to confirm the session before writing", async () => {
    // `undefined` is "still resolving", not "signed in": the token isn't minted
    // yet, so a write here could only be an unauthenticated 401.
    auth.isSignedIn = undefined;

    render(<RememberLastProject slug="launchpad" />);

    await waitFor(() => expect(setLastUsedProject).not.toHaveBeenCalled());
  });
});
