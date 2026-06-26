import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { path });
  }),
}));

const cookieState = vi.hoisted(() => ({
  lastProject: undefined as string | undefined,
}));

const api = vi.hoisted(() => ({
  serverFetchLastUsedProject: vi.fn(),
  serverFetchProjectBySlug: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: navigation.redirect,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === "last_project" && cookieState.lastProject
        ? { value: cookieState.lastProject }
        : undefined,
  })),
}));

vi.mock("@/lib/semblia-api-server", () => api);

import RootPage from "../app/page";

describe("RootPage project redirect", () => {
  beforeEach(() => {
    cookieState.lastProject = undefined;
    api.serverFetchLastUsedProject.mockReset();
    api.serverFetchProjectBySlug.mockReset();
    navigation.redirect.mockClear();
  });

  it("prefers the DB-backed last-used project", async () => {
    api.serverFetchLastUsedProject.mockResolvedValue({
      project: { id: "project_1", slug: "acme" },
    });

    await expect(RootPage()).rejects.toMatchObject({
      path: "/projects/acme",
    });

    expect(api.serverFetchProjectBySlug).not.toHaveBeenCalled();
  });

  it("falls back to a valid legacy last_project cookie", async () => {
    cookieState.lastProject = "legacy";
    api.serverFetchLastUsedProject.mockResolvedValue({ project: null });
    api.serverFetchProjectBySlug.mockResolvedValue({
      id: "project_2",
      slug: "renamed-legacy",
    });

    await expect(RootPage()).rejects.toMatchObject({
      path: "/projects/renamed-legacy",
    });

    expect(api.serverFetchProjectBySlug).toHaveBeenCalledWith("legacy");
  });

  it("falls through to /projects when neither saved selection is valid", async () => {
    cookieState.lastProject = "missing";
    api.serverFetchLastUsedProject.mockRejectedValue(new Error("offline"));
    api.serverFetchProjectBySlug.mockResolvedValue(null);

    await expect(RootPage()).rejects.toMatchObject({
      path: "/projects",
    });
  });
});
