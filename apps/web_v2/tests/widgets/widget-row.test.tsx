import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WidgetListEntry } from "@/lib/widgets/widget-types";
import { WidgetRow } from "@/components/widgets/widget-row";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

function entry(overrides: Partial<WidgetListEntry> = {}): WidgetListEntry {
  return {
    id: "widget_1",
    name: "Homepage carousel",
    kind: "embed",
    layout: "carousel",
    theme: "light",
    accent: "#6366f1",
    isActive: true,
    createdAt: Date.parse("2026-07-20T00:00:00.000Z"),
    updatedAt: Date.parse("2026-07-20T00:00:00.000Z"),
    metrics: { totalLoads: 0, avgLoadMs: 0, lastLoadAt: null },
    ...overrides,
  };
}

function noopHandlers() {
  return {
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    onToggleActive: vi.fn(),
    onRename: vi.fn(),
  };
}

describe("WidgetRow — never offers an action the contract will refuse", () => {
  it("disables the copy action and states why when a wall has no public URL", () => {
    render(
      <WidgetRow
        slug="launchpad"
        entry={entry({ kind: "wall", layout: "wall", name: "Proof wall" })}
        wallSlug={null}
        {...noopHandlers()}
      />,
    );

    const copy = screen.getByRole("button", { name: "Copy wall URL" });
    expect(copy.hasAttribute("disabled")).toBe(true);
    // The reason is attached to a hoverable wrapper and an sr-only twin,
    // because a disabled button receives neither pointer nor focus events.
    expect(
      screen.getAllByText(
        "This wall has no public URL yet. Open it in the studio to set one.",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("enables the copy action once the wall has a URL, and shows it", () => {
    render(
      <WidgetRow
        slug="launchpad"
        entry={entry({ kind: "wall", layout: "wall", name: "Proof wall" })}
        wallSlug="acme-love"
        {...noopHandlers()}
      />,
    );

    expect(
      screen
        .getByRole("button", { name: "Copy wall URL" })
        .hasAttribute("disabled"),
    ).toBe(false);
    expect(screen.getByText("semblia.com/wall/acme-love")).toBeTruthy();
  });

  it("stands every write down while another one is in flight", () => {
    render(
      <WidgetRow
        slug="launchpad"
        entry={entry()}
        wallSlug={null}
        busy
        {...noopHandlers()}
      />,
    );

    for (const name of ["Duplicate widget", "Pause widget", "Delete widget"]) {
      expect(
        screen.getByRole("button", { name }).hasAttribute("disabled"),
      ).toBe(true);
    }
  });
});

describe("WidgetRow — absent is not zero", () => {
  it("renders a real zero as 0 and says the widget has never been served", () => {
    render(
      <WidgetRow
        slug="launchpad"
        entry={entry()}
        wallSlug={null}
        {...noopHandlers()}
      />,
    );

    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText("loads")).toBeTruthy();
    expect(screen.getByText("never loaded")).toBeTruthy();
  });

  it("dashes an unparseable timestamp instead of letting Invalid Date reach the DOM", () => {
    render(
      <WidgetRow
        slug="launchpad"
        entry={entry({
          metrics: { totalLoads: 12, avgLoadMs: 40, lastLoadAt: Number.NaN },
        })}
        wallSlug={null}
        {...noopHandlers()}
      />,
    );

    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.queryByText(/Invalid Date/)).toBeNull();
  });
});

describe("WidgetRow — one badge per row, no raw enum values", () => {
  it("reads Paused for an inactive widget and Active for a live one", () => {
    const { unmount } = render(
      <WidgetRow
        slug="launchpad"
        entry={entry({ isActive: false })}
        wallSlug={null}
        {...noopHandlers()}
      />,
    );
    expect(screen.getByText("Paused")).toBeTruthy();
    expect(screen.queryByText("Active")).toBeNull();
    unmount();

    render(
      <WidgetRow
        slug="launchpad"
        entry={entry()}
        wallSlug={null}
        {...noopHandlers()}
      />,
    );
    expect(screen.getByText("Active")).toBeTruthy();
  });

  it("humanizes an unrecognized layout instead of printing the raw value", () => {
    render(
      <WidgetRow
        slug="launchpad"
        entry={entry({
          layout: "spiral" as WidgetListEntry["layout"],
        })}
        wallSlug={null}
        {...noopHandlers()}
      />,
    );

    expect(screen.getByText(/Custom layout/)).toBeTruthy();
    expect(screen.queryByText(/spiral/)).toBeNull();
  });
});
