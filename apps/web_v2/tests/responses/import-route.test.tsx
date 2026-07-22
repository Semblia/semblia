import { describe, expect, it, vi } from "vitest";

const { notFound, serverFetchProjectBySlug } = vi.hoisted(() => ({
  notFound: vi.fn(),
  serverFetchProjectBySlug: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/lib/semblia-api-server", () => ({ serverFetchProjectBySlug }));
vi.mock("@/components/imports/import-center", () => ({
  ImportCenter: () => null,
}));

import ImportPage from "@/app/(app)/projects/[slug]/responses/import/page";

describe("Import Center route", () => {
  it("uses the project not-found pattern", async () => {
    serverFetchProjectBySlug.mockResolvedValue(null);

    await ImportPage({ params: Promise.resolve({ slug: "missing" }) });

    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
