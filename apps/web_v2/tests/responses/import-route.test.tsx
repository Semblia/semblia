import { describe, expect, it, vi } from "vitest";
import { responsesImportPath } from "@/lib/routes";

const { notFound, serverFetchProjectBySlug } = vi.hoisted(() => ({
  notFound: vi.fn(),
  serverFetchProjectBySlug: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/lib/semblia-api-server", () => ({ serverFetchProjectBySlug }));
vi.mock("@/components/imports/import-center", () => ({
  ImportCenter: () => null,
}));

import ImportPage from "@/app/(app)/[slug]/responses/import/page";

describe("Import Center route", () => {
  it("uses the canonical root-scoped project route", () => {
    expect(responsesImportPath("launch pad")).toBe(
      "/launch%20pad/responses/import",
    );
  });

  it("uses the project not-found pattern", async () => {
    serverFetchProjectBySlug.mockResolvedValue(null);

    await ImportPage({ params: Promise.resolve({ slug: "missing" }) });

    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
