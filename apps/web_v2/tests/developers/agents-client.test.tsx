import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type {
  V2AgentAccessOverviewDTO,
  V2AgentAccessPresetDTO,
  V2ApiKeyDTO,
  V2CreatedApiKeyDTO,
} from "@workspace/types";
import { AgentsClient } from "@/components/developers/agents/agents-client";
import { CreateAgentKeyForm } from "@/components/developers/agents/create-agent-key-form";
import {
  fetchAgentAccessOverview,
  createAgentKey,
  revokeAgentKey,
} from "@/lib/tresta-api";

const navigation = vi.hoisted(() => ({
  pathname: "/projects/launchpad/developers/agents",
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/lib/tresta-api", () => ({
  fetchAgentAccessOverview: vi.fn(),
  createAgentKey: vi.fn(),
  revokeAgentKey: vi.fn(),
  fetchAgentActions: vi.fn(),
}));

const READ_ONLY_PRESET: V2AgentAccessPresetDTO = {
  id: "READ_ONLY",
  label: "Read only",
  description: "Safe inspection scopes for analysis-focused agents.",
  scopes: ["project:read", "submissions:read", "testimonials:read"],
};

const DEVELOPER_PRESET: V2AgentAccessPresetDTO = {
  id: "DEVELOPER",
  label: "Developer",
  description: "Full automation surface for trusted developer agents.",
  scopes: [
    "project:read",
    "submissions:read",
    "submissions:annotate",
    "testimonials:read",
    "testimonials:publish",
    "webhooks:read",
    "webhooks:write",
  ],
};

function agentKey(overrides: Partial<V2ApiKeyDTO> = {}): V2ApiKeyDTO {
  return {
    id: "key_1",
    name: "Claude Bot",
    type: "AGENT",
    keyType: "AGENT",
    prefix: "agt_test",
    keyPrefix: "agt_test",
    lastFour: "1234",
    userId: "user_1",
    projectId: "project_1",
    permissions: null,
    scopes: READ_ONLY_PRESET.scopes,
    usageCount: 12,
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

function overview(
  overrides: Partial<V2AgentAccessOverviewDTO> = {},
): V2AgentAccessOverviewDTO {
  return {
    presets: [READ_ONLY_PRESET, DEVELOPER_PRESET],
    keys: [agentKey()],
    ...overrides,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("AgentsClient", () => {
  it("renders agent keys from the live overview hook", async () => {
    vi.mocked(fetchAgentAccessOverview).mockResolvedValueOnce(overview());

    render(<AgentsClient slug="launchpad" />, { wrapper });

    expect(await screen.findByText("Claude Bot")).toBeTruthy();
    expect(fetchAgentAccessOverview).toHaveBeenCalledWith(
      "session-token",
      "launchpad",
    );
    expect(screen.getByText(/Read only/i)).toBeTruthy();
  });

  it("points the create CTA at the dedicated new-agent-key page", async () => {
    vi.mocked(fetchAgentAccessOverview).mockResolvedValueOnce(
      overview({ keys: [] }),
    );

    render(<AgentsClient slug="launchpad" />, { wrapper });

    const cta = await screen.findByRole("link", {
      name: /create agent key/i,
    });
    expect(cta.getAttribute("href")).toBe(
      "/projects/launchpad/developers/agents/new",
    );
  });

  it("revokes an agent key through the revoke mutation", async () => {
    vi.mocked(fetchAgentAccessOverview).mockResolvedValue(overview());
    vi.mocked(revokeAgentKey).mockResolvedValueOnce(
      agentKey({ isActive: false, status: "REVOKED" }),
    );

    render(<AgentsClient slug="launchpad" />, { wrapper });

    expect(await screen.findByText("Claude Bot")).toBeTruthy();

    const revokeButtons = screen.getAllByRole("button", { name: /revoke/i });
    await userEvent.click(revokeButtons[0]);

    await userEvent.click(
      await screen.findByRole("button", { name: /revoke key/i }),
    );

    await waitFor(() =>
      expect(revokeAgentKey).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        "key_1",
      ),
    );
  });
});

describe("CreateAgentKeyForm", () => {
  it("creates a new agent key with the chosen preset", async () => {
    vi.mocked(fetchAgentAccessOverview).mockResolvedValueOnce(
      overview({ keys: [] }),
    );
    const created: V2CreatedApiKeyDTO = {
      ...agentKey({ id: "key_new", name: "Linear bot" }),
      secret: "agt_test_PLAINTEXT_SECRET_VALUE",
      key: "agt_test_PLAINTEXT_SECRET_VALUE",
    };
    vi.mocked(createAgentKey).mockResolvedValueOnce(created);

    render(<CreateAgentKeyForm slug="launchpad" />, { wrapper });

    await userEvent.type(await screen.findByLabelText(/^name/i), "Linear bot");

    const presetButtons = await screen.findAllByRole("radio");
    expect(presetButtons.length).toBeGreaterThanOrEqual(2);
    await userEvent.click(
      presetButtons.find((b) =>
        b.textContent?.toLowerCase().includes("developer"),
      )!,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /create agent key/i }),
    );

    await waitFor(() =>
      expect(createAgentKey).toHaveBeenCalledWith(
        "session-token",
        "launchpad",
        {
          name: "Linear bot",
          preset: "DEVELOPER",
        },
      ),
    );

    expect(await screen.findByText(/your new key — copy it now/i)).toBeTruthy();
  });
});
