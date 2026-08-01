import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { V2PaginatedResponse, V2ProjectDTO } from "@workspace/types";
import { SidebarNav } from "@/components/nav/app-sidebar";
import { ProjectSwitcher } from "@/components/nav/project-switcher";
import {
  activeChildHref,
  activeLabel,
  buildProjectNav,
  buildWorkspaceNav,
  isHrefActive,
} from "@/components/nav/nav-model";
import { fetchProjects } from "@/lib/semblia-api";

const navigation = vi.hoisted(() => ({
  pathname: "/launchpad/studio",
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({
    push: navigation.push,
  }),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("session-token"),
    isSignedIn: true,
  }),
}));

vi.mock("@/lib/semblia-api", () => ({
  fetchProjects: vi.fn(),
}));

function makeProject(overrides: Partial<V2ProjectDTO> = {}): V2ProjectDTO {
  return {
    id: "project_1",
    userId: "user_1",
    organizationId: "org_1",
    name: "Launchpad",
    shortDescription: "Project management for indie makers",
    description: null,
    slug: "launchpad",
    logo: null,
    projectType: "SAAS_APP",
    websiteUrl: null,
    collectionFormUrl: null,
    brandColorPrimary: "#6366f1",
    brandColorSecondary: "#4f46e5",
    socialLinks: null,
    tags: ["saas"],
    visibility: "PUBLIC",
    isActive: true,
    autoModeration: true,
    autoApproveVerified: false,
    profanityFilterLevel: null,
    createdAt: "2026-05-13T00:00:00.000Z",
    updatedAt: "2026-05-13T00:00:00.000Z",
    formConfig: null,
    publicSurfaceHosts: [],
    _count: {
      responses: 12,
      pendingModeration: 4,
      widgets: 2,
      apiKeys: 1,
    },
    access: {
      role: "ORG_ADMIN",
      capabilities: ["VIEW_PROJECT", "MANAGE_PROJECT"],
      isPrimaryOwner: true,
    },
    ...overrides,
  };
}

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe("nav model", () => {
  it("keeps every project destination reachable from one rail", () => {
    const hrefs = buildProjectNav("launchpad").flatMap((group) =>
      group.items.flatMap((item) => [
        item.href,
        ...(item.children?.map((child) => child.href) ?? []),
      ]),
    );

    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/launchpad/forms",
        "/launchpad/import",
        "/launchpad/responses",
        "/launchpad/studio",
        "/launchpad/analytics",
        "/launchpad/integrations",
        "/launchpad/developers",
        "/launchpad/developers/keys",
        "/launchpad/developers/agents",
        "/launchpad/developers/webhooks",
        "/launchpad/developers/exports",
        "/launchpad/developers/activity",
        "/launchpad/settings",
        "/launchpad/settings/branding",
        "/launchpad/settings/visibility",
        "/launchpad/settings/social",
        "/launchpad/settings/domains",
        "/launchpad/settings/security",
        "/launchpad/settings/members",
        "/launchpad/settings/danger",
      ]),
    );
  });

  it("matches the workspace home exactly so it does not claim every route", () => {
    const home = buildWorkspaceNav()[0].items[0];

    expect(home.href).toBe("/");
    expect(isHrefActive("/", home.href, home.exact)).toBe(true);
    expect(isHrefActive("/account/billing", home.href, home.exact)).toBe(false);
  });

  it("names the active destination including its parent section", () => {
    const nav = buildProjectNav("launchpad");

    expect(activeLabel("/launchpad/forms", nav)).toBe("Forms");
    expect(activeLabel("/launchpad/settings/branding", nav)).toBe(
      "Settings · Branding",
    );
    expect(activeLabel("/launchpad/developers/keys", nav)).toBe(
      "Developers · API keys",
    );
  });

  it("selects the most specific child when one href prefixes another", () => {
    // "General" is /settings, which prefixes every other settings route.
    const settings = buildProjectNav("launchpad")
      .flatMap((group) => group.items)
      .find((item) => item.label === "Settings");

    expect(
      activeChildHref("/launchpad/settings/domains", settings?.children),
    ).toBe("/launchpad/settings/domains");
    expect(activeChildHref("/launchpad/settings", settings?.children)).toBe(
      "/launchpad/settings",
    );
    expect(
      activeLabel("/launchpad/settings/domains", buildProjectNav("launchpad")),
    ).toBe("Settings · Domains");
  });
});

describe("sidebar", () => {
  it("marks the active section and reveals only its sub-destinations", () => {
    render(
      <SidebarNav
        groups={buildProjectNav("launchpad")}
        pathname="/launchpad/settings/branding"
      />,
    );

    expect(
      screen
        .getByRole("link", { name: "Branding" })
        .getAttribute("aria-current"),
    ).toBe("page");
    // Settings is open, so Domains is one click away…
    expect(screen.getByRole("button", { name: /Settings/ })).toHaveProperty(
      "ariaExpanded",
      "true",
    );
    expect(screen.getByRole("link", { name: "Domains" })).toBeTruthy();
    // …while the inactive Developers section stays collapsed.
    expect(screen.getByRole("button", { name: /Developers/ })).toHaveProperty(
      "ariaExpanded",
      "false",
    );
    // …and only one child is marked current.
    expect(
      screen
        .getByRole("link", { name: "General" })
        .getAttribute("aria-current"),
    ).toBeNull();
  });

  it("keeps every top-level section visible from a nested page", () => {
    render(
      <SidebarNav
        groups={buildProjectNav("launchpad")}
        pathname="/launchpad/developers/webhooks"
      />,
    );

    for (const label of [
      "Forms",
      "Import",
      "Responses",
      "Studio",
      "Analytics",
      "Integrations",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeTruthy();
    }
    // Only Developers and Settings carry children, so only they render as
    // expandable sections. Responses lost its children in the 2026-08-02
    // collection IA (Import is a top-level destination now), so it is a
    // plain link like the rest.
    for (const label of ["Developers", "Settings"]) {
      expect(
        screen.getByRole("button", { name: new RegExp(label) }),
      ).toBeTruthy();
    }
    expect(
      screen
        .getByRole("link", { name: "Webhooks" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("expands a grouping section in place instead of navigating", async () => {
    render(
      <SidebarNav
        groups={buildProjectNav("launchpad")}
        pathname="/launchpad/forms"
      />,
    );

    // Grouping sections are not links — their route is a prefix, not a page.
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();

    const toggle = screen.getByRole("button", { name: /Settings/ });
    expect(toggle).toHaveProperty("ariaExpanded", "false");

    await userEvent.click(toggle);

    expect(toggle).toHaveProperty("ariaExpanded", "true");
    // The panel is inert while collapsed, so revealing it is what exposes the
    // children to keyboard users.
    expect(
      document
        .getElementById(toggle.getAttribute("aria-controls")!)
        ?.hasAttribute("inert"),
    ).toBe(false);
    expect(screen.getByRole("link", { name: "Branding" })).toBeTruthy();
  });
});

describe("project switcher", () => {
  it("loads switcher options from the typed projects endpoint", async () => {
    const current = makeProject();
    const second = makeProject({
      id: "project_2",
      name: "PortfolioPro",
      slug: "portfoliopro",
      _count: {
        responses: 1,
        pendingModeration: 0,
        widgets: 0,
        apiKeys: 0,
      },
    });
    const response: V2PaginatedResponse<V2ProjectDTO> = {
      items: [current, second],
      total: 2,
      page: 1,
      pageSize: 100,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };
    vi.mocked(fetchProjects).mockResolvedValueOnce(response);

    renderWithQuery(<ProjectSwitcher current={current} />);
    await userEvent.click(screen.getByRole("button", { name: /launchpad/i }));

    await waitFor(() =>
      expect(fetchProjects).toHaveBeenCalledWith("session-token", {
        pageSize: 100,
      }),
    );
    expect(await screen.findByText("PortfolioPro")).toBeTruthy();
  });
});
