import type { PublicSnapshot } from "@workspace/forms-core";

/**
 * Meridian's world. Hosted: a split-pane conversation — sticky brand pane
 * (who's asking, why, the trust ledger) beside a centered flow pane with
 * baseline-rule typographic inputs (the Typeform device: the input is
 * typography, not chrome). Embedded: a bordered card that earns its boundary
 * inside a host page. Everything reads from the AA-clamped `--tf-*` vars.
 */
export function meridianStylesheet(t: string, _snapshot: PublicSnapshot): string {
  const hosted = `${t}[data-tf-surface="hosted"]`;
  const embed = `${t}[data-tf-surface="embed"]`;
  return `
/* ── Hosted: the two-pane conversation ─────────────────────────────────── */
${hosted} .mrd-hosted { display: grid; grid-template-columns: minmax(340px, 5fr) 7fr; min-height: var(--tf-viewport, 100svh); background: var(--tf-bg); }

${hosted} .mrd-brand { position: sticky; top: 0; align-self: start; display: flex; flex-direction: column; justify-content: space-between; min-height: var(--tf-viewport, 100svh); padding: clamp(28px, 5vw, 64px); border-right: 1px solid var(--tf-border); background: linear-gradient(180deg, var(--tf-surface), color-mix(in oklab, var(--tf-accent) 4%, var(--tf-surface))); }
${hosted}[data-a-emphasis="confident"] .mrd-brand { background: linear-gradient(180deg, var(--tf-surface), color-mix(in oklab, var(--tf-accent) 9%, var(--tf-surface))); }
${hosted} .tf-logomark { display: inline-flex; align-items: center; justify-content: center; height: 44px; max-width: 190px; object-fit: contain; }
${hosted} .tf-logomark[data-monogram] { width: 44px; border-radius: 12px; background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); font-weight: 650; font-size: 20px; }
${hosted} .mrd-title { margin: 22px 0 12px; font-size: clamp(30px, 3.6vw, 42px); line-height: 1.06; letter-spacing: -0.028em; font-weight: 640; color: var(--tf-text); text-wrap: balance; }
${hosted} .mrd-description { margin: 0; font-size: 16px; line-height: 1.6; color: var(--tf-text-muted); max-width: 44ch; }
${hosted} .tf-trust { margin-top: 28px; }
${hosted} .mrd-brand-foot { padding-top: 24px; }
${hosted} .mrd-brand-foot .tf-attribution { margin: 0; text-align: left; }

${hosted} .mrd-flow { display: flex; align-items: center; justify-content: center; padding: clamp(24px, 6vw, 96px) clamp(20px, 5vw, 72px); }
${hosted} .mrd-flow-body { width: 100%; max-width: 560px; }

/* The answer is typography: baseline-rule inputs, no boxes. */
${hosted} .tf-label { font-size: 19px; font-weight: 600; letter-spacing: -0.012em; margin-bottom: 4px; }
${hosted} .tf-help { font-size: 15px; margin: 4px 0 10px; }
${hosted} .tf-input, ${hosted} .tf-textarea { border: 0; border-bottom: 1.5px solid var(--tf-border-strong); border-radius: 0; background: transparent; font-size: 22px; line-height: 1.45; padding: 10px 2px 12px; transition: border-color 160ms ease, box-shadow 160ms ease; }
${hosted} .tf-input:focus-visible, ${hosted} .tf-textarea:focus-visible { outline: none; border-color: var(--tf-accent); box-shadow: 0 1.5px 0 0 var(--tf-accent); }
${hosted} .tf-input::placeholder, ${hosted} .tf-textarea::placeholder { opacity: 0.45; }
${hosted} .tf-textarea { min-height: 132px; }

${hosted} .tf-options { gap: 10px; }
${hosted} .tf-option { padding: 14px 16px; font-size: 16px; border-radius: var(--tf-radius-field); transition: border-color 140ms ease, background 140ms ease; }
${hosted} .tf-option:hover { border-color: var(--tf-accent); }
${hosted} .tf-rating-btn { font-size: 38px; }

/* ── The journey chrome ─────────────────────────────────────────────────── */
${t} .mrd-track { height: 2px; border-radius: 999px; background: var(--tf-border); overflow: hidden; margin-bottom: 10px; }
${t} .mrd-track span { display: block; height: 100%; background: var(--tf-accent); transition: width 240ms cubic-bezier(0.2, 0.8, 0.2, 1); }
${t} .mrd-count { margin: 0 0 26px; font-size: 12.5px; font-variant-numeric: tabular-nums; letter-spacing: 0.04em; color: var(--tf-text-muted); }
${t} .mrd-intro { margin: 0 0 24px; font-size: 15.5px; line-height: 1.6; color: var(--tf-text); }
${t} .mrd-scene { animation: mrd-rise 240ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
${t} .mrd-scene .tf-step-field + .tf-step-field { margin-top: 28px; }
${t} .mrd-fields { display: flex; flex-direction: column; gap: var(--tf-field-gap); }

${t} .tf-actions { display: flex; align-items: center; gap: 12px; margin-top: 34px; }
${t} .tf-btn { appearance: none; border: 0; cursor: pointer; font: inherit; font-weight: 600; font-size: 15.5px; padding: 12px 24px; border-radius: var(--tf-radius-field); transition: background 140ms ease, transform 120ms ease, color 140ms ease; }
${t} .tf-btn:active { transform: translateY(1px); }
${t} .tf-btn-primary { background: var(--tf-accent); color: var(--tf-accent-text); box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.12), 0 1px 2px rgb(0 0 0 / 0.12); }
${t} .tf-btn-primary:hover { background: var(--tf-accent-hover); }
${t} .tf-btn-primary:disabled { opacity: 0.65; cursor: default; }
${t} .tf-btn-ghost { background: transparent; color: var(--tf-text-muted); }
${t} .tf-btn-ghost:hover { color: var(--tf-text); background: var(--tf-accent-soft); }

/* ── Moments ────────────────────────────────────────────────────────────── */
${t} .mrd-moment { text-align: center; padding: clamp(20px, 5vw, 44px) 8px; animation: mrd-rise 240ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
${t} .mrd-check { display: inline-flex; color: var(--tf-accent); margin-bottom: 14px; }
${t} .mrd-check-ring { stroke-dasharray: 82; stroke-dashoffset: 82; animation: mrd-draw 420ms 80ms ease-out forwards; }
${t} .mrd-check-tick { stroke-dasharray: 24; stroke-dashoffset: 24; animation: mrd-draw 260ms 360ms ease-out forwards; }
${t} .mrd-moment-title { margin: 0 0 6px; font-size: 22px; font-weight: 650; letter-spacing: -0.01em; color: var(--tf-text); }
${t} .mrd-moment-text { margin: 0 auto; max-width: 46ch; font-size: 15px; line-height: 1.55; color: var(--tf-text-muted); }

/* ── Embed: the earned card ─────────────────────────────────────────────── */
${embed} .mrd-embed { max-width: 640px; margin: 0 auto; background: var(--tf-surface); border: var(--tf-border-width) solid var(--tf-border); border-radius: var(--tf-radius); box-shadow: var(--tf-shadow); padding: clamp(20px, 4vw, 32px); }
${embed} .mrd-embed-head { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; }
${embed} .tf-logomark { display: inline-flex; align-items: center; justify-content: center; height: 34px; max-width: 130px; object-fit: contain; flex: none; }
${embed} .tf-logomark[data-monogram] { width: 34px; border-radius: 9px; background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); font-weight: 650; font-size: 16px; }
${embed} .mrd-embed-title { margin: 0; font-size: 18.5px; font-weight: 640; letter-spacing: -0.015em; color: var(--tf-text); }
${embed} .tf-time-contract { margin: 2px 0 0; font-size: 12.5px; color: var(--tf-text-muted); }
${embed} .mrd-embed-desc { margin: 0 0 20px; font-size: 14.5px; line-height: 1.55; color: var(--tf-text-muted); }
${embed} .tf-label { font-size: 15.5px; font-weight: 600; margin-bottom: 6px; }
${embed} .mrd-count { margin-bottom: 18px; }
${embed} .tf-actions { margin-top: 24px; }
${embed} .tf-btn { padding: 10px 18px; font-size: 14.5px; }

/* ── Small screens: the split stacks ────────────────────────────────────── */
@media (max-width: 860px) {
  ${hosted} .mrd-hosted { grid-template-columns: 1fr; }
  ${hosted} .mrd-brand { position: static; min-height: 0; border-right: 0; border-bottom: 1px solid var(--tf-border); padding: 24px 22px 20px; }
  ${hosted} .mrd-title { font-size: 26px; margin-top: 16px; }
  ${hosted} .mrd-description { font-size: 15px; }
  ${hosted} .tf-trust { margin-top: 16px; flex-direction: row; flex-wrap: wrap; column-gap: 18px; }
  ${hosted} .mrd-brand-foot { display: none; }
  ${hosted} .mrd-flow { padding: 26px 22px 40px; align-items: flex-start; }
  ${hosted} .tf-input, ${hosted} .tf-textarea { font-size: 19px; }
}

/* ── Loader ─────────────────────────────────────────────────────────────── */
${t} .mrd-loader { display: flex; align-items: center; justify-content: center; min-height: 240px; }
${t} .mrd-loader-logo, ${t} .mrd-loader-mark { animation: mrd-breathe 1.6s ease-in-out infinite; }
${t} .mrd-loader-logo { height: 40px; max-width: 180px; object-fit: contain; }
${t} .mrd-loader-mark { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 12px; background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); font-weight: 650; font-size: 20px; }

@keyframes mrd-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes mrd-draw { to { stroke-dashoffset: 0; } }
@keyframes mrd-breathe { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
`;
}
