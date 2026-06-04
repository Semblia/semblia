import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { V2CreatedApiKeyDTO } from "@workspace/types";
import { CreateKeyForm } from "@/components/developers/keys/create-key-form";
import { createApiKey } from "@/lib/tresta-api";

vi.mock("next/navigation", () => ({
  usePathname: () => "/projects/launchpad/developers/keys/new",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/lib/tresta-api", () => ({
  createApiKey: vi.fn(),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const SECRET: V2CreatedApiKeyDTO = {
  id: "key_new",
  name: "Production embed",
  keyType: "SECRET",
  keyPrefix: "sk_test",
  lastFour: "wxyz",
  userId: "user_1",
  projectId: "project_1",
  scopes: ["project:read", "responses:read", "analytics:read"],
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
  secret: "sk_test_PLAINTEXT_SECRET_VALUE",
  key: "sk_test_PLAINTEXT_SECRET_VALUE",
};

function checkboxById(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`No checkbox element with id ${id}`);
  return el;
}

describe("CreateKeyForm scope selector", () => {
  it("pre-selects the backend default scopes", async () => {
    render(<CreateKeyForm type="SECRET" slug="launchpad" />, { wrapper });

    await screen.findByLabelText(/^name/i);

    expect(
      checkboxById("scope-project:read").getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      checkboxById("scope-responses:read").getAttribute("aria-checked"),
    ).toBe("true");

    expect(
      checkboxById("scope-analytics:read").getAttribute("aria-checked"),
    ).toBe("false");
    expect(
      checkboxById("scope-webhooks:write").getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("submits the user-selected scopes to createApiKey", async () => {
    vi.mocked(createApiKey).mockResolvedValueOnce(SECRET);

    render(<CreateKeyForm type="SECRET" slug="launchpad" />, { wrapper });

    await userEvent.type(
      await screen.findByLabelText(/^name/i),
      "Production embed",
    );

    await userEvent.click(checkboxById("scope-analytics:read"));

    await userEvent.click(screen.getByRole("button", { name: /create key/i }));

    await waitFor(() =>
      expect(createApiKey).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        expect.objectContaining({
          name: "Production embed",
          scopes: expect.arrayContaining([
            "project:read",
            "responses:read",
            "analytics:read",
          ]),
        }),
      ),
    );

    const passed = vi.mocked(createApiKey).mock.calls[0]![2] as {
      scopes: string[];
    };
    expect(passed.scopes).toHaveLength(3);
  });

  it("reveals credentials scopes behind a sensitive-scopes disclosure", async () => {
    render(<CreateKeyForm type="SECRET" slug="launchpad" />, { wrapper });

    await screen.findByLabelText(/^name/i);

    expect(document.getElementById("scope-credentials:write")).toBeNull();

    await userEvent.click(
      screen.getByRole("button", { name: /show sensitive scopes/i }),
    );

    expect(
      checkboxById("scope-credentials:read").getAttribute("aria-checked"),
    ).toBe("false");
    expect(
      checkboxById("scope-credentials:write").getAttribute("aria-checked"),
    ).toBe("false");
  });
});
