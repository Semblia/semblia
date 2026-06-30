import type { ButtonStyle } from "@workspace/brand-theme";
import type { CompiledDesign, PublicSnapshot } from "@workspace/forms-core";

/**
 * Build the self-contained stylesheet for a snapshot. Pure string building so
 * it is identical across SSR, client mount, iframe, and Shadow DOM hosts — the
 * renderer never depends on Tailwind or any host stylesheet. All visual values
 * resolve from the `--tf-*` custom properties brand-theme's compiler emits, so
 * the skin always tracks the AA-clamped derived theme.
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

function buttonStyleOf(design: CompiledDesign): ButtonStyle {
  const scheme = design.theme.schemes.light ?? design.theme.schemes.dark;
  return scheme?.buttonStyle ?? "solid";
}

/** The data-* attributes the root element needs for the CSS variants to apply. */
export function rootDataAttributes(
  snapshot: PublicSnapshot,
  scheme: "light" | "dark" | "system",
): Record<string, string> {
  return {
    "data-scheme": scheme,
    "data-field-style": snapshot.design.fieldStyle,
    "data-bg-style": snapshot.design.backgroundStyle,
    "data-button-style": buttonStyleOf(snapshot.design),
    "data-layout": snapshot.layoutPreset,
  };
}

export function buildFormStylesheet(
  snapshot: PublicSnapshot,
  options: StylesheetOptions = {},
): string {
  const s = options.scopeSelector ?? ".tf-root";
  const { cssVars, mode } = snapshot.design;

  // ── Scheme variables ───────────────────────────────────────────────────────
  const schemeBlocks: string[] = [];
  if (cssVars.light) {
    schemeBlocks.push(varsBlock(`${s}[data-scheme="light"]`, cssVars.light));
    schemeBlocks.push(varsBlock(`${s}[data-scheme="system"]`, cssVars.light));
  }
  if (cssVars.dark) {
    schemeBlocks.push(varsBlock(`${s}[data-scheme="dark"]`, cssVars.dark));
  }
  if (cssVars.dark && mode === "system") {
    schemeBlocks.push(
      `@media (prefers-color-scheme: dark) {\n${varsBlock(
        `${s}[data-scheme="system"]`,
        cssVars.dark,
      )}\n}`,
    );
  }

  // ── Base skin ────────────────────────────────────────────────────────────────
  const base = `
${s} { all: revert; box-sizing: border-box; color: var(--tf-text); font-family: var(--tf-font); -webkit-font-smoothing: antialiased; }
${s} *, ${s} *::before, ${s} *::after { box-sizing: border-box; }
${s} .tf-page { min-height: 100%; width: 100%; background: var(--tf-bg); color: var(--tf-text); display: flex; }
${s}[data-bg-style="gradient"] .tf-page { background: linear-gradient(160deg, var(--tf-bg), var(--tf-accent-soft)); }
${s}[data-bg-style="softPattern"] .tf-page { background-color: var(--tf-bg); background-image: radial-gradient(var(--tf-border) 1px, transparent 1px); background-size: 22px 22px; }

${s} .tf-shell { width: 100%; display: flex; flex-direction: column; }
${s} .tf-logo { max-height: 44px; width: auto; object-fit: contain; margin-bottom: var(--tf-space); }
${s} .tf-title { font-size: clamp(1.3rem, 4vw, 1.75rem); line-height: 1.15; font-weight: 700; margin: 0; letter-spacing: -0.02em; }
${s} .tf-description { color: var(--tf-text-muted); margin: calc(var(--tf-space) * 0.55) 0 0; font-size: 1rem; line-height: 1.65; }
${s} .tf-intro { color: var(--tf-text-muted); margin-top: var(--tf-space); line-height: 1.65; }

${s} .tf-card {
  background: var(--tf-surface-raised);
  border: var(--tf-border-width) solid var(--tf-border);
  border-radius: var(--tf-radius);
  box-shadow: var(--tf-shadow);
  padding: calc(var(--tf-section-gap) * 0.85) var(--tf-section-gap);
}

${s} .tf-fields { display: flex; flex-direction: column; gap: var(--tf-field-gap); }
${s} .tf-field { display: flex; flex-direction: column; gap: calc(var(--tf-space) * 0.5); }
${s} .tf-label { font-weight: 600; font-size: 0.95rem; line-height: 1.3; }
${s} .tf-required { color: var(--tf-accent); margin-left: 2px; }
${s} .tf-help { color: var(--tf-text-muted); font-size: 0.82rem; margin: 0; line-height: 1.55; }
${s} .tf-error { color: #d4183d; font-size: 0.82rem; margin: 0; line-height: 1.55; }
${s}[data-scheme="dark"] .tf-error, ${s}[data-scheme="system"] .tf-error { color: #ff8da3; }

${s} .tf-input, ${s} .tf-textarea, ${s} .tf-select {
  width: 100%; font: inherit; font-size: 1rem; line-height: 1.5; color: var(--tf-text);
  background: var(--tf-surface);
  border: 1px solid var(--tf-border-strong);
  border-radius: var(--tf-radius-field);
  padding: var(--tf-field-pad);
  outline: none;
  transition: border-color .2s ease, box-shadow .2s ease, background .15s ease;
  appearance: none; -webkit-appearance: none;
}
${s} .tf-textarea { min-height: 120px; resize: vertical; line-height: 1.6; }
${s} .tf-select { cursor: pointer; }
${s} .tf-input:focus, ${s} .tf-textarea:focus, ${s} .tf-select:focus {
  border-color: var(--tf-accent);
  box-shadow: 0 0 0 3px var(--tf-focus-ring), 0 1px 3px rgba(0,0,0,.06);
}
${s} .tf-input::placeholder, ${s} .tf-textarea::placeholder { color: var(--tf-text-muted); opacity: .75; }

${s}[data-field-style="filled"] .tf-input, ${s}[data-field-style="filled"] .tf-textarea, ${s}[data-field-style="filled"] .tf-select {
  background: var(--tf-accent-soft); border-color: transparent;
}
${s}[data-field-style="filled"] .tf-input:focus, ${s}[data-field-style="filled"] .tf-textarea:focus {
  border-color: var(--tf-accent); background: var(--tf-surface);
  box-shadow: 0 0 0 3px var(--tf-focus-ring);
}
${s}[data-field-style="underline"] .tf-input, ${s}[data-field-style="underline"] .tf-textarea, ${s}[data-field-style="underline"] .tf-select {
  background: transparent; border: 0; border-bottom: 2px solid var(--tf-border-strong); border-radius: 0; padding-left: 2px; padding-right: 2px;
}
${s}[data-field-style="underline"] .tf-input:focus, ${s}[data-field-style="underline"] .tf-textarea:focus {
  box-shadow: none; border-bottom-color: var(--tf-accent);
}

${s} .tf-rating { display: flex; gap: calc(var(--tf-space) * 0.6); flex-wrap: wrap; }
${s} .tf-rating-btn {
  font: inherit; cursor: pointer;
  border: 1.5px solid var(--tf-border-strong);
  background: var(--tf-surface); color: var(--tf-text-muted);
  min-width: 44px; height: 44px; padding: 0 12px;
  border-radius: var(--tf-radius-field);
  display: inline-flex; align-items: center; justify-content: center;
  transition: all .15s cubic-bezier(0.16, 1, 0.3, 1);
  font-weight: 500;
}
${s} .tf-rating-btn:hover:not([aria-pressed="true"]) {
  border-color: var(--tf-accent); color: var(--tf-accent);
  background: var(--tf-accent-soft); transform: translateY(-1px);
}
${s} .tf-rating-btn[aria-pressed="true"] {
  background: var(--tf-accent); color: var(--tf-accent-text); border-color: var(--tf-accent);
  transform: translateY(-1px); box-shadow: 0 2px 8px var(--tf-focus-ring);
}
${s} .tf-rating[data-style="stars"] .tf-rating-btn,
${s} .tf-rating[data-style="hearts"] .tf-rating-btn,
${s} .tf-rating[data-style="emoji"] .tf-rating-btn {
  border: 0; background: transparent; font-size: 1.85rem; min-width: 44px; min-height: 44px; padding: 0;
}
${s} .tf-rating[data-style="stars"] .tf-rating-btn:hover,
${s} .tf-rating[data-style="hearts"] .tf-rating-btn:hover {
  background: transparent; border: 0; color: var(--tf-accent); transform: scale(1.12);
}
${s} .tf-rating[data-style="stars"] .tf-rating-btn[aria-pressed="true"],
${s} .tf-rating[data-style="hearts"] .tf-rating-btn[aria-pressed="true"] {
  color: var(--tf-accent); background: transparent; border: 0; transform: scale(1.12); box-shadow: none;
}

${s} .tf-options { display: flex; flex-direction: column; gap: calc(var(--tf-space) * 0.55); }
${s} .tf-option {
  display: flex; align-items: center; gap: 10px; cursor: pointer;
  border: 1.5px solid var(--tf-border-strong); background: var(--tf-surface);
  border-radius: var(--tf-radius-field); padding: var(--tf-field-pad);
  transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
}
${s} .tf-option:hover:not([data-selected="true"]) { border-color: var(--tf-accent); }
${s} .tf-option[data-selected="true"] {
  border-color: var(--tf-accent); background: var(--tf-accent-soft);
  color: var(--tf-accent-soft-text);
  box-shadow: 0 0 0 1px var(--tf-accent);
}
${s} .tf-option input { accent-color: var(--tf-accent); }

${s} .tf-consent { display: flex; align-items: flex-start; gap: 10px; line-height: 1.55; font-size: 0.92rem; }
${s} .tf-consent input { margin-top: 3px; accent-color: var(--tf-accent); width: 17px; height: 17px; flex-shrink: 0; }

${s} .tf-upload {
  border: 1.5px dashed var(--tf-border-strong); border-radius: var(--tf-radius-field);
  padding: calc(var(--tf-space) * 1.6); text-align: center; color: var(--tf-text-muted);
  background: var(--tf-surface); cursor: pointer;
  transition: border-color .15s ease, background .15s ease;
}
${s} .tf-upload:hover { border-color: var(--tf-accent); background: var(--tf-accent-soft); }

${s} .tf-actions { display: flex; align-items: center; gap: var(--tf-space); margin-top: calc(var(--tf-section-gap) * 0.85); flex-wrap: wrap; }

${s} .tf-btn {
  font: inherit; font-size: 1rem; font-weight: 600; cursor: pointer;
  border-radius: var(--tf-radius-field);
  padding: var(--tf-field-pad);
  padding-left: calc(var(--tf-space) * 1.75);
  padding-right: calc(var(--tf-space) * 1.75);
  border: 1px solid transparent;
  transition: all .16s cubic-bezier(0.16, 1, 0.3, 1);
  line-height: 1; display: inline-flex; align-items: center; justify-content: center;
  min-height: 2.5rem; letter-spacing: -0.01em;
}
${s} .tf-btn:disabled { opacity: .5; cursor: not-allowed; }
${s} .tf-btn:active:not(:disabled) { transform: scale(0.978) translateY(1px); }

${s}[data-button-style="solid"] .tf-btn-primary {
  background: var(--tf-accent); color: var(--tf-accent-text);
  box-shadow: 0 1px 2px rgba(0,0,0,.1);
}
${s}[data-button-style="solid"] .tf-btn-primary:hover:not(:disabled) {
  background: var(--tf-accent-hover);
  box-shadow: 0 4px 16px var(--tf-focus-ring), 0 1px 3px rgba(0,0,0,.12);
  transform: translateY(-1px);
}
${s}[data-button-style="soft"] .tf-btn-primary { background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); }
${s}[data-button-style="soft"] .tf-btn-primary:hover:not(:disabled) { filter: brightness(0.96); transform: translateY(-1px); }
${s}[data-button-style="outline"] .tf-btn-primary { background: transparent; color: var(--tf-accent); border-color: var(--tf-accent); }
${s}[data-button-style="outline"] .tf-btn-primary:hover:not(:disabled) { background: var(--tf-accent-soft); transform: translateY(-1px); }
${s} .tf-btn-ghost { background: transparent; color: var(--tf-text-muted); border-color: var(--tf-border-strong); }
${s} .tf-btn-ghost:hover:not(:disabled) { color: var(--tf-text); background: var(--tf-surface); }

${s} .tf-progress { height: 3px; background: var(--tf-border); border-radius: 999px; overflow: hidden; margin-bottom: var(--tf-section-gap); }
${s} .tf-progress-bar { height: 100%; background: var(--tf-accent); border-radius: 999px; transition: width .35s cubic-bezier(0.16, 1, 0.3, 1); }
${s} .tf-step-count { font-size: 0.78rem; color: var(--tf-text-muted); margin-bottom: calc(var(--tf-space) * 0.5); letter-spacing: 0.01em; }

@keyframes tf-enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes tf-appear { from { opacity: 0; transform: scale(0.86); } to { opacity: 1; transform: scale(1); } }

${s} .tf-form { animation: tf-enter .22s cubic-bezier(0.16, 1, 0.3, 1) both; }
${s} .tf-thankyou, ${s} .tf-closed { text-align: center; padding: calc(var(--tf-section-gap) * 1.2) 0; animation: tf-enter .28s cubic-bezier(0.16, 1, 0.3, 1) both; }
${s} .tf-thankyou-icon {
  width: 56px; height: 56px; border-radius: 999px;
  background: var(--tf-accent-soft); color: var(--tf-accent);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 1.5rem; margin-bottom: var(--tf-space);
  animation: tf-appear .3s cubic-bezier(0.16, 1, 0.3, 1) .12s both;
  box-shadow: 0 0 0 6px var(--tf-focus-ring);
}
${s} .tf-thankyou-title { font-size: 1.35rem; font-weight: 700; margin: 0 0 6px; letter-spacing: -0.015em; }
${s} .tf-thankyou-message, ${s} .tf-closed-message { color: var(--tf-text-muted); margin: 0; line-height: 1.65; }

${s} .tf-attribution { margin-top: calc(var(--tf-section-gap) * 0.8); font-size: 0.78rem; color: var(--tf-text-muted); text-align: center; }
${s} .tf-attribution a { color: inherit; text-decoration: none; border-bottom: 1px solid var(--tf-border-strong); transition: color .15s ease; }
${s} .tf-attribution a:hover { color: var(--tf-text); }
${s} .tf-hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }

/* ── Layout presets ───────────────────────────────────────────────────────── */
${s}[data-layout="centeredCard"] .tf-page { align-items: center; justify-content: center; padding: var(--tf-section-gap); }
${s}[data-layout="centeredCard"] .tf-shell { max-width: 560px; }

${s}[data-layout="fullPage"] .tf-page { align-items: flex-start; justify-content: center; padding: calc(var(--tf-section-gap) * 1.4) var(--tf-section-gap); }
${s}[data-layout="fullPage"] .tf-shell { max-width: 700px; }
${s}[data-layout="fullPage"] .tf-card { background: transparent; border: 0; box-shadow: none; padding: 0; }
${s}[data-layout="fullPage"] .tf-title { font-size: clamp(1.5rem, 5vw, 2.1rem); }

${s}[data-layout="splitHero"] .tf-page { align-items: stretch; justify-content: stretch; padding: 0; }
${s}[data-layout="splitHero"] .tf-shell { flex-direction: row; max-width: none; min-height: 100%; }
${s}[data-layout="splitHero"] .tf-hero {
  flex: 1 1 42%; background: var(--tf-accent); color: var(--tf-accent-text);
  padding: calc(var(--tf-section-gap) * 1.5); display: flex; flex-direction: column; justify-content: center; gap: var(--tf-space);
}
${s}[data-layout="splitHero"] .tf-hero .tf-title,
${s}[data-layout="splitHero"] .tf-hero .tf-description { color: var(--tf-accent-text); }
${s}[data-layout="splitHero"] .tf-hero .tf-title { font-size: clamp(1.5rem, 5vw, 2.2rem); }
${s}[data-layout="splitHero"] .tf-hero .tf-description { opacity: .88; }
${s}[data-layout="splitHero"] .tf-form-pane { flex: 1 1 58%; display: flex; align-items: center; justify-content: center; padding: calc(var(--tf-section-gap) * 1.25); overflow-y: auto; }
${s}[data-layout="splitHero"] .tf-form-pane .tf-shell-inner { width: 100%; max-width: 460px; }

${s}[data-layout="oneQuestion"] .tf-page { align-items: center; justify-content: center; padding: var(--tf-section-gap); min-height: 100%; }
${s}[data-layout="oneQuestion"] .tf-shell { max-width: 640px; }
${s}[data-layout="oneQuestion"] .tf-title { font-size: clamp(1.5rem, 5vw, 2.2rem); }
${s}[data-layout="oneQuestion"] .tf-description { font-size: 1.1rem; }
${s}[data-layout="oneQuestion"] .tf-step-count { font-size: 0.72rem; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: calc(var(--tf-space) * 0.8); }
${s}[data-layout="oneQuestion"] .tf-step-field .tf-label { font-size: 1.35rem; font-weight: 700; letter-spacing: -0.015em; line-height: 1.3; }
${s}[data-layout="oneQuestion"] .tf-actions { margin-top: calc(var(--tf-section-gap) * 1.1); }

@media (max-width: 720px) {
  ${s}[data-layout="splitHero"] .tf-shell { flex-direction: column; }
  ${s}[data-layout="splitHero"] .tf-hero { flex-basis: auto; padding: var(--tf-section-gap); }
  ${s} .tf-title { font-size: 1.4rem; }
}

@media (prefers-reduced-motion: reduce) {
  ${s} * { transition: none !important; animation: none !important; }
}
`;

  return `${schemeBlocks.join("\n")}\n${base}`.trim();
}
