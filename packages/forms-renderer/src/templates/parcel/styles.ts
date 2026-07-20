import type { PublicSnapshot } from "@workspace/forms-core";

function brandRules(hosted: string): string {
  return `
/* ── Hosted: the exchange, two-sided ────────────────────────────────────── */
${hosted} .pcl-hosted { display: grid; grid-template-columns: minmax(320px, 5fr) 7fr; min-height: var(--tf-viewport, 100svh); background: color-mix(in oklab, var(--tf-bg) 94%, var(--tf-text) 2%); }

${hosted} .pcl-brand { position: sticky; top: 0; align-self: start; display: flex; flex-direction: column; min-height: var(--tf-viewport, 100svh); padding: clamp(26px, 4.5vw, 56px); background: var(--tf-surface); border-right: 1px solid var(--tf-border); }
${hosted} .pcl-brand-head { flex: none; }
${hosted} .pcl-brand-body { margin-block: auto; padding-block: clamp(20px, 3.5vh, 36px); }
${hosted} .pcl-brand-foot { flex: none; padding-top: 18px; }
${hosted} .pcl-brand-foot .tf-attribution { margin: 0; text-align: left; }
${hosted} .pcl-hero-img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: calc(var(--tf-radius) * 0.75); margin-bottom: 22px; }
${hosted} .pcl-brand .tf-logomark { display: inline-flex; align-items: center; justify-content: center; height: 34px; max-width: 150px; object-fit: contain; }
${hosted} .pcl-brand .tf-logomark[data-monogram] { width: 34px; border-radius: 9px; background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); font-weight: 650; font-size: 16px; }
${hosted} .pcl-title { margin: 0 0 12px; font-size: clamp(34px, 3.6vw, 42px); line-height: 1.08; letter-spacing: -0.022em; font-weight: 700; color: var(--tf-text); text-wrap: balance; }
${hosted} .pcl-description { margin: 0; font-size: 16px; line-height: 1.6; color: var(--tf-text-muted); max-width: 44ch; }
`;
}

function receiptRules(t: string): string {
  return `
/* ── The receipt device: numbered steps, dotted leaders, one stamp ──────── */
${t} .pcl-receipt { position: relative; margin: 28px 0 30px; padding: 16px 20px 18px; max-width: 380px; background: var(--tf-surface-raised); border: 1.5px dashed var(--tf-border-strong); border-radius: 8px; }
${t} .pcl-receipt-lines { list-style: none; margin: 0; padding: 0; }
${t} .pcl-receipt-lines li { display: flex; align-items: baseline; gap: 10px; padding: 8px 0; font-size: 14px; line-height: 1.45; font-variant-numeric: tabular-nums; }
${t} .pcl-receipt-no { flex: none; font-size: 11.5px; font-weight: 650; color: var(--tf-text-muted); }
${t} .pcl-receipt-label { font-weight: 600; color: var(--tf-text); }
${t} .pcl-receipt-dots { flex: 1; min-width: 24px; border-bottom: 2px dotted var(--tf-border-strong); transform: translateY(-3px); }
${t} .pcl-receipt-value { flex: none; font-size: 13.5px; color: var(--tf-text-muted); }
${t} .pcl-receipt-lines li[data-done] .pcl-receipt-value { color: var(--tf-accent); font-weight: 700; }
${t} .pcl-receipt-total { display: flex; align-items: baseline; gap: 10px; margin: 6px 0 0; padding: 10px 0 0; border-top: 1.5px dashed var(--tf-border-strong); font-size: 14px; font-weight: 700; color: var(--tf-text); font-variant-numeric: tabular-nums; }
${t} .pcl-receipt-fine { margin: 10px 0 0; font-size: 11.5px; line-height: 1.5; color: var(--tf-text-muted); }

/* The star-stamp: pressed once, slightly askew, over the receipt's corner. */
${t} .pcl-star-stamp { position: absolute; right: -16px; bottom: -22px; width: 104px; height: 104px; color: var(--tf-accent); transform: rotate(-8deg); opacity: 0.92; pointer-events: none; }
${t} .pcl-stamp-ring { font-size: 9.5px; font-weight: 700; letter-spacing: 1.6px; fill: currentColor; }
${t} .pcl-stamp-stars { font-size: 11px; letter-spacing: 2.5px; fill: currentColor; }
`;
}

function cardRules(t: string, hosted: string): string {
  return `
${hosted} .pcl-pane { display: flex; align-items: center; justify-content: center; padding: clamp(22px, 5vw, 72px) clamp(18px, 4vw, 56px); }
${hosted} .pcl-card { width: 100%; max-width: 520px; background: var(--tf-surface); border: var(--tf-border-width) solid var(--tf-border); border-radius: var(--tf-radius); box-shadow: var(--tf-shadow); padding: clamp(22px, 4vw, 38px); }
${t}[data-a-frame="crisp"] .pcl-card { box-shadow: none; border-color: var(--tf-border-strong); }

/* ── The hero act: stars first, huge, on a soft accent panel ────────────── */
${t} .pcl-hero-act { padding: 18px 20px 20px; margin-bottom: 24px; background: var(--tf-accent-soft); border-radius: calc(var(--tf-radius) * 0.8); }
${t} .pcl-hero-act .tf-label { font-size: 17px; font-weight: 650; letter-spacing: -0.015em; color: var(--tf-accent-soft-text); }
${t} .pcl-hero-act .tf-help { color: color-mix(in oklab, var(--tf-accent-soft-text) 82%, var(--tf-accent-soft)); }
${t} .pcl-hero-act .tf-rating { gap: 8px; margin-top: 10px; }
${t} .pcl-hero-act .tf-rating-btn { font-size: 52px; padding: 2px; color: color-mix(in oklab, var(--tf-accent-soft-text) 30%, var(--tf-accent-soft)); transition: transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1), color 120ms ease; }
${t} .pcl-hero-act .tf-rating-btn:hover { transform: scale(1.12) rotate(-4deg); }
${t} .pcl-hero-act .tf-rating-btn[aria-pressed="true"] { color: var(--tf-accent); animation: pcl-pop 240ms cubic-bezier(0.34, 1.56, 0.64, 1); }

${t} .pcl-intro { margin: 0 0 18px; font-size: 14.5px; line-height: 1.55; color: var(--tf-text); }
${t} .pcl-fields { display: flex; flex-direction: column; gap: 20px; }
`;
}

function inputRules(t: string): string {
  return `
/* Commerce inputs: filled, ring-hugged, 48px tall (Stripe density, Tally ring). */
${t} .tf-label { font-size: 13.5px; font-weight: 600; color: var(--tf-text-muted); margin-bottom: 6px; }
${t} .tf-help { font-size: 12.5px; margin: 2px 0 8px; }
${t} .tf-input, ${t} .tf-textarea { font-size: 15.5px; padding: 12px 14px; background: var(--tf-surface); border: 0; box-shadow: 0 0 0 1px var(--tf-border-strong); border-radius: var(--tf-radius-field); }
${t} .tf-input { min-height: 48px; }
${t} .tf-input:focus-visible, ${t} .tf-textarea:focus-visible { outline: none; box-shadow: 0 0 0 1px var(--tf-accent), 0 0 0 4px var(--tf-focus-ring); }
${t} .tf-textarea { min-height: 140px; line-height: 1.6; }
${t} .tf-option { min-height: 48px; padding: 12px 14px; font-size: 14.5px; background: var(--tf-surface); border: 0; box-shadow: 0 0 0 1px var(--tf-border-strong); }
${t} .tf-option[data-selected="true"] { box-shadow: 0 0 0 1.5px var(--tf-accent); background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); }
${t} .tf-rating-btn { font-size: 40px; padding: 3px; }
${t} .tf-capture-btn { border: 0; box-shadow: 0 0 0 1px var(--tf-border-strong); min-height: 44px; }
${t} .tf-capture-btn[data-recording] { box-shadow: 0 0 0 1.5px #e5484d; }

/* Photos go in a polaroid. */
${t} .tf-upload { flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 22px 16px 26px; background: var(--tf-bg); border: 1.5px dashed var(--tf-border-strong); border-radius: 4px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.07); font-size: 13.5px; transition: border-color 160ms ease, transform 160ms ease; }
${t} .tf-upload:hover { border-color: var(--tf-accent); transform: rotate(-0.5deg); }

${t} .tf-consent { font-size: 13px; }
`;
}

function chromeRules(t: string): string {
  return `
${t} .tf-actions { margin-top: 26px; display: flex; }
${t} .tf-btn { appearance: none; border: 0; cursor: pointer; font: inherit; font-weight: 600; font-size: 16px; min-height: 50px; padding: 13px 22px; border-radius: var(--tf-radius-field); width: 100%; transition: background 140ms ease, transform 120ms ease; }
${t} .tf-btn:active { transform: translateY(1px); }
${t} .tf-btn-primary { background: var(--tf-accent); color: var(--tf-accent-text); box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.14), 0 1px 2px rgb(0 0 0 / 0.14); }
${t} .tf-btn-primary:hover { background: var(--tf-accent-hover); }
${t} .tf-btn-primary:disabled { opacity: 0.65; cursor: default; }
`;
}

function momentRules(t: string): string {
  return `
/* ── Moments: the rubber stamp ──────────────────────────────────────────── */
${t} .pcl-moment { display: flex; flex-direction: column; align-items: center; text-align: center; padding: clamp(24px, 5vw, 48px) 8px; }
${t} .pcl-stamp { display: inline-flex; align-items: center; justify-content: center; min-width: 128px; min-height: 128px; padding: 18px; border: 2px dashed var(--tf-accent); border-radius: 50%; color: var(--tf-accent); font-size: 19px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; transform: rotate(-8deg); animation: pcl-stamp 360ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
${t} .pcl-moment-text { margin: 22px auto 0; max-width: 46ch; font-size: 15px; line-height: 1.6; color: var(--tf-text-muted); }
`;
}

function embedRules(embed: string): string {
  return `
/* ── Embed: one compact receipt-flavored card ───────────────────────────── */
${embed} .pcl-embed { max-width: 560px; margin: 0 auto; background: var(--tf-surface); border: var(--tf-border-width) solid var(--tf-border); border-top: 2px dashed var(--tf-border-strong); border-radius: var(--tf-radius); box-shadow: var(--tf-shadow); padding: clamp(20px, 4vw, 30px); }
${embed} .pcl-embed-head { display: flex; align-items: flex-start; gap: 13px; margin-bottom: 18px; }
${embed} .tf-logomark { display: inline-flex; align-items: center; justify-content: center; height: 32px; max-width: 120px; object-fit: contain; flex: none; }
${embed} .tf-logomark[data-monogram] { width: 32px; border-radius: 8px; background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); font-weight: 650; font-size: 15px; }
${embed} .pcl-embed-title { margin: 0; font-size: 17.5px; font-weight: 640; letter-spacing: -0.015em; color: var(--tf-text); }
${embed} .pcl-embed-desc { margin: 3px 0 0; font-size: 13.5px; line-height: 1.5; color: var(--tf-text-muted); }
${embed} .pcl-hero-act { padding: 14px 16px 16px; margin-bottom: 18px; }
${embed} .pcl-hero-act .tf-rating-btn { font-size: 44px; }
${embed} .tf-input { min-height: 44px; padding: 10px 13px; }
${embed} .tf-btn { min-height: 46px; }
`;
}

function compactRules(t: string, hosted: string): string {
  return `
/* ── Small screens ──────────────────────────────────────────────────────── */
@media (max-width: 860px) {
  ${hosted} .pcl-hosted { grid-template-columns: 1fr; }
  ${hosted} .pcl-brand { position: static; min-height: 0; border-right: 0; border-bottom: 1px solid var(--tf-border); padding: 22px 20px 20px; }
  ${hosted} .pcl-brand-body { margin-block: 0; padding-block: 0; }
  ${hosted} .pcl-hero-img { aspect-ratio: 16 / 7; margin-bottom: 18px; }
  ${hosted} .pcl-title { margin-top: 14px; font-size: 30px; }
  ${t} .pcl-receipt { margin: 20px 0 26px; max-width: none; }
  ${t} .pcl-star-stamp { width: 88px; height: 88px; right: -8px; bottom: -18px; }
  ${hosted} .pcl-brand-foot { display: none; }
  ${hosted} .pcl-pane { padding: 20px 16px 36px; }
  ${t} .pcl-hero-act { padding: 16px; }
  ${t} .pcl-hero-act .tf-rating-btn { font-size: 44px; }
}
@media (max-width: 420px) {
  ${t} .pcl-hero-act .tf-rating { gap: 6px; }
  ${t} .pcl-hero-act .tf-rating-btn { font-size: 40px; padding: 4px; }
}
`;
}

function loaderRules(t: string): string {
  return `
/* ── Loader ─────────────────────────────────────────────────────────────── */
${t} .pcl-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; min-height: 240px; }
${t} .pcl-loader-logo { height: 34px; max-width: 150px; object-fit: contain; }
${t} .pcl-loader-mark { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 10px; background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); font-weight: 650; font-size: 18px; }
${t} .pcl-loader-stars { font-size: 18px; letter-spacing: 6px; color: var(--tf-border-strong); animation: pcl-shimmer 1.5s ease-in-out infinite; }

@keyframes pcl-pop { 0% { transform: scale(0.8); } 60% { transform: scale(1.25); } 100% { transform: scale(1); } }
@keyframes pcl-stamp { from { opacity: 0; transform: rotate(-8deg) scale(1.5); } to { opacity: 1; transform: rotate(-8deg) scale(1); } }
@keyframes pcl-shimmer { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
`;
}

/**
 * Parcel's world: the receipt. A commerce split — brand pane whose
 * centerpiece is a dashed receipt card (numbered steps, dotted leaders,
 * honest times, a rubber star-stamp on the corner) beside a review card that
 * opens on a giant star row in a soft accent panel. Ring-hugged filled
 * inputs, tabular numerals, a rotated stamp for the thank-you. Embeds
 * collapse to one receipt card with a dashed top rule.
 */
export function parcelStylesheet(t: string, _snapshot: PublicSnapshot): string {
  const hosted = `${t}[data-tf-surface="hosted"]`;
  const embed = `${t}[data-tf-surface="embed"]`;
  return [
    brandRules(hosted),
    receiptRules(t),
    cardRules(t, hosted),
    inputRules(t),
    chromeRules(t),
    momentRules(t),
    embedRules(embed),
    compactRules(t, hosted),
    loaderRules(t),
  ].join("");
}
