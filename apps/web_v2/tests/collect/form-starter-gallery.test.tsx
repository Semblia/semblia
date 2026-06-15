import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormStarterGallery } from "@/components/collect/form-starter-gallery";

describe("FormStarterGallery", () => {
  it("reports the chosen starter and the blank option", () => {
    const onSelect = vi.fn();
    render(<FormStarterGallery onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: /quick testimonial/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]![0]).toMatchObject({
      id: "quick-testimonial",
    });

    fireEvent.click(screen.getByRole("button", { name: /blank form/i }));
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect.mock.calls[1]![0]).toBeNull();
  });

  it("disables the cards while busy", () => {
    const onSelect = vi.fn();
    render(<FormStarterGallery onSelect={onSelect} busy />);
    fireEvent.click(screen.getByRole("button", { name: /quick testimonial/i }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
