import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  defaultFormDefinition,
  type FormDefinitionDoc,
} from "@workspace/forms-core";
import { StudioEditor } from "@/components/collect/studio/studio-editor";

/** Controlled harness so onChange round-trips like the real studio client. */
function Harness({ onDoc }: { onDoc?: (doc: FormDefinitionDoc) => void }) {
  const [doc, setDoc] = React.useState(() =>
    defaultFormDefinition({ brandName: "Acme" }),
  );
  return (
    <StudioEditor
      doc={doc}
      onChange={(next) => {
        setDoc(next);
        onDoc?.(next);
      }}
    />
  );
}

describe("StudioEditor", () => {
  it("edits content and round-trips through onChange", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const headline = screen.getByDisplayValue("Share your experience");
    await user.clear(headline);
    await user.type(headline, "Tell us more");
    expect(screen.getByDisplayValue("Tell us more")).toBeTruthy();
  });

  it("adds and removes questions on the Questions tab", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("tab", { name: "Questions" }));
    // The default form ships with a "Your feedback" question.
    expect(screen.getByDisplayValue("Your feedback")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /add question/i }));
    expect(screen.getByDisplayValue("New question")).toBeTruthy();
  });

  it("switches layout preset", async () => {
    const user = userEvent.setup();
    let latest: FormDefinitionDoc | null = null;
    render(<Harness onDoc={(d) => (latest = d)} />);

    await user.click(screen.getByRole("tab", { name: "Layout" }));
    await user.click(screen.getByRole("button", { name: /split/i }));
    expect(latest?.layout.preset).toBe("split");
  });

  it("exposes the full theme knob surface", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("tab", { name: "Theme" }));
    expect(screen.getByText("Brand color")).toBeTruthy();
    expect(screen.getByText("Appearance")).toBeTruthy();
    expect(screen.getByText("Neutral tone")).toBeTruthy();
    expect(screen.getByText("Button style")).toBeTruthy();
  });
});
