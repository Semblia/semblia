import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { V2ProjectDTO, V2PublicSurfaceHostDTO } from "@workspace/types";
import { ApiError } from "@/lib/api-client";
import { fetchPublicSurfaceHosts } from "@/lib/semblia-api";
import { HostsClient } from "@/components/settings/hosts-client";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/lib/semblia-api", () => ({
  fetchPublicSurfaceHosts: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const hostsMock = vi.mocked(fetchPublicSurfaceHosts);

function host(
  overrides: Partial<V2PublicSurfaceHostDTO> = {},
): V2PublicSurfaceHostDTO {
  return {
    id: "host_1",
    projectId: "proj_1",
    feature: "COLLECTION",
    resourceType: "PROJECT",
    resourceId: "proj_1",
    hostname: "launchpad.testimonials.semblia.com",
    isDefault: true,
    status: "ACTIVE",
    verifiedAt: "2026-06-01T00:00:00.000Z",
    retiredAt: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

const project = { slug: "launchpad" } as V2ProjectDTO;

function renderHosts() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <HostsClient project={project} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  hostsMock.mockReset();
});

describe("public address lifecycle", () => {
  it("never renders a raw status enum", async () => {
    hostsMock.mockResolvedValue([
      host({ status: "PENDING_VERIFICATION", verifiedAt: null }),
    ]);

    renderHosts();

    await waitFor(() => {
      expect(screen.getByText("Verifying DNS")).toBeDefined();
    });
    expect(screen.queryByText("PENDING_VERIFICATION")).toBeNull();
  });

  /**
   * The previous build wrote `<Button asChild disabled>` around an anchor, and
   * `disabled` means nothing to an `<a>` — an unverified host was still one
   * click from a page that doesn't resolve.
   */
  it("does not link to an address that isn't live, and states why", async () => {
    hostsMock.mockResolvedValue([
      host({ status: "PENDING_VERIFICATION", verifiedAt: null }),
    ]);

    renderHosts();

    const open = await screen.findByRole("button", { name: /open page/i });
    expect(open.hasAttribute("disabled")).toBe(true);
    expect(open.tagName).toBe("BUTTON");
    expect(screen.queryByRole("link", { name: /open page/i })).toBeNull();
    expect(screen.getByText(/finish verifying/i)).toBeDefined();
  });

  it("links to a live address", async () => {
    hostsMock.mockResolvedValue([host()]);

    renderHosts();

    const link = await screen.findByRole("link", { name: /open page/i });
    expect(link.getAttribute("href")).toBe(
      "https://launchpad.testimonials.semblia.com",
    );
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("renders an error rather than 'no public addresses' when the query fails", async () => {
    hostsMock.mockRejectedValue(new ApiError(500, "boom"));

    renderHosts();

    await waitFor(() => {
      expect(
        screen.getByText(/couldn't load this project's public addresses/i),
      ).toBeDefined();
    });
    expect(screen.queryByText(/no public addresses yet/i)).toBeNull();
  });
});
