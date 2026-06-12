import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Watermark } from "@/components/collect/watermark";

describe("<Watermark />", () => {
  it("renders powered-by text", () => {
    const { getByText } = render(<Watermark position="bottom-right" />);
    expect(getByText(/Powered by Semblia/i)).not.toBeNull();
  });

  it("anchors to the correct corner via class names", () => {
    const right = render(<Watermark position="bottom-right" />);
    expect(right.container.firstChild).not.toBeNull();
    expect(
      (right.container.firstChild as Element).classList.contains("right-3"),
    ).toBe(true);

    const left = render(<Watermark position="bottom-left" />);
    expect(left.container.firstChild).not.toBeNull();
    expect(
      (left.container.firstChild as Element).classList.contains("left-3"),
    ).toBe(true);

    const center = render(<Watermark position="bottom-center" />);
    expect(center.container.firstChild).not.toBeNull();
    expect(
      (center.container.firstChild as Element).classList.contains(
        "-translate-x-1/2",
      ),
    ).toBe(true);
  });
});
