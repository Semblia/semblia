import type { PublicSnapshot } from "@workspace/forms-core";
import { resolveTemplatePack } from "./templates/registry.js";

/**
 * Build the self-contained stylesheet for a snapshot. Pure string building so
 * it is identical across SSR, client mount, iframe, and Shadow DOM hosts — the
 * renderer never depends on Tailwind or any host stylesheet.
 *
 * Three layers, all deterministic per snapshot (cacheable by configEtag):
 * 1. scheme variables — the AA-clamped `--tf-*` tokens compiled at publish;
 * 2. base bones — structural/accessibility CSS every template builds on;
 * 3. the template pack's personality stylesheet, scoped to its template id.
 */

export interface StylesheetOptions {
  /** Selector for the root element the variables and rules scope under. */
  scopeSelector?: string;
}

function varsBlock(
  selector: string,
  vars: Record<string, string> | undefined,
): string {
  if (!vars) return "";
  const body = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `${selector} {\n${body}\n}`;
}

/** The data-* attributes the root element needs for the CSS to apply. */
export function rootDataAttributes(
  snapshot: PublicSnapshot,
  scheme: "light" | "dark" | "system",
  surface: "hosted" | "embed" = "hosted",
  mode: "live" | "preview" | "showcase" = "live",
): Record<string, string> {
  const attrs: Record<string, string> = {
    "data-scheme": scheme,
    "data-tf-template": snapshot.template.templateId,
    "data-tf-surface": surface,
    "data-tf-mode": mode,
  };
  for (const [key, value] of Object.entries(snapshot.template.accents)) {
    attrs[`data-a-${key}`] = value;
  }
  return attrs;
}

/**
 * Structural + accessibility bones shared by every template: reset, focus
 * visibility, field shell semantics, error/help text, honeypot concealment,
 * attribution, and the global reduced-motion guard. Deliberately taste-free —
 * personality lives in the packs.
 */
function baseBones(s: string): string {
  return `
${s} { all: revert; box-sizing: border-box; color: var(--tf-text); font-family: var(--tf-font); -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
${s} *, ${s} *::before, ${s} *::after { box-sizing: border-box; margin: 0; }
${s} img { max-width: 100%; }
${s} :focus-visible { outline: 2px solid var(--tf-focus-ring); outline-offset: 2px; border-radius: 4px; }

${s} .tf-field { display: flex; flex-direction: column; }
${s} .tf-label { display: block; font-weight: 600; color: var(--tf-text); }
${s} .tf-required { color: var(--tf-accent); margin-left: 3px; }
${s} .tf-help { margin: 2px 0 8px; font-size: 13.5px; line-height: 1.5; color: var(--tf-text-muted); }
${s} .tf-error { margin: 6px 0 0; font-size: 13.5px; line-height: 1.45; color: #d33d47; }
${s}[data-scheme="dark"] .tf-error { color: #ff8589; }

${s} .tf-input, ${s} .tf-textarea { width: 100%; border: var(--tf-border-width) solid var(--tf-border-strong); border-radius: var(--tf-radius-field); background: var(--tf-bg); color: var(--tf-text); font: inherit; font-size: 15.5px; padding: var(--tf-field-pad); }
${s} .tf-input:focus-visible, ${s} .tf-textarea:focus-visible { outline: none; border-color: var(--tf-accent); box-shadow: 0 0 0 3px var(--tf-focus-ring); }
${s} .tf-textarea { min-height: 140px; resize: none; overflow-y: auto; line-height: 1.55; }
${s} .tf-input::placeholder, ${s} .tf-textarea::placeholder { color: var(--tf-text-muted); opacity: 0.75; }

${s} .tf-options { display: flex; flex-direction: column; gap: 8px; }
${s} .tf-option { position: relative; display: flex; align-items: center; gap: 10px; padding: 11px 14px; border: var(--tf-border-width) solid var(--tf-border-strong); border-radius: var(--tf-radius-field); background: var(--tf-surface); cursor: pointer; font-size: 15px; color: var(--tf-text); }
${s} .tf-option[data-selected="true"] { border-color: var(--tf-accent); background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); }
${s} .tf-option input { accent-color: var(--tf-accent); }
${s} .tf-option:has(input:focus-visible) { outline: 2px solid var(--tf-focus-ring); outline-offset: 2px; }

${s} .tf-rating { display: flex; gap: 4px; }
${s} .tf-rating-btn { appearance: none; border: 0; background: transparent; cursor: pointer; font-size: 30px; line-height: 1; padding: 2px; color: var(--tf-border-strong); }
${s} .tf-rating-btn[aria-pressed="true"] { color: var(--tf-accent); }

${s} .tf-consent { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; line-height: 1.5; color: var(--tf-text-muted); cursor: pointer; margin-top: 4px; }
${s} .tf-consent input { margin-top: 2px; accent-color: var(--tf-accent); }

${s} .tf-upload { display: inline-flex; align-items: center; gap: 8px; padding: var(--tf-field-pad); border: 1.5px dashed var(--tf-border-strong); border-radius: var(--tf-radius-field); color: var(--tf-text-muted); font-size: 14.5px; cursor: pointer; }
${s} .tf-upload:hover { border-color: var(--tf-accent); color: var(--tf-text); }

${s} .tf-capture-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
${s} .tf-capture-btn { display: inline-flex; align-items: center; gap: 10px; padding: var(--tf-field-pad); border: var(--tf-border-width) solid var(--tf-border-strong); border-radius: 999px; background: var(--tf-surface); cursor: pointer; font: inherit; font-size: 15px; color: var(--tf-text); }
${s} .tf-capture-btn[data-recording] { border-color: #e5484d; }
${s} .tf-capture-btn[data-recording] .tf-capture-dot { animation: tf-rec-pulse 1.1s ease-in-out infinite; }
${s} .tf-capture-dot { width: 12px; height: 12px; border-radius: 50%; background: #e5484d; }
${s} .tf-capture-upload { font-size: 13.5px; color: var(--tf-text-muted); cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
${s} .tf-capture-upload:hover { color: var(--tf-text); }
${s} .tf-capture-file, ${s} .tf-capture-hint { margin: 6px 0 0; font-size: 13px; color: var(--tf-text-muted); }
${s} .tf-rec-stage { display: none; margin: 0 0 10px; }
${s} .tf-rec-stage[data-active="true"] { display: block; }
${s} .tf-rec-live, ${s} .tf-rec-play { width: 100%; max-width: 420px; aspect-ratio: 4 / 3; border-radius: var(--tf-radius-field); background: #000; object-fit: cover; display: block; }
${s} .tf-rec-audio { display: block; width: 100%; max-width: 420px; margin: 0 0 10px; }
@keyframes tf-rec-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }

${s} .tf-attribution { margin: 18px 0 0; font-size: 12.5px; color: var(--tf-text-muted); text-align: center; }
${s} .tf-attribution a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }

${s} .tf-hp, ${s} .tf-sr-only { position: absolute !important; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* Showcase (display-only) mode: fields can't be filled — the viewer is looking,
   not answering. Navigation controls live outside [data-tf-field] and stay live. */
${s}[data-tf-mode="showcase"] [data-tf-field] :is(input, textarea, select, button, a, label) { pointer-events: none; }
${s}[data-tf-mode="showcase"] [data-tf-field] { user-select: none; }

${s} .tf-trust { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; }
${s} .tf-trust li { display: flex; align-items: baseline; gap: 8px; font-size: 13.5px; line-height: 1.5; color: var(--tf-text-muted); }
${s} .tf-trust li::before { content: ""; flex: none; width: 5px; height: 5px; border-radius: 50%; background: var(--tf-accent); transform: translateY(-2px); }

@media (prefers-reduced-motion: reduce) {
  ${s} *, ${s} *::before, ${s} *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}
`;
}

export function buildFormStylesheet(
  snapshot: PublicSnapshot,
  options: StylesheetOptions = {},
): string {
  const s = options.scopeSelector ?? ".tf-root";
  const { cssVars, appearance, templateId } = snapshot.template;

  // ── Scheme variables ───────────────────────────────────────────────────────
  const schemeBlocks: string[] = [];
  if (cssVars.light) {
    schemeBlocks.push(varsBlock(`${s}[data-scheme="light"]`, cssVars.light));
    schemeBlocks.push(varsBlock(`${s}[data-scheme="system"]`, cssVars.light));
  }
  if (cssVars.dark) {
    schemeBlocks.push(varsBlock(`${s}[data-scheme="dark"]`, cssVars.dark));
    // Dark-native templates may resolve only a dark scheme; it must apply
    // regardless of the host's requested scheme.
    if (!cssVars.light) {
      schemeBlocks.push(varsBlock(`${s}[data-scheme="light"]`, cssVars.dark));
      schemeBlocks.push(varsBlock(`${s}[data-scheme="system"]`, cssVars.dark));
    }
  }
  if (cssVars.dark && appearance === "system") {
    schemeBlocks.push(
      `@media (prefers-color-scheme: dark) {\n${varsBlock(
        `${s}[data-scheme="system"]`,
        cssVars.dark,
      )}\n}`,
    );
  }

  const pack = resolveTemplatePack(templateId);
  const packScope = `${s}[data-tf-template="${pack.id}"]`;

  return [
    schemeBlocks.join("\n"),
    baseBones(s),
    pack.stylesheet(packScope, snapshot),
  ].join("\n");
}
