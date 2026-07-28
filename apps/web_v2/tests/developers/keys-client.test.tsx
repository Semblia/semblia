import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { V2ApiKeyDTO, V2CreatedApiKeyDTO } from "@workspace/types";
import { KeysClient } from "@/components/developers/keys/keys-client";
import { ApiError } from "@/lib/api-client";
import { fetchApiKeys, rotateApiKey, revokeApiKey } from "@/lib/semblia-api";

vi.mock("next/navigation", () => ({
  usePathname: () => "/launchpad/developers/keys",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/lib/semblia-api", () => ({
  fetchApiKeys: vi.fn(),
  rotateApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
}));

function apiKey(overrides: Partial<V2ApiKeyDTO> = {}): V2ApiKeyDTO {
  return {
    id: "key_1",
    name: "Production embed",
    keyType: "SECRET",
    keyPrefix: "sk_live",
    lastFour: "4f2a",
    userId: "user_1",
    projectId: "project_1",
    scopes: ["project:read", "responses:read"],
    usageCount: 0,
    usageLimit: null,
    rateLimit: 60,
    status: "ACTIVE",
    isActive: true,
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    createdAt: "2026-05-18T00:00:00.000Z",
    updatedAt: "2026-05-18T00:00:00.000Z",
    ...overrides,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("KeysClient", () => {
  beforeEach(() => {
    vi.mocked(fetchApiKeys).mockReset();
    vi.mocked(rotateApiKey).mockReset();
    vi.mocked(revokeApiKey).mockReset();
  });

  it("renders an error, never a first-run empty state, when the list fails", async () => {
    vi.mocked(fetchApiKeys).mockRejectedValue(new ApiError(500, "boom"));

    render(<KeysClient slug="launchpad" />, { wrapper });

    expect(await screen.findByText(/couldn't load api keys/i)).toBeTruthy();
    // The defect this guards: an empty `items` after a failed request used to
    // render "No API keys", inviting a duplicate of a key that already exists.
    expect(screen.queryByText("No API keys")).toBeNull();
    // A transient failure ends with a next step; the status code stays behind
    // the collapsed support reference rather than in the copy.
    expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy();
    expect(screen.getByText(/couldn't load api keys/i).textContent).not.toMatch(
      /\d{3}/,
    );
  });

  it("distinguishes a never-used key from a measured zero", async () => {
    vi.mocked(fetchApiKeys).mockResolvedValue([
      apiKey({ usageCount: 0, lastUsedAt: null }),
    ]);

    render(<KeysClient slug="launchpad" />, { wrapper });

    const row = (await screen.findByText("Production embed")).closest(
      '[data-shape="row"]',
    );
    // Absent and zero are different facts: nothing has ever authenticated with
    // this key, and the request count is a measured zero rather than a dash.
    expect(row?.textContent).toContain("Never used");
    expect(row?.textContent).toContain("0 requests");
    expect(row?.textContent).not.toContain("—");
  });

  it("reveals the new secret when a key is rotated from a row", async () => {
    vi.mocked(fetchApiKeys).mockResolvedValue([apiKey()]);
    const rotated: V2CreatedApiKeyDTO = {
      ...apiKey(),
      secret: "sk_live_ROTATED_SECRET_VALUE",
      key: "sk_live_ROTATED_SECRET_VALUE",
    };
    vi.mocked(rotateApiKey).mockResolvedValueOnce(rotated);

    render(<KeysClient slug="launchpad" />, { wrapper });

    expect(await screen.findByText("Production embed")).toBeTruthy();

    await userEvent.click(
      screen.getAllByRole("button", { name: /rotate key/i })[0],
    );
    const confirm = await screen.findByRole("alertdialog");
    await userEvent.click(
      within(confirm).getByRole("button", { name: /rotate key/i }),
    );

    await waitFor(() =>
      expect(rotateApiKey).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        "key_1",
      ),
    );

    // The regression this guards: rotating used to fire the mutation and drop
    // the response, retiring the old secret and losing the new one forever.
    expect(
      await screen.findByText("sk_live_ROTATED_SECRET_VALUE"),
    ).toBeTruthy();
  });
});
