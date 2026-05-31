/**
 * Vertical-slice demo: resolve the Clean (and Default) preset against a few brand
 * colors and render each through the REAL forms-core renderer to standalone HTML.
 * This is the "see it" artifact for the theme engine — open the files in a browser.
 *
 *   node packages/forms-core/scripts/render-demo.mjs
 *
 * Requires a build first (`pnpm --filter @workspace/forms-core build`) since it
 * imports from ./dist. Output lands in packages/forms-core/demo/.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_FORM_CONFIG,
  createFormViewModel,
  resolvePreset,
  resolveTheme,
} from "../dist/index.js";
import { renderHostedFormHtml } from "../dist/server.js";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "demo");
mkdirSync(outDir, { recursive: true });

/** @type {Array<{file:string,preset:"clean"|"default",brand:string,brandName:string,headline:string,appearance?:"light"|"dark"}>} */
const variants = [
  {
    file: "clean-indigo.html",
    preset: "clean",
    brand: "#4f46e5",
    brandName: "Northwind",
    headline: "How was your experience?",
  },
  {
    file: "clean-amber.html",
    preset: "clean",
    brand: "#d97706",
    brandName: "Tresta",
    headline: "Tell us your story",
  },
  {
    // Light-yellow brand: proves the AA clamp — the button label stays dark and
    // readable instead of unreadable white-on-yellow.
    file: "clean-yellow-aa.html",
    preset: "clean",
    brand: "#fde047",
    brandName: "Sunbeam",
    headline: "Share a few words",
  },
  {
    file: "clean-dark.html",
    preset: "clean",
    brand: "#4f46e5",
    brandName: "Northwind",
    headline: "How was your experience?",
    appearance: "dark",
  },
  {
    file: "default-amber.html",
    preset: "default",
    brand: "#d97706",
    brandName: "Tresta",
    headline: "How was your experience?",
  },
];

for (const v of variants) {
  const inputs = resolvePreset(v.preset, v.brand);
  if (v.appearance) inputs.appearance = v.appearance;
  const tokens = resolveTheme(inputs);
  const config = {
    ...DEFAULT_FORM_CONFIG,
    brandName: v.brandName,
    headline: v.headline,
    tokens,
  };
  const model = createFormViewModel(config);
  const html = renderHostedFormHtml({ model, actionPath: "#", submitted: false });
  writeFileSync(join(outDir, v.file), html, "utf8");
  console.log(`wrote demo/${v.file}  accent=${tokens.accent} on=${tokens.accentText}`);
}
