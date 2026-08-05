import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { V2ImportCatalogSourceDTO } from "@workspace/types";
import { SourcePicker } from "@/components/imports/source-picker";
import { sourceMonogram } from "@/components/imports/source-icons";

function source(
  overrides: Partial<V2ImportCatalogSourceDTO> = {},
): V2ImportCatalogSourceDTO {
  return {
    key: "senja",
    label: "Senja",
    group: "Wall migrations",
    modes: ["MIGRATION"],
    availability: "AVAILABLE",
    reasonCode: null,
    reason: null,
    publicHosts: ["senja.io"],
    publicHostSuffixes: [],
    oauthStrategy: null,
    requiredScopes: [],
    ...overrides,
  } as V2ImportCatalogSourceDTO;
}

/** Enough entries to cross the search threshold. */
function tools(): V2ImportCatalogSourceDTO[] {
  return [
    source(),
    source({
      key: "famewall",
      label: "Famewall",
      publicHosts: ["famewall.io"],
    }),
    source({
      key: "testimonial-to",
      label: "Testimonial.to",
      publicHosts: ["testimonial.to"],
    }),
    source({ key: "boast", label: "Boast", publicHosts: ["boast.io"] }),
    source({ key: "shapo", label: "Shapo", publicHosts: ["shapo.io"] }),
    source({ key: "taggbox", label: "Taggbox", publicHosts: ["taggbox.com"] }),
    source({ key: "walls-io", label: "Walls.io", publicHosts: ["walls.io"] }),
    source({
      key: "trustmary",
      label: "Trustmary",
      publicHosts: ["trustmary.com"],
    }),
  ];
}

describe("sourceMonogram", () => {
  it("keeps single-letter collisions apart", () => {
    // Senja, Shapo and Shoutout are all "S" on one initial — a grid of
    // identical letters is worse than no mark at all.
    expect(sourceMonogram("Senja")).toBe("Se");
    expect(sourceMonogram("Shapo")).toBe("Sh");
    expect(sourceMonogram("Boast")).toBe("Bo");
  });

  it("does not read a domain suffix as a second word", () => {
    expect(sourceMonogram("Walls.io")).toBe("Wa");
    expect(sourceMonogram("Testimonial.to")).toBe("Te");
  });

  it("uses one letter per word for a real multi-word name", () => {
    expect(sourceMonogram("Vocal Video")).toBe("VV");
    expect(sourceMonogram("Product Hunt")).toBe("PH");
  });

  it("leaves an already-short name as its own mark", () => {
    expect(sourceMonogram("G2")).toBe("G2");
  });

  it("never throws on an empty label", () => {
    expect(sourceMonogram("   ")).toBe("?");
  });
});

describe("SourcePicker", () => {
  it("filters by name and by host, and reports a miss without an empty grid", async () => {
    const user = userEvent.setup();
    render(
      <SourcePicker sources={tools()} label="Which tool?" onPick={vi.fn()} />,
    );

    const search = screen.getByRole("searchbox");
    await user.type(search, "sen");
    expect(screen.getByRole("button", { name: "Senja" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Famewall" })).toBeNull();

    // Typing a domain is the other way people name a platform.
    await user.clear(search);
    await user.type(search, "famewall.io");
    expect(screen.getByRole("button", { name: "Famewall" })).toBeTruthy();

    await user.clear(search);
    await user.type(search, "zzz");
    expect(screen.getByText(/Nothing matches/)).toBeTruthy();
  });

  it("hands the picked source back to its caller", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(
      <SourcePicker sources={tools()} label="Which tool?" onPick={onPick} />,
    );

    await user.click(screen.getByRole("button", { name: "Shapo" }));
    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({ key: "shapo" }),
    );
  });

  it("omits search entirely for a short list", () => {
    render(
      <SourcePicker
        sources={tools().slice(0, 3)}
        label="Which tool?"
        onPick={vi.fn()}
      />,
    );
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("states availability only where it decides whether the import can run", () => {
    const blocked = [
      source({ key: "x", label: "X", availability: "SETUP_REQUIRED" }),
    ];

    const { rerender } = render(
      <SourcePicker sources={blocked} label="Which?" onPick={vi.fn()} />,
    );
    expect(screen.getByText("Setup required")).toBeTruthy();

    // Attribution doesn't need the provider's API connected, so warning about
    // it there would be a warning about nothing.
    rerender(
      <SourcePicker
        sources={blocked}
        label="Which?"
        showAvailability={false}
        onPick={vi.fn()}
      />,
    );
    expect(screen.queryByText("Setup required")).toBeNull();
  });
});
