/**
 * "See it" artifact for the hosted form. Renders the REAL forms-core renderer
 * against several rich-token bundles (the same token shape the Collect Studio
 * edits) so you can open the files in a browser and confirm that customizations
 * — color, font, radius, field shape, button style, shadow, dark mode — all
 * flow through to the public form.
 *
 *   pnpm --filter @workspace/forms-core build
 *   node packages/forms-core/scripts/render-demo.mjs
 *
 * Output lands in packages/forms-core/demo/.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_FORM_CONFIG,
  DEFAULT_FORM_TOKENS,
  createFormViewModel,
  normalizeFormConfig,
} from "../dist/index.js";
import { renderHostedFormHtml } from "../dist/server.js";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "demo");
mkdirSync(outDir, { recursive: true });

const variants = [
  {
    file: "default-indigo.html",
    brandName: "Northwind",
    headline: "How was your experience?",
    tokens: DEFAULT_FORM_TOKENS,
    layout: { flow: "all", container: "boxed", hero: "top" },
  },
  {
    file: "soft-teal.html",
    brandName: "Peach & Pine",
    headline: "Tell us your story",
    tokens: {
      ...DEFAULT_FORM_TOKENS,
      fontHead: '"DM Sans", system-ui, sans-serif',
      fontBody: '"DM Sans", system-ui, sans-serif',
      bg: "#eef7f4",
      surface: "#ffffff",
      ink: "#0b1f1c",
      inkSoft: "#4b635e",
      line: "#cfe4dd",
      accent: "#0f766e",
      accentInk: "#ffffff",
      radius: 18,
      fieldShape: "rounded",
      buttonStyle: "pill",
      shadow: "soft",
      density: "cozy",
    },
    layout: { flow: "stepped", container: "boxed", hero: "top" },
    loader: {
      enabled: true,
      style: "ring",
      durationMs: 1000,
      message: "One moment…",
    },
  },
  {
    file: "editorial-serif.html",
    brandName: "Halcyon & Co.",
    headline: "Share a few words",
    tokens: {
      ...DEFAULT_FORM_TOKENS,
      fontHead: '"Fraunces", Georgia, serif',
      fontBody: '"Georgia", serif',
      sizeHead: 40,
      weightHead: 460,
      trackingHead: -0.02,
      bg: "#f3ede0",
      surface: "#faf6ec",
      ink: "#191612",
      inkSoft: "#6d6254",
      line: "#dcd3bf",
      accent: "#b5441f",
      accentInk: "#fff8ec",
      radius: 4,
      fieldShape: "underline",
      buttonStyle: "solid",
      shadow: "sm",
      texture: "grain",
      density: "airy",
    },
    layout: { flow: "conversational", container: "split", hero: "side" },
  },
  {
    file: "brutalist.html",
    brandName: "LATTICE//01",
    headline: "Drop your feedback",
    tokens: {
      ...DEFAULT_FORM_TOKENS,
      fontHead: '"Space Grotesk", sans-serif',
      fontBody: "ui-monospace, monospace",
      sizeHead: 34,
      weightHead: 700,
      bg: "#eeece4",
      surface: "#ffffff",
      ink: "#0a0a0a",
      inkSoft: "#555551",
      line: "#0a0a0a",
      accent: "#f14a1a",
      accentInk: "#ffffff",
      radius: 0,
      fieldShape: "square",
      buttonStyle: "block",
      shadow: "hard",
      texture: "dots",
      density: "compact",
    },
    layout: { flow: "cards", container: "centered", hero: "floating" },
  },
  {
    file: "noir-dark.html",
    brandName: "Acid Atlas",
    headline: "How was your experience?",
    tokens: {
      ...DEFAULT_FORM_TOKENS,
      fontHead: '"Inter", sans-serif',
      bg: "#0d0d0e",
      surface: "#151517",
      ink: "#f4f3ef",
      inkSoft: "#8c8a84",
      line: "#26262a",
      accent: "#c8ff3e",
      accentInk: "#0d0d0e",
      radius: 10,
      buttonStyle: "solid",
      shadow: "glow",
      dark: true,
    },
    layout: { flow: "stepped", container: "fullbleed", hero: "side" },
    success: {
      title: "Signal received.",
      message: "Thanks for the transmission.",
      emoji: "⚡",
      showConfetti: true,
    },
  },
];

for (const v of variants) {
  const config = normalizeFormConfig({
    ...DEFAULT_FORM_CONFIG,
    brandName: v.brandName,
    headline: v.headline,
    tokens: v.tokens,
    ...(v.layout ? { layout: v.layout } : {}),
    ...(v.loader ? { loader: v.loader } : {}),
    ...(v.success ? { success: v.success } : {}),
  });
  const model = createFormViewModel(config);
  const html = renderHostedFormHtml({
    model,
    actionPath: "#",
    submitted: false,
  });
  writeFileSync(join(outDir, v.file), html, "utf8");
  console.log(
    `wrote demo/${v.file}  accent=${config.tokens.accent} flow=${config.layout.flow} container=${config.layout.container}`,
  );
}

// Success screen artifact (confetti + emoji), using the last variant's tokens.
{
  const last = variants[variants.length - 1];
  const config = normalizeFormConfig({
    ...DEFAULT_FORM_CONFIG,
    brandName: last.brandName,
    tokens: last.tokens,
    ...(last.success ? { success: last.success } : {}),
  });
  const html = renderHostedFormHtml({
    model: createFormViewModel(config),
    actionPath: "#",
    submitted: true,
  });
  writeFileSync(join(outDir, "success-screen.html"), html, "utf8");
  console.log("wrote demo/success-screen.html");
}
