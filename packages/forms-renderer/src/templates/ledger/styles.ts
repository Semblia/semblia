import type { PublicSnapshot } from "@workspace/forms-core";

const SANS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';

/**
 * Ledger's world: a paper sheet on a desk. Serif masthead, prose lede,
 * numbered manuscript asks, writing-line inputs (ruled paper for long text),
 * letter-keycap chips, page-numbered pagination, a signature moment to close.
 * `--tf-font` resolves to the serif-editorial stack; the pack supplies its own
 * sans for small functional labels. Light-native by manifest.
 */
export function ledgerStylesheet(t: string, _snapshot: PublicSnapshot): string {
  const hosted = `${t}[data-tf-surface="hosted"]`;
  const embed = `${t}[data-tf-surface="embed"]`;
  return `
/* ── The desk and the sheet ─────────────────────────────────────────────── */
${hosted} .ldg-desk { min-height: 100vh; min-height: 100svh; display: flex; flex-direction: column; align-items: center; padding: clamp(20px, 6vh, 72px) 16px 40px; background: color-mix(in oklab, var(--tf-bg) 88%, var(--tf-text) 4%); }
${hosted} .ldg-sheet { width: 100%; max-width: 720px; background: var(--tf-bg); padding: clamp(32px, 6vw, 76px) clamp(24px, 6vw, 84px); box-shadow: 0 1px 2px rgb(0 0 0 / 0.06), 0 12px 34px rgb(0 0 0 / 0.09); border-radius: 2px; }

${embed} .ldg-desk { padding: 0; }
${embed} .ldg-sheet { width: 100%; max-width: 720px; margin: 0 auto; background: var(--tf-bg); border: 1px solid var(--tf-border); border-top: 3px solid var(--tf-accent); padding: clamp(24px, 5vw, 48px) clamp(20px, 5vw, 56px); }

/* ── Masthead ───────────────────────────────────────────────────────────── */
${t} .ldg-mast-row { display: flex; align-items: center; gap: 10px; margin-bottom: 26px; }
${t} .tf-logomark { display: inline-flex; align-items: center; justify-content: center; height: 26px; max-width: 120px; object-fit: contain; }
${t} .tf-logomark[data-monogram] { width: 26px; border-radius: 50%; background: var(--tf-text); color: var(--tf-bg); font-family: ${SANS}; font-weight: 600; font-size: 13px; }
${t} .ldg-mast-brand { font-family: ${SANS}; font-size: 12.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--tf-text-muted); }
${t} .ldg-title { margin: 0 0 14px; font-size: clamp(30px, 5vw, 44px); line-height: 1.12; font-weight: 550; letter-spacing: -0.015em; color: var(--tf-text); text-wrap: balance; }
${t} .ldg-lede { margin: 0; font-size: 18px; line-height: 1.6; font-style: italic; color: var(--tf-text-muted); max-width: 56ch; }
${t} .ldg-rule { border: 0; border-top: 1px solid var(--tf-border-strong); margin: 28px 0 0; }
${t} .ldg-intro { margin: 26px 0 0; font-size: 17px; line-height: 1.65; color: var(--tf-text); }

/* ── The manuscript body ────────────────────────────────────────────────── */
${t} .ldg-body { margin-top: 30px; }
${t} .ldg-body .tf-step-field { counter-increment: ask; }
${t} .ldg-body .tf-step-field + .tf-step-field, ${t} .ldg-body .tf-field + .tf-field { margin-top: 34px; }
${t} .ldg-body .tf-step-field::before { content: "No. " counter(ask, decimal-leading-zero); font-family: ${SANS}; font-size: 11.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--tf-text-muted); margin-bottom: 8px; }
${t}[data-a-voice="brand"] .ldg-body .tf-step-field::before { color: var(--tf-accent); }

${t} .tf-label { font-size: 21px; font-weight: 550; line-height: 1.3; letter-spacing: -0.005em; margin-bottom: 6px; }
${t} .tf-help { font-size: 15px; font-style: italic; margin: 2px 0 10px; }

/* Writing lines: answers are handwriting on rules, never boxes. */
${t} .tf-input { border: 0; border-bottom: 1px solid color-mix(in oklab, var(--tf-text) 42%, transparent); border-radius: 0; background: transparent; font-family: inherit; font-size: 19px; padding: 8px 2px 10px; transition: border-color 180ms ease; }
${t} .tf-input:focus-visible { outline: none; border-bottom-color: var(--tf-text); box-shadow: 0 1px 0 0 var(--tf-text); }
${t}[data-a-voice="brand"] .tf-input:focus-visible { border-bottom-color: var(--tf-accent); box-shadow: 0 1px 0 0 var(--tf-accent); }
${t} .tf-textarea { border: 0; border-radius: 0; background: transparent; background-image: repeating-linear-gradient(transparent 0 29px, color-mix(in oklab, var(--tf-text) 22%, transparent) 29px 30px); font-family: inherit; font-size: 18px; line-height: 30px; padding: 0 2px 6px; min-height: 150px; }
${t} .tf-textarea:focus-visible { outline: none; background-image: repeating-linear-gradient(transparent 0 29px, color-mix(in oklab, var(--tf-text) 40%, transparent) 29px 30px); }
${t} .tf-input::placeholder, ${t} .tf-textarea::placeholder { font-style: italic; opacity: 0.45; }

/* Letter chips. */
${t} .tf-options { flex-direction: row; flex-wrap: wrap; gap: 10px; counter-reset: opt; }
${t} .tf-option { counter-increment: opt; width: auto; border: 1px solid var(--tf-border-strong); border-radius: 3px; background: transparent; padding: 9px 16px 9px 12px; font-size: 16px; transition: border-color 160ms ease, background 160ms ease; }
${t} .tf-option::before { content: counter(opt, upper-alpha) "."; font-family: ${SANS}; font-size: 12px; font-weight: 600; color: var(--tf-text-muted); }
${t} .tf-option:hover { border-color: var(--tf-text); }
${t} .tf-option[data-selected="true"] { border-color: var(--tf-text); background: color-mix(in oklab, var(--tf-text) 6%, transparent); color: var(--tf-text); }
${t}[data-a-voice="brand"] .tf-option[data-selected="true"] { border-color: var(--tf-accent); background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); }
${t} .tf-option input { position: absolute; opacity: 0; pointer-events: none; }

${t} .tf-rating { gap: 10px; }
${t} .tf-rating-btn { font-size: 34px; color: color-mix(in oklab, var(--tf-text) 25%, transparent); }
${t} .tf-rating-btn[aria-pressed="true"] { color: var(--tf-text); }
${t}[data-a-voice="brand"] .tf-rating-btn[aria-pressed="true"] { color: var(--tf-accent); }

${t} .tf-upload, ${t} .tf-capture-btn { border-radius: 3px; font-family: ${SANS}; font-size: 14px; }

${t} .tf-consent { font-size: 14px; font-style: italic; }

/* ── Page furniture + the signature moment ──────────────────────────────── */
${t} .ldg-foot { margin-top: 40px; padding-top: 18px; border-top: 1px solid var(--tf-border-strong); display: flex; align-items: center; justify-content: space-between; gap: 16px; }
${t} .ldg-page { margin: 0; font-family: ${SANS}; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--tf-text-muted); font-variant-numeric: tabular-nums; }
${t} .tf-actions { display: flex; align-items: center; gap: 14px; margin-left: auto; }
${t} .tf-btn { appearance: none; cursor: pointer; font-family: ${SANS}; font-weight: 600; font-size: 14.5px; padding: 11px 22px; border-radius: 3px; transition: background 160ms ease, color 160ms ease, border-color 160ms ease; }
${t} .tf-btn-primary { border: 1px solid var(--tf-text); background: var(--tf-text); color: var(--tf-bg); }
${t} .tf-btn-primary:hover { background: color-mix(in oklab, var(--tf-text) 84%, var(--tf-bg)); }
${t}[data-a-voice="brand"] .tf-btn-primary { border-color: var(--tf-accent); background: var(--tf-accent); color: var(--tf-accent-text); }
${t}[data-a-voice="brand"] .tf-btn-primary:hover { background: var(--tf-accent-hover); }
${t} .tf-btn-primary:disabled { opacity: 0.6; cursor: default; }
${t} .tf-btn-ghost { border: 1px solid transparent; background: transparent; color: var(--tf-text-muted); }
${t} .tf-btn-ghost:hover { color: var(--tf-text); border-color: var(--tf-border-strong); }
${t} .ldg-foot[data-signature="true"] .tf-btn-primary { padding: 12px 28px; }

/* ── Moments ────────────────────────────────────────────────────────────── */
${t} .ldg-moment { text-align: center; padding: clamp(28px, 6vw, 60px) 8px; }
${t} .ldg-moment-mark { margin: 0 0 14px; font-size: 26px; color: var(--tf-text-muted); }
${t} .ldg-moment-title { margin: 0 0 10px; font-size: clamp(26px, 4vw, 34px); font-weight: 550; letter-spacing: -0.01em; color: var(--tf-text); }
${t} .ldg-moment-text { margin: 0 auto; max-width: 52ch; font-size: 17px; line-height: 1.65; font-style: italic; color: var(--tf-text-muted); }

${t} .tf-attribution { font-family: ${SANS}; }
${hosted} .tf-attribution { margin-top: 22px; }

/* ── Small screens ──────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  ${hosted} .ldg-desk { padding: 0; background: var(--tf-bg); }
  ${hosted} .ldg-sheet { box-shadow: none; border-radius: 0; padding: 28px 22px 40px; }
  ${t} .ldg-title { font-size: 28px; }
  ${t} .tf-label { font-size: 19px; }
  ${t} .ldg-foot { flex-wrap: wrap; }
}

/* ── Loader: a line being written ───────────────────────────────────────── */
${t} .ldg-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; min-height: 240px; background: var(--tf-bg); }
${t} .ldg-loader-logo { height: 30px; max-width: 140px; object-fit: contain; }
${t} .ldg-loader-mark { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: var(--tf-text); color: var(--tf-bg); font-family: ${SANS}; font-weight: 600; font-size: 15px; }
${t} .ldg-loader-line { width: 160px; height: 1px; background: linear-gradient(90deg, var(--tf-text) 0%, var(--tf-text) 50%, transparent 50%); background-size: 200% 100%; animation: ldg-write 1.4s ease-in-out infinite; }

@keyframes ldg-write { from { background-position: 100% 0; } to { background-position: -100% 0; } }
`;
}
