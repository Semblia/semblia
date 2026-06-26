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
    document.cookie = "last_project=; path=/; max-age=0";
    auth.getToken.mockReset();
    auth.getToken.mockResolvedValue("session-token");
    auth.isSignedIn = true;
    vi.mocked(setLastUsedProject).mockReset();
    vi.mocked(setLastUsedProject).mockResolvedValue({
      project: { id: "project_1", slug: "launchpad" },
    });
  });

  it("writes the legacy cookie and stores the DB-backed last-used project", async () => {
    render(<RememberLastProject slug="launchpad" />);

    expect(document.cookie).toContain("last_project=launchpad");
    await waitFor(() =>
      expect(setLastUsedProject).toHaveBeenCalledWith("session-token", {
        slug: "launchpad",
      }),
    );
  });

  it("swallows persistence failures so the cookie fallback still works", async () => {
    vi.mocked(setLastUsedProject).mockRejectedValueOnce(new Error("offline"));

    render(<RememberLastProject slug="launchpad" />);

    expect(document.cookie).toContain("last_project=launchpad");
    await waitFor(() => expect(setLastUsedProject).toHaveBeenCalledTimes(1));
  });
});
