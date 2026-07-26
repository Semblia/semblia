import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyProjects } from "@/components/projects/project-empty-states";

describe("EmptyProjects", () => {
  it("points first-run users at real project creation", () => {
    render(<EmptyProjects />);

    expect(screen.getByText("Create")).toBeTruthy();
    expect(screen.getByText("Collect")).toBeTruthy();
    expect(screen.getByText("Review")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /create first project/i })
        .getAttribute("href"),
    ).toBe("/new");
  });
});
