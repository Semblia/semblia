import { describe, expect, it } from "vitest";
import {
  derivedThemeToCssVars,
  resolveBrandTheme,
  resolveBrandThemeSnapshot,
  type BrandThemeInputs,
} from "./index.js";

const BASE: BrandThemeInputs = {
  brandColor: "#4f46e5",
  appearance: "light",
  radius: 2,
  density: "cozy",
  typePairing: "inter",
  surfaceStyle: "bordered",
  accentIntensity: "balanced",
  neutralTone: "auto",
  buttonStyle: "solid",
};

describe("brand-theme", () => {
  it("derives deterministic cross-surface tokens", () => {
    expect(resolveBrandTheme(BASE)).toEqual(resolveBrandTheme(BASE));
  });

  it("resolves both schemes for system appearance", () => {
    const snapshot = resolveBrandThemeSnapshot({
      ...BASE,
      appearance: "system",
    });

    expect(snapshot.schemes.light?.colorScheme).toBe("light");
    expect(snapshot.schemes.dark?.colorScheme).toBe("dark");
  });

  it("emits form-compatible CSS vars for the forms-core facade", () => {
    const vars = derivedThemeToCssVars(resolveBrandTheme(BASE));

    expect(vars["--tf-accent"]).toBeDefined();
    expect(vars["--tf-font"]).toContain("Inter");
  });
});
