import { beforeEach, describe, expect, it, vi } from "vitest";
import { importManualPath, importPath } from "@/lib/routes";

const { notFound, serverFetchProjectBySlug } = vi.hoisted(() => ({
  // The real notFound() never returns — the pages rely on the throw to stop
  // before rendering with a missing project.
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  serverFetchProjectBySlug: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/lib/semblia-api-server", () => ({ serverFetchProjectBySlug }));
vi.mock("@/components/imports/import-landing", () => ({
  ImportLanding: () => null,
}));
vi.mock("@/components/imports/import-manual-client", () => ({
  ImportManualClient: () => null,
}));

import ImportPage from "@/app/(app)/[slug]/import/page";
import ImportManualPage from "@/app/(app)/[slug]/import/manual/page";

describe("Import routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the canonical root-scoped import routes", () => {
    expect(importPath("launch pad")).toBe("/launch%20pad/import");
    expect(importManualPath("launch pad")).toBe("/launch%20pad/import/manual");
  });

  it("uses the project not-found pattern on the landing page", async () => {
    serverFetchProjectBySlug.mockResolvedValue(null);

    await expect(
      ImportPage({ params: Promise.resolve({ slug: "missing" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("uses the project not-found pattern on a method page", async () => {
    serverFetchProjectBySlug.mockResolvedValue(null);

    await expect(
      ImportManualPage({ params: Promise.resolve({ slug: "missing" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
