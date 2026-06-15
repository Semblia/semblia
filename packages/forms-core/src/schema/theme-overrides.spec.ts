import { describe, expect, it } from "vitest";
import { contrastRatio } from "../color.js";
import { resolveThemeSnapshot } from "../theme.js";
import { defaultFormDefinition, publishFormDefinition } from "./publish.js";
import type { FormDefinitionDoc } from "./definition.js";

const AA = 4.5;

function withOverrides(
  ov: Partial<FormDefinitionDoc["theme"]["colorOverrides"]>,
): FormDefinitionDoc {
  const doc = defaultFormDefinition();
  return {
    ...doc,
    theme: {
      ...doc.theme,
      colorOverrides: {
        accent: null,
        background: null,
        surface: null,
        text: null,
        ...ov,
      },
    },
  };
}

describe("color overrides", () => {
  it("leaves the derived snapshot untouched when nothing is overridden", () => {
    const doc = defaultFormDefinition();
    const pub = publishFormDefinition(doc);
    const base = resolveThemeSnapshot(doc.theme.inputs);
    expect(pub.derived.schemes.light).toEqual(base.schemes.light);
  });

  it("applies an accent override and keeps the button label readable", () => {
    const base = publishFormDefinition(defaultFormDefinition()).derived.schemes
      .light!;
    const s = publishFormDefinition(withOverrides({ accent: "#16a34a" }))
      .derived.schemes.light!;
    expect(s.accent).not.toBe(base.accent);
    expect(contrastRatio(s.accentText, s.accent)).toBeGreaterThanOrEqual(3);
  });

  it("clamps a low-contrast text override up to AA against the surface", () => {
    const s = publishFormDefinition(withOverrides({ text: "#dddddd" })).derived
      .schemes.light!;
    expect(contrastRatio(s.text, s.surface)).toBeGreaterThanOrEqual(AA);
  });

  it("re-derives surface-layered tokens and keeps text readable", () => {
    const s = publishFormDefinition(withOverrides({ surface: "#101317" }))
      .derived.schemes.light!;
    expect(contrastRatio(s.text, s.surface)).toBeGreaterThanOrEqual(AA);
    expect(contrastRatio(s.mutedText, s.surface)).toBeGreaterThanOrEqual(AA);
  });
});
