import type { PublicSnapshot } from "@workspace/forms-core";

const SANS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';

function sheetRules(hosted: string, embed: string): string {
  return `
/* ── The desk and the sheet ─────────────────────────────────────────────── */
${hosted} .ldg-desk { min-height: var(--tf-viewport, 100svh); display: flex; flex-direction: column; align-items: center; padding: clamp(20px, 6vh, 72px) 16px 40px; background: color-mix(in oklab, var(--tf-bg) 88%, var(--tf-text) 4%); }
${hosted} .ldg-sheet { width: 100%; max-width: 680px; display: flex; flex-direction: column; flex: 1 0 auto; background: var(--tf-bg); padding: clamp(36px, 6vw, 64px); box-shadow: 0 1px 2px rgb(0 0 0 / 0.06), 0 12px 34px rgb(0 0 0 / 0.09); border-radius: 2px; }
${hosted} .tf-form { display: flex; flex-direction: column; flex: 1 0 auto; }

${embed} .ldg-desk { padding: 0; }
${embed} .ldg-sheet { width: 100%; max-width: 680px; margin: 0 auto; background: var(--tf-bg); border: 1px solid var(--tf-border); border-top: 3px solid var(--tf-accent); border-radius: 2px; padding: clamp(24px, 5vw, 44px) clamp(20px, 5vw, 48px); }
`;
}

function letterheadRules(t: string): string {
  return `
/* ── Letterhead ─────────────────────────────────────────────────────────── */
${t} .ldg-mast-row { display: flex; align-items: center; gap: 10px; }
${t} .tf-logomark { display: inline-flex; align-items: center; justify-content: center; height: 26px; max-width: 120px; object-fit: contain; }
${t} .tf-logomark[data-monogram] { width: 26px; border-radius: 50%; background: var(--tf-text); color: var(--tf-bg); font-family: ${SANS}; font-weight: 600; font-size: 13px; }
${t} .ldg-mast-brand { font-size: 15px; font-variant-caps: small-caps; letter-spacing: 0.1em; color: var(--tf-text); }
${t} .ldg-rule { border: 0; border-top: 1px solid var(--tf-border-strong); margin: 14px 0 26px; }
${t} .ldg-title { margin: 0 0 12px; font-size: clamp(28px, 4.5vw, 34px); line-height: 1.15; font-weight: 600; letter-spacing: -0.015em; color: var(--tf-text); text-wrap: balance; }
${t} .ldg-lede { margin: 0; font-size: 17px; line-height: 1.6; font-style: italic; color: var(--tf-text-muted); max-width: 56ch; }
${t} .ldg-intro { margin: 24px 0 0; font-size: 17px; line-height: 1.65; color: var(--tf-text); }
`;
}

function manuscriptRules(t: string, hosted: string): string {
  return `
/* ── The manuscript body (vertically centered on the hosted sheet) ──────── */
${t} .ldg-body { margin-top: 30px; }
${hosted} .ldg-body { margin-block: auto; padding-block: clamp(26px, 4vh, 44px); }
${t} .ldg-body .tf-step-field { counter-increment: ask; }
${t} .ldg-body .tf-step-field + .tf-step-field, ${t} .ldg-body .tf-field + .tf-field { margin-top: 34px; }
${t} .ldg-body .tf-step-field::before { content: "No. " counter(ask, decimal-leading-zero); font-family: ${SANS}; font-size: 11.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--tf-text-muted); margin-bottom: 8px; }
${t}[data-a-voice="brand"] .ldg-body .tf-step-field::before { color: var(--tf-accent); }

${t} .tf-label { font-size: 21px; font-weight: 600; line-height: 1.3; letter-spacing: -0.005em; margin-bottom: 6px; }
${t} .tf-help { font-size: 15px; font-style: italic; margin: 2px 0 10px; }
`;
}

function writingRules(t: string): string {
  return `
/* Writing lines: answers are handwriting on rules, never boxes. */
${t} .tf-input { border: 0; border-bottom: 1px solid color-mix(in oklab, var(--tf-text) 42%, transparent); border-radius: 0; background: transparent; font-family: inherit; font-size: 19px; padding: 8px 2px 10px; transition: border-color 180ms ease; }
${t} .tf-input:focus-visible { outline: none; border-bottom-color: var(--tf-text); box-shadow: 0 1px 0 0 var(--tf-text); }
${t}[data-a-voice="brand"] .tf-input:focus-visible { border-bottom-color: var(--tf-accent); box-shadow: 0 1px 0 0 var(--tf-accent); }

/* The signature device: ruled paper — a hairline every 34px writing line. */
${t} .tf-textarea { border: 0; border-radius: 0; background: transparent; background-image: repeating-linear-gradient(transparent 0 33px, color-mix(in oklab, var(--tf-text) 22%, transparent) 33px 34px); font-family: inherit; font-size: 18px; line-height: 34px; padding: 0 2px; min-height: 204px; }
${t} .tf-textarea:focus-visible { outline: none; background-image: repeating-linear-gradient(transparent 0 33px, color-mix(in oklab, var(--tf-text) 40%, transparent) 33px 34px); }
${t} .tf-input::placeholder, ${t} .tf-textarea::placeholder { font-style: italic; opacity: 0.45; }

/* Letter chips. */
${t} .tf-options { flex-direction: row; flex-wrap: wrap; gap: 10px; counter-reset: opt; }
${t} .tf-option { counter-increment: opt; width: auto; border: 1px solid var(--tf-border-strong); border-radius: 2px; background: transparent; padding: 9px 16px 9px 12px; font-size: 16px; transition: border-color 160ms ease, background 160ms ease; }
${t} .tf-option::before { content: counter(opt, upper-alpha) "."; font-family: ${SANS}; font-size: 12px; font-weight: 600; color: var(--tf-text-muted); }
${t} .tf-option:hover { border-color: var(--tf-text); }
${t} .tf-option[data-selected="true"] { border-color: var(--tf-text); background: color-mix(in oklab, var(--tf-text) 6%, transparent); color: var(--tf-text); }
${t}[data-a-voice="brand"] .tf-option[data-selected="true"] { border-color: var(--tf-accent); background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); }
${t} .tf-option input { position: absolute; opacity: 0; pointer-events: none; }
`;
}

function inkRules(t: string): string {
  return `
/* Ink stars: unrated stays ink-toned, selected takes the accent. */
${t} .tf-rating { gap: 10px; }
${t} .tf-rating-btn { font-size: 44px; padding: 2px 3px; color: color-mix(in oklab, var(--tf-text) 34%, transparent); transition: color 140ms ease; }
${t} .tf-rating-btn:hover { color: color-mix(in oklab, var(--tf-text) 62%, transparent); }
${t} .tf-rating-btn[aria-pressed="true"] { color: var(--tf-accent); }

${t} .tf-upload, ${t} .tf-capture-btn { border-radius: 2px; font-family: ${SANS}; font-size: 14px; }

${t} .tf-consent { font-size: 14px; font-style: italic; }
`;
}

function furnitureRules(t: string, embed: string): string {
  return `
/* ── Page furniture: centered folio + the letterpress signature ─────────── */
${t} .ldg-foot { display: flex; flex-direction: column; align-items: center; gap: 18px; }
${embed} .ldg-foot { margin-top: 36px; }
${t} .ldg-folio { display: flex; flex-direction: column; align-items: center; gap: 10px; }
${t} .ldg-folio-rule { width: 56px; height: 1px; background: var(--tf-border-strong); }
${t} .ldg-page { margin: 0; font-size: 13px; font-variant-caps: small-caps; letter-spacing: 0.08em; color: var(--tf-text-muted); font-variant-numeric: tabular-nums; }
${t} .tf-actions { display: flex; align-items: center; justify-content: center; gap: 14px; }
${t} .tf-btn { appearance: none; cursor: pointer; font-family: ${SANS}; font-weight: 600; font-size: 14.5px; padding: 12px 26px; border-radius: 2px; transition: background 160ms ease, color 160ms ease, border-color 160ms ease, box-shadow 160ms ease; }
${t} .tf-btn-primary { border: 1px solid var(--tf-text); background: var(--tf-text); color: var(--tf-bg); box-shadow: inset 0 -1.5px 0 rgb(0 0 0 / 0.28); }
${t} .tf-btn-primary:hover { background: color-mix(in oklab, var(--tf-text) 86%, var(--tf-bg)); }
${t} .tf-btn-primary:active { transform: translateY(1px); box-shadow: inset 0 -0.5px 0 rgb(0 0 0 / 0.28); }
${t} .tf-btn-primary:disabled { opacity: 0.6; cursor: default; }
${t} .tf-btn-ghost { border: 1px solid transparent; background: transparent; color: var(--tf-text-muted); }
${t} .tf-btn-ghost:hover { color: var(--tf-text); border-color: var(--tf-border-strong); }
${t} .ldg-foot[data-signature="true"] .tf-btn-primary { padding: 13px 32px; }
${t} .tf-submit-error { margin-top: 14px; text-align: center; font-style: italic; }
`;
}

function momentRules(t: string, hosted: string): string {
  return `
/* ── Moments ────────────────────────────────────────────────────────────── */
${t} .ldg-moment { text-align: center; padding: clamp(28px, 6vw, 60px) 8px; }
${hosted} .ldg-moment { margin-block: auto; }
${t} .ldg-moment-mark { margin: 0 0 14px; font-size: 26px; color: var(--tf-text-muted); }
${t} .ldg-moment-title { margin: 0 0 10px; font-size: clamp(26px, 4vw, 34px); font-weight: 600; letter-spacing: -0.01em; color: var(--tf-text); }
${t} .ldg-moment-text { margin: 0 auto; max-width: 52ch; font-size: 17px; line-height: 1.65; font-style: italic; color: var(--tf-text-muted); }

${t} .tf-attribution { font-family: ${SANS}; }
${hosted} .tf-attribution { margin-top: 22px; }
`;
}

function compactRules(t: string, hosted: string): string {
  return `
/* ── Small screens ──────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  ${hosted} .ldg-desk { padding: 0; background: var(--tf-bg); }
  ${hosted} .ldg-sheet { box-shadow: none; border-radius: 0; padding: 28px 22px 40px; min-height: var(--tf-viewport, 100svh); }
  ${t} .tf-label { font-size: 19px; }
  ${t} .tf-textarea { min-height: 170px; }
  ${t} .tf-rating { gap: 6px; }
  ${t} .tf-rating-btn { font-size: 40px; }
  ${t} .tf-actions { width: 100%; }
  ${t} .tf-btn-primary { flex: 1 1 auto; }
}
`;
}

function loaderRules(t: string): string {
  return `
/* ── Loader: a line being written ───────────────────────────────────────── */
${t} .ldg-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; min-height: 240px; background: var(--tf-bg); }
${t} .ldg-loader-logo { height: 30px; max-width: 140px; object-fit: contain; }
${t} .ldg-loader-mark { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: var(--tf-text); color: var(--tf-bg); font-family: ${SANS}; font-weight: 600; font-size: 15px; }
${t} .ldg-loader-line { width: 160px; height: 1px; background: linear-gradient(90deg, var(--tf-text) 0%, var(--tf-text) 50%, transparent 50%); background-size: 200% 100%; animation: ldg-write 1.4s ease-in-out infinite; }

@keyframes ldg-write { from { background-position: 100% 0; } to { background-position: -100% 0; } }
`;
}

/**
 * Ledger's world: a paper sheet on a desk. Letterhead (monogram + small-caps
 * brand + hairline rule), serif title, prose lede, numbered manuscript asks,
 * writing-line inputs (34px-ruled paper for long text), letter-keycap chips,
 * ink stars (selected = accent — amber is off-world here), a letterpress
 * button, and a centered folio footer. Hosted, the sheet fills the first fold
 * and the body centers between letterhead and footer — vertical balance, not
 * a floating question. `--tf-font` resolves to the serif-editorial stack; the
 * pack supplies its own sans for small functional labels. Light-native by
 * manifest.
 */
export function ledgerStylesheet(t: string, _snapshot: PublicSnapshot): string {
  const hosted = `${t}[data-tf-surface="hosted"]`;
  const embed = `${t}[data-tf-surface="embed"]`;
  return [
    sheetRules(hosted, embed),
    letterheadRules(t),
    manuscriptRules(t, hosted),
    writingRules(t),
    inkRules(t),
    furnitureRules(t, embed),
    momentRules(t, hosted),
    compactRules(t, hosted),
    loaderRules(t),
  ].join("");
}
