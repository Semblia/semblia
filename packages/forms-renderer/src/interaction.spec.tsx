import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormRenderer } from "./renderer.js";
import { makeSnapshot } from "./test-utils.js";

afterEach(cleanup);

describe("FormRenderer interactions", () => {
  it("surfaces validation errors when a required form is submitted empty", async () => {
    const snap = makeSnapshot("TESTIMONIAL");
    render(<FormRenderer snapshot={snap} mode="preview" />);
    fireEvent.click(screen.getByText(snap.content.submitButtonText));
    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    });
  });

  it("reveals a conditional field only when its condition is met", () => {
    const snap = makeSnapshot("PRODUCT_FEEDBACK");
    render(<FormRenderer snapshot={snap} mode="preview" />);
    // `improvement` only shows when rating <= 3.
    expect(screen.queryByText("What could we improve?")).toBeNull();
    fireEvent.click(screen.getByLabelText("2 of 5"));
    expect(screen.getByText("What could we improve?")).toBeTruthy();
    // A high rating hides it again.
    fireEvent.click(screen.getByLabelText("5 of 5"));
    expect(screen.queryByText("What could we improve?")).toBeNull();
  });

  it("submits a valid form and shows the thank-you screen", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const snap = makeSnapshot("REVIEW");
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

  it("navigates a stepped flow forward and back", () => {
    const snap = makeSnapshot("CUSTOMER_STORY");
    render(<FormRenderer snapshot={snap} mode="preview" />);
    expect(screen.getByText(/step 1 of/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: "Sam" },
    });
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText(/step 2 of/i)).toBeTruthy();

    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByText(/step 1 of/i)).toBeTruthy();
  });

  it("blocks advancing a stepped flow past an invalid required field", () => {
    const snap = makeSnapshot("CUSTOMER_STORY");
    render(<FormRenderer snapshot={snap} mode="preview" />);
    // Name is required; clicking Next without it should hold on step 1.
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText(/step 1 of/i)).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
