import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyProjects } from "@/components/projects/project-empty-states";

describe("EmptyProjects", () => {
  it("points first-run users at real project creation", () => {
    render(<EmptyProjects />);

    const cta = screen.getByRole("link", { name: /create project/i });
    expect(cta.getAttribute("href")).toBe("/new");
  });

  it("uses the house primary button, not a hand-rolled one", () => {
    render(<EmptyProjects />);

    // The first-run CTA is the most important filled button in the product, and
    // it used to be a hand-written <Link> without the ink-press material. It has
    // to come from `ui/button`'s default variant.
    const cta = screen.getByRole("link", { name: /create project/i });
    expect(cta.className).toContain("ink-raised");
  });

  it("teaches what a project is, and offers exactly one action", () => {
    render(<EmptyProjects />);

    expect(screen.getByText(/one product, service, or brand/i)).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
