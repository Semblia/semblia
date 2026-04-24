import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useStudioStore } from "@/lib/collect/studio-store";
import { StudioControls } from "@/components/collect/studio/studio-controls";

const SLUG = "test-project";
let formId: string;

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
    writable: true,
  });

  // Reset store between tests
  useStudioStore.setState({
    formsByProject: {},
    snapshots: {},
    device: "desktop",
  });
  formId = useStudioStore.getState().ensureProject(SLUG);
});

describe("<StudioControls /> — rendering", () => {
  it("renders the header with Tresta Studio branding", () => {
    render(<StudioControls formId={formId} />);
    expect(screen.getByText("Tresta Studio")).toBeInTheDocument();
    expect(screen.getByText(/v0\.5/)).toBeInTheDocument();
  });

  it("renders device toggle pills (Desktop, Tablet, Mobile)", () => {
    render(<StudioControls formId={formId} />);
    expect(screen.getByRole("button", { name: "Desktop" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tablet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mobile" })).toBeInTheDocument();
  });

  it("renders Remix and Reset buttons", () => {
    render(<StudioControls formId={formId} />);
    expect(screen.getByRole("button", { name: /Remix/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reset/ })).toBeInTheDocument();
  });

  it("renders collapsible sections", () => {
    render(<StudioControls formId={formId} />);
    expect(screen.getByText("House styles")).toBeInTheDocument();
    expect(screen.getByText("Typography")).toBeInTheDocument();
    expect(screen.getByText("Color")).toBeInTheDocument();
    expect(screen.getByText("Shape & density")).toBeInTheDocument();
    expect(screen.getByText("Static shell mode. Styling controls only.")).toBeInTheDocument();
    expect(screen.queryByText("Layout")).not.toBeInTheDocument();
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
    expect(screen.queryByText("Questions & Logic")).not.toBeInTheDocument();
  });

  it("returns null when formId has no snapshot", () => {
    const { container } = render(<StudioControls formId="nonexistent" />);
    expect(container.innerHTML).toBe("");
  });
});

describe("<StudioControls /> — section collapse/expand", () => {
  it("collapses a section when clicking its header", () => {
    render(<StudioControls formId={formId} />);
    const layoutBtn = screen.getByRole("button", { name: /House styles/ });
    // The collapse inner has content
    const section = layoutBtn.parentElement;
    expect(section).toBeTruthy();

    // Find the collapse element
    const collapseEl = section!.querySelector(".studio-collapse");
    expect(collapseEl).toBeTruthy();
    expect(collapseEl!.hasAttribute("data-closed")).toBe(false);

    // Click to collapse
    fireEvent.click(layoutBtn);
    expect(collapseEl!.hasAttribute("data-closed")).toBe(true);

    // Click to expand
    fireEvent.click(layoutBtn);
    expect(collapseEl!.hasAttribute("data-closed")).toBe(false);
  });
});

describe("<StudioControls /> — color & typography", () => {
  it("renders color inputs for each design token", () => {
    render(<StudioControls formId={formId} />);
    expect(screen.getByText("Background")).toBeInTheDocument();
    expect(screen.getByText("Surface")).toBeInTheDocument();
    expect(screen.getByText("Ink")).toBeInTheDocument();
    expect(screen.getByText("Accent")).toBeInTheDocument();
  });

  it("updates background color via text input", () => {
    render(<StudioControls formId={formId} />);
    const snap = useStudioStore.getState().snapshots[formId]!;
    // bg value may appear in multiple inputs (bg + surface can share the same hex),
    // so use getAllByDisplayValue and pick the first one (which is the Background input)
    const bgInputs = screen.getAllByDisplayValue(snap.draft.tokens.bg);
    fireEvent.change(bgInputs[0], { target: { value: "#ff0000" } });

    const updated = useStudioStore.getState().snapshots[formId]!;
    expect(updated.draft.tokens.bg).toBe("#ff0000");
  });
});

describe("<StudioControls /> — preset cards", () => {
  it("renders style preset cards", () => {
    render(<StudioControls formId={formId} />);
    expect(screen.getByText("Editorial")).toBeInTheDocument();
    expect(screen.getByText("Neo-Brutalist")).toBeInTheDocument();
    // "Soft" may appear elsewhere (e.g. Shadow "Soft" pill), so use getAllByText
    expect(screen.getAllByText("Soft").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Noir")).toBeInTheDocument();
  });

  it("applies a preset when clicked", () => {
    render(<StudioControls formId={formId} />);
    const noirBtn = screen.getByText("Noir").closest("button")!;
    fireEvent.click(noirBtn);

    const snap = useStudioStore.getState().snapshots[formId]!;
    expect(snap.draft.preset).toBe("noir");
  });
});

describe("<StudioControls /> — removed form builder surfaces", () => {
  it("does not render layout thumbnails or question controls", () => {
    render(<StudioControls formId={formId} />);
    expect(screen.queryByText("Classic")).not.toBeInTheDocument();
    expect(screen.queryByText("Hero Split")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add question/ })).not.toBeInTheDocument();
  });
});

describe("<StudioControls /> — pills toggle", () => {
  it("switches device via Pills toggle", () => {
    render(<StudioControls formId={formId} />);

    expect(useStudioStore.getState().device).toBe("desktop");
    fireEvent.click(screen.getByRole("button", { name: "Tablet" }));
    expect(useStudioStore.getState().device).toBe("tablet");
    fireEvent.click(screen.getByRole("button", { name: "Mobile" }));
    expect(useStudioStore.getState().device).toBe("mobile");
  });
});
