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
/**
 * Structural + accessibility bones shared by every template, in the order a
 * respondent meets them: the reset, the field shell, the controls, then the
 * page furniture. Deliberately taste-free — personality lives in the packs.
 *
 * Split into named parts rather than one blob: the controls section is where
 * every "this looks unstyled" defect has lived, and it should be findable
 * without scrolling past a reset and a media recorder to reach it.
 */
function baseBones(s: string): string {
  return [
    resetBones(s),
    fieldBones(s),
    choiceControlBones(s),
    ratingControlBones(s),
    consentBones(s),
    captureBones(s),
    pageFurnitureBones(s),
  ].join("\n");
}

/** Reset + the one focus ring every control inherits. */
function resetBones(s: string): string {
  return `
${s} { all: revert; box-sizing: border-box; color: var(--tf-text); font-family: var(--tf-font); -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
${s} *, ${s} *::before, ${s} *::after { box-sizing: border-box; margin: 0; }
${s} img { max-width: 100%; }
${s} :focus-visible { outline: 2px solid var(--tf-focus-ring); outline-offset: 2px; border-radius: 4px; }
`;
}

/** The field shell: label, required marker, help, error, text inputs. */
function fieldBones(s: string): string {
  return `
${s} .tf-field { display: flex; flex-direction: column; }
${s} .tf-label { display: block; font-weight: 600; color: var(--tf-text); margin-bottom: 6px; }
${s} .tf-required { margin-left: 4px; color: var(--tf-accent); font-weight: 500; }
${s} .tf-help { margin: -2px 0 8px; font-size: 13.5px; line-height: 1.5; color: var(--tf-text-muted); }
${s} .tf-error { margin: 6px 0 0; font-size: 13.5px; line-height: 1.45; color: #d33d47; }
${s}[data-scheme="dark"] .tf-error { color: #ff8589; }

${s} .tf-input, ${s} .tf-textarea { width: 100%; border: var(--tf-border-width) solid var(--tf-border-strong); border-radius: var(--tf-radius-field); background: var(--tf-bg); color: var(--tf-text); font: inherit; font-size: 15.5px; padding: var(--tf-field-pad); transition: border-color 140ms ease, box-shadow 140ms ease; }
${s} .tf-input:hover, ${s} .tf-textarea:hover { border-color: color-mix(in oklab, var(--tf-border-strong) 62%, var(--tf-text)); }
${s} .tf-input:focus-visible, ${s} .tf-textarea:focus-visible { outline: none; border-color: var(--tf-accent); box-shadow: 0 0 0 3px var(--tf-focus-ring); }
/* Resizable: a testimonial box people can grow is the difference between two
   sentences and the paragraph the owner actually wants. */
${s} .tf-textarea { min-height: 132px; resize: vertical; overflow-y: auto; line-height: 1.55; }
${s} .tf-input::placeholder, ${s} .tf-textarea::placeholder { color: var(--tf-text-muted); opacity: 0.85; }
`;
}

/** Single- and multi-select: the option row and its drawn box or radio. */
function choiceControlBones(s: string): string {
  return `
${s} .tf-options { display: flex; flex-direction: column; gap: 8px; }
${s} .tf-option { position: relative; display: flex; align-items: center; gap: 10px; padding: 11px 14px; border: var(--tf-border-width) solid var(--tf-border-strong); border-radius: var(--tf-radius-field); background: var(--tf-surface); cursor: pointer; font-size: 15px; color: var(--tf-text); }
${s} .tf-option[data-selected="true"] { border-color: var(--tf-accent); background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); }
/* The row is the focus target, not the box inside it — without this the drawn
   control also picks up the global :focus-visible ring and the option wears
   two. */
${s} .tf-option:has(input:focus-visible) { outline: 2px solid var(--tf-focus-ring); outline-offset: 2px; }
${s} .tf-option input:focus-visible { outline: none; }

/* The box and the radio are drawn, not tinted. Handing the platform control a
   hue leaves it at a platform size, with platform corners, in a colour the
   theme can only nudge — the one element on a branded form that still looked
   like the operating system. Packs that hide the input entirely (Ledger,
   Terminal) override this and are unaffected. */
${s} .tf-option input, ${s} .tf-consent input { appearance: none; -webkit-appearance: none; position: relative; flex: none; width: 18px; height: 18px; margin: 0; border: var(--tf-border-width) solid var(--tf-border-strong); background: var(--tf-bg); cursor: pointer; transition: background 120ms ease, border-color 120ms ease; }
${s} .tf-option input[type="checkbox"], ${s} .tf-consent input { border-radius: 5px; }
${s} .tf-option input[type="radio"] { border-radius: 50%; }
${s} .tf-option input:hover, ${s} .tf-consent input:hover { border-color: var(--tf-accent); }
${s} .tf-option input:checked, ${s} .tf-consent input:checked { background: var(--tf-accent); border-color: var(--tf-accent); }
${s} .tf-option input[type="checkbox"]:checked::after, ${s} .tf-consent input:checked::after { content: ""; position: absolute; inset: 0; margin: auto; width: 5px; height: 9px; border: solid var(--tf-accent-text); border-width: 0 2px 2px 0; transform: translateY(-1px) rotate(45deg); }
${s} .tf-option input[type="radio"]:checked::after { content: ""; position: absolute; inset: 0; margin: auto; width: 6px; height: 6px; border-radius: 50%; background: var(--tf-accent-text); }
${s} .tf-option input:disabled { opacity: 0.5; cursor: not-allowed; }
`;
}

/** The rating scale — drawn marks, plus defaults for the textual styles. */
function ratingControlBones(s: string): string {
  return `
/* Rating marks are drawn paths sized by --tf-rating-size, not text sized by
   font-size, so a pack scales the control by setting one variable. */
${s} .tf-rating { display: flex; gap: 4px; }
${s} .tf-rating-btn { appearance: none; border: 0; background: transparent; cursor: pointer; font: inherit; font-size: var(--tf-rating-size, 30px); line-height: 1; padding: 2px; border-radius: 6px; color: var(--tf-border-strong); transition: color 130ms ease, transform 130ms cubic-bezier(0.2, 0.8, 0.2, 1); }
${s} .tf-rating-btn[data-on="true"] { color: var(--tf-accent); }
${s} .tf-rating-btn:hover { transform: scale(1.08); }
${s} .tf-rating-btn:active { transform: scale(0.94); }
${s} .tf-rating-glyph { display: block; width: var(--tf-rating-size, 30px); height: var(--tf-rating-size, 30px); fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linejoin: round; transition: fill 130ms ease; }
${s} .tf-rating-btn[data-on="true"] .tf-rating-glyph { fill: currentColor; }
/* The textual styles get a default look, wrapped in :where() so it carries no
   specificity: a pack that designs its own number chips (Terminal) still wins
   with a plain \`.tf-rating-btn\` rule. */
${s} :where(.tf-rating[data-style="emoji"]) .tf-rating-btn { filter: grayscale(1); opacity: 0.4; transition: filter 130ms ease, opacity 130ms ease, transform 130ms ease; }
${s} :where(.tf-rating[data-style="emoji"]) .tf-rating-btn[data-on="true"] { filter: none; opacity: 1; }
${s} :where(.tf-rating[data-style="numbers"]) .tf-rating-btn { min-width: 42px; height: 42px; font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; border: var(--tf-border-width) solid var(--tf-border-strong); border-radius: var(--tf-radius-field); color: var(--tf-text); }
${s} :where(.tf-rating[data-style="numbers"]) .tf-rating-btn[data-on="true"] { border-color: var(--tf-accent); background: var(--tf-accent); color: var(--tf-accent-text); }
`;
}

/** The consent line — the one control a testimonial form cannot ship without. */
function consentBones(s: string): string {
  return `
${s} .tf-consent { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; line-height: 1.5; color: var(--tf-text-muted); cursor: pointer; margin-top: 4px; }
${s} .tf-consent input { margin-top: 1px; }

${s} .tf-upload { display: inline-flex; align-items: center; gap: 8px; padding: var(--tf-field-pad); border: 1.5px dashed var(--tf-border-strong); border-radius: var(--tf-radius-field); color: var(--tf-text-muted); font-size: 14.5px; cursor: pointer; }
${s} .tf-upload:hover { border-color: var(--tf-accent); color: var(--tf-text); }
`;
}

/** Upload and in-browser record/playback. */
function captureBones(s: string): string {
  return `
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
`;
}

/** Attribution, honeypot, showcase mode, the trust ledger, reduced motion. */
function pageFurnitureBones(s: string): string {
  return `
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
