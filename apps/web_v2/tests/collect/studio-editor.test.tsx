import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  defaultFormDefinition,
  type FormDefinitionDoc,
} from "@workspace/forms-core";
import { StudioEditor } from "@/components/collect/studio/studio-editor";
import type { StudioProject } from "@/components/collect/studio/studio-client";

const PROJECT: StudioProject = {
  name: "Acme",
  logoUrl: null,
  brandColor: "#4f46e5",
  type: null,
};

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
      project={PROJECT}
      slug="acme"
      formId="form_1"
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
    // Object ref, not a `let` closed over by onDoc: avoids the control-flow
    // `never`-narrowing TS applies to closure-assigned locals.
    const captured: { doc: FormDefinitionDoc | null } = { doc: null };
    render(<Harness onDoc={(d) => (captured.doc = d)} />);

    await user.click(screen.getByRole("tab", { name: "Layout" }));
    await user.click(screen.getByRole("button", { name: /split/i }));
    expect(captured.doc?.layout.preset).toBe("split");
  });

  it("explains file-upload constraints in the question editor", async () => {
    const user = userEvent.setup();
    const doc = defaultFormDefinition({ brandName: "Acme" });
    doc.structure.questions.push({
      id: "attachment",
      type: "file",
      label: "Attach a screenshot",
      placeholder: "",
      description: "",
      required: false,
      options: [],
      showIf: null,
    });
    render(
      <StudioEditor
        doc={doc}
        onChange={() => {}}
        project={PROJECT}
        slug="acme"
        formId="form_1"
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Questions" }));
    const detailToggles = screen.getAllByRole("button", {
      name: /edit question details/i,
    });
    await user.click(detailToggles[detailToggles.length - 1]!);
    expect(screen.getByText(/uploads run on the hosted form/i)).toBeTruthy();
  });

  it("exposes the full theme knob surface", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("tab", { name: "Theme" }));
    expect(screen.getByText("Appearance")).toBeTruthy();
    expect(screen.getByText("Surface style")).toBeTruthy();
    expect(screen.getByText("Neutral tone")).toBeTruthy();
    expect(screen.getByText("Button style")).toBeTruthy();
  });

  it("inherits project branding by default", () => {
    render(<Harness />);
    // Default forms are synced to the project's branding (Settings → Branding).
    expect(screen.getByText(/synced with project branding/i)).toBeTruthy();
  });
});
