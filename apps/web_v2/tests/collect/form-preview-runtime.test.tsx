import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormPreviewRuntime } from "@/components/collect/studio/form-preview-runtime";
import { buildDefaultFormConfig } from "@/lib/collect/studio-presets";
import type { FormConfig } from "@/lib/collect/studio-types";

function config(overrides: Partial<FormConfig> = {}): FormConfig {
  return { ...buildDefaultFormConfig(), ...overrides };
}

describe("<FormPreviewRuntime />", () => {
  it("renders the form screen with the configured questions and submit label", () => {
    const cfg = config({ submitLabel: "Send it" });
    render(
      <FormPreviewRuntime
        draft={cfg}
        screen="form"
        flow="all"
        onSubmit={() => {}}
      />,
    );
    // Default questions include a "Your testimonial" long-text field.
    expect(screen.getByText("Your testimonial")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Send it" })).not.toBeNull();
  });

  it("fires onSubmit from the single-page submit button", () => {
    let submitted = false;
    render(
      <FormPreviewRuntime
        draft={config()}
        screen="form"
        flow="all"
        onSubmit={() => {
          submitted = true;
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Send testimonial/ }));
    expect(submitted).toBe(true);
  });

  it("advances one question per step in stepped flow", () => {
    render(
      <FormPreviewRuntime
        draft={config()}
        screen="form"
        flow="stepped"
        onSubmit={() => {}}
      />,
    );
    // First step shows step 1 of N and a Next button (not the submit label yet).
    expect(screen.getByText(/Step 1 of/)).not.toBeNull();
    const next = screen.getByRole("button", { name: "Next" });
    fireEvent.click(next);
    expect(screen.getByText(/Step 2 of/)).not.toBeNull();
  });

  it("renders the loader screen message", () => {
    const cfg = config();
    cfg.loader = { ...cfg.loader, message: "Just a sec…" };
    render(
      <FormPreviewRuntime
        draft={cfg}
        screen="loader"
        flow="all"
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByText("Just a sec…")).not.toBeNull();
  });

  it("renders the success screen title and message", () => {
    const cfg = config();
    cfg.success = {
      ...cfg.success,
      title: "All done",
      message: "We got it.",
    };
    render(
      <FormPreviewRuntime
        draft={cfg}
        screen="success"
        flow="all"
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByText("All done")).not.toBeNull();
    expect(screen.getByText("We got it.")).not.toBeNull();
  });
});
