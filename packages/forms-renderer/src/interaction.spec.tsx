import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormRenderer } from "./renderer.js";
import { makeSnapshot } from "./test-utils.js";

afterEach(cleanup);

describe("FormRenderer interactions", () => {
  it("surfaces validation errors when a required form is submitted empty", async () => {
    const snap = makeSnapshot("CUSTOM"); // meridian, calm: message is required
    render(<FormRenderer snapshot={snap} mode="preview" />);
    fireEvent.click(screen.getByText(snap.content.submitButtonText));
    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    });
  });

  it("reveals a conditional field only when its condition is met", () => {
    // A small calm doc: rating drives a conditional follow-up on one surface.
    const snap = makeSnapshot("CUSTOM", (d) => ({
      ...d,
      templateId: "meridian",
      fields: [
        {
          ...d.fields[1]!,
          id: "rating",
          type: "rating",
          role: "rating",
          label: "Rate us",
          required: true,
          ratingScale: 5,
        },
        {
          ...d.fields[1]!,
          id: "improvement",
          type: "longText",
          role: "custom",
          label: "What could we improve?",
          required: false,
        },
      ],
      flow: {
        conditionalRules: [
          {
            targetFieldId: "improvement",
            action: "show" as const,
            match: "all" as const,
            conditions: [
              { fieldId: "rating", operator: "lessThanOrEqual" as const, value: 3 },
            ],
          },
        ],
      },
    }));
    render(<FormRenderer snapshot={snap} mode="preview" />);
    expect(screen.queryByText("What could we improve?")).toBeNull();
    fireEvent.click(screen.getByLabelText("2 of 5"));
    expect(screen.getByText("What could we improve?")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("5 of 5"));
    expect(screen.queryByText("What could we improve?")).toBeNull();
  });

  it("submits a valid form and shows the template's success moment", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const snap = makeSnapshot("REVIEW"); // parcel: calm
    render(<FormRenderer snapshot={snap} mode="preview" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByLabelText("5 of 5"));
    fireEvent.change(screen.getByLabelText(/your review/i), {
      target: { value: "Genuinely a great product for our team." },
    });
    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Jane Doe" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText(snap.content.submitButtonText));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0]![0];
    expect(payload.consent.canPublishText).toBe(true);
    expect(payload.answers.name).toBe("Jane Doe");
    await screen.findByText(snap.content.successMessage);
  });

  it("navigates a staged flow forward and back", () => {
    const snap = makeSnapshot("CUSTOMER_STORY"); // ledger: staged pages
    render(<FormRenderer snapshot={snap} mode="preview" />);
    expect(screen.getByText(/page 1 of/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Sam" },
    });
    fireEvent.click(screen.getByText("Next page"));
    expect(screen.getByText(/page 2 of/i)).toBeTruthy();

    fireEvent.click(screen.getByText("Previous page"));
    expect(screen.getByText(/page 1 of/i)).toBeTruthy();
  });

  it("blocks advancing a staged flow past an invalid required field", () => {
    const snap = makeSnapshot("CUSTOMER_STORY");
    render(<FormRenderer snapshot={snap} mode="preview" />);
    fireEvent.click(screen.getByText("Next page"));
    expect(screen.getByText(/page 1 of/i)).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("requires one of the record-or-write pair before submitting", async () => {
    const snap = makeSnapshot("TESTIMONIAL"); // aperture: video + text escape
    render(<FormRenderer snapshot={snap} mode="preview" />);
    // Step 1 is the rating; pick one to advance to the record-or-write moment.
    fireEvent.click(screen.getByLabelText("5 of 5"));
    await screen.findAllByText(/record a quick video/i);
    fireEvent.click(screen.getByText("Continue"));
    expect(
      await screen.findByText(/record a quick video or write a few words/i),
    ).toBeTruthy();
  });
});
