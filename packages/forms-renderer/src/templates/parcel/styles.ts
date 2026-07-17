import type { PublicSnapshot } from "@workspace/forms-core";

/**
 * Parcel's world: the receipt. A commerce split — brand pane with product
 * imagery and a dashed receipt of the exchange, beside a compact review card
 * that opens on a giant star row. Tabular numerals, dashed rules, a rotated
 * rubber stamp for the thank-you. Embeds collapse to one receipt card.
 */
export function parcelStylesheet(t: string, _snapshot: PublicSnapshot): string {
  const hosted = `${t}[data-tf-surface="hosted"]`;
  const embed = `${t}[data-tf-surface="embed"]`;
  return `
/* ── Hosted: the exchange, two-sided ────────────────────────────────────── */
${hosted} .pcl-hosted { display: grid; grid-template-columns: minmax(320px, 5fr) 7fr; min-height: var(--tf-viewport, 100svh); background: color-mix(in oklab, var(--tf-bg) 94%, var(--tf-text) 2%); }

${hosted} .pcl-brand { position: sticky; top: 0; align-self: start; display: flex; flex-direction: column; justify-content: space-between; min-height: var(--tf-viewport, 100svh); padding: clamp(26px, 4.5vw, 56px); background: var(--tf-surface); border-right: 1px solid var(--tf-border); }
${hosted} .pcl-hero-img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: calc(var(--tf-radius) * 0.75); margin-bottom: 24px; }
${hosted} .pcl-brand .tf-logomark { display: inline-flex; align-items: center; justify-content: center; height: 34px; max-width: 150px; object-fit: contain; }
${hosted} .pcl-brand .tf-logomark[data-monogram] { width: 34px; border-radius: 9px; background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); font-weight: 650; font-size: 16px; }
${hosted} .pcl-title { margin: 16px 0 10px; font-size: clamp(24px, 2.8vw, 32px); line-height: 1.15; letter-spacing: -0.02em; font-weight: 640; color: var(--tf-text); text-wrap: balance; }
${hosted} .pcl-description { margin: 0; font-size: 15.5px; line-height: 1.6; color: var(--tf-text-muted); max-width: 44ch; }
${hosted} .pcl-brand-foot { padding-top: 20px; }
${hosted} .pcl-brand-foot .tf-attribution { margin: 0; text-align: left; }

/* The dashed receipt: what this exchange involves. */
${t} .pcl-receipt { list-style: none; margin: 26px 0 0; padding: 18px 0 0; border-top: 1.5px dashed var(--tf-border-strong); display: flex; flex-direction: column; gap: 0; }
${t} .pcl-receipt li { display: flex; align-items: baseline; gap: 10px; padding: 9px 0; font-size: 14px; line-height: 1.5; color: var(--tf-text-muted); font-variant-numeric: tabular-nums; }
${t} .pcl-receipt li + li { border-top: 1px dashed var(--tf-border); }
${t} .pcl-receipt li::before { content: "✓"; flex: none; font-size: 12px; font-weight: 700; color: var(--tf-accent); }

${hosted} .pcl-pane { display: flex; align-items: center; justify-content: center; padding: clamp(22px, 5vw, 72px) clamp(18px, 4vw, 56px); }
${hosted} .pcl-card { width: 100%; max-width: 520px; background: var(--tf-surface); border: var(--tf-border-width) solid var(--tf-border); border-radius: var(--tf-radius); box-shadow: var(--tf-shadow); padding: clamp(22px, 4vw, 38px); }
${t}[data-a-frame="crisp"] .pcl-card { box-shadow: none; border-color: var(--tf-border-strong); }

/* ── The hero act: stars first, huge ────────────────────────────────────── */
${t} .pcl-hero-act { padding-bottom: 22px; margin-bottom: 22px; border-bottom: 1.5px dashed var(--tf-border-strong); }
${t} .pcl-hero-act .tf-label { font-size: 18px; font-weight: 640; letter-spacing: -0.015em; }
${t} .pcl-hero-act .tf-rating { gap: 6px; margin-top: 6px; }
${t} .pcl-hero-act .tf-rating-btn { font-size: 46px; transition: transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1), color 120ms ease; }
${t} .pcl-hero-act .tf-rating-btn:hover { transform: scale(1.15) rotate(-4deg); }
${t} .pcl-hero-act .tf-rating-btn[aria-pressed="true"] { animation: pcl-pop 240ms cubic-bezier(0.34, 1.56, 0.64, 1); }

${t} .pcl-intro { margin: 0 0 18px; font-size: 14.5px; line-height: 1.55; color: var(--tf-text); }
${t} .pcl-fields { display: flex; flex-direction: column; gap: 20px; }

/* Compact commerce fields (Stripe density). */
${t} .tf-label { font-size: 13.5px; font-weight: 600; color: var(--tf-text-muted); margin-bottom: 6px; }
${t} .tf-help { font-size: 12.5px; margin: 2px 0 8px; }
${t} .tf-input, ${t} .tf-textarea { font-size: 15px; padding: 10px 12px; }
${t} .tf-textarea { min-height: 128px; }
${t} .tf-rating-btn { font-size: 30px; }
${t} .tf-option { padding: 10px 13px; font-size: 14.5px; }

/* Photos go in a polaroid. */
${t} .tf-upload { flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 22px 16px 26px; background: var(--tf-bg); border: 1.5px dashed var(--tf-border-strong); border-radius: 4px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.07); font-size: 13.5px; transition: border-color 160ms ease, transform 160ms ease; }
${t} .tf-upload:hover { border-color: var(--tf-accent); transform: rotate(-0.5deg); }

${t} .tf-consent { font-size: 13px; }

${t} .tf-actions { margin-top: 26px; display: flex; }
${t} .tf-btn { appearance: none; border: 0; cursor: pointer; font: inherit; font-weight: 600; font-size: 15px; padding: 12px 20px; border-radius: var(--tf-radius-field); width: 100%; transition: background 140ms ease, transform 120ms ease; }
${t} .tf-btn:active { transform: translateY(1px); }
${t} .tf-btn-primary { background: var(--tf-accent); color: var(--tf-accent-text); box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.14), 0 1px 2px rgb(0 0 0 / 0.14); }
${t} .tf-btn-primary:hover { background: var(--tf-accent-hover); }
${t} .tf-btn-primary:disabled { opacity: 0.65; cursor: default; }

/* ── Moments: the rubber stamp ──────────────────────────────────────────── */
${t} .pcl-moment { display: flex; flex-direction: column; align-items: center; text-align: center; padding: clamp(24px, 5vw, 48px) 8px; }
${t} .pcl-stamp { display: inline-flex; align-items: center; justify-content: center; min-width: 128px; min-height: 128px; padding: 18px; border: 2px dashed var(--tf-accent); border-radius: 50%; color: var(--tf-accent); font-size: 19px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; transform: rotate(-8deg); animation: pcl-stamp 360ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
${t} .pcl-moment-text { margin: 22px auto 0; max-width: 46ch; font-size: 15px; line-height: 1.6; color: var(--tf-text-muted); }

/* ── Embed: one receipt card ────────────────────────────────────────────── */
${embed} .pcl-embed { max-width: 560px; margin: 0 auto; background: var(--tf-surface); border: var(--tf-border-width) solid var(--tf-border); border-top: 2px dashed var(--tf-border-strong); border-radius: var(--tf-radius); box-shadow: var(--tf-shadow); padding: clamp(20px, 4vw, 30px); }
${embed} .pcl-embed-head { display: flex; align-items: flex-start; gap: 13px; margin-bottom: 18px; }
${embed} .tf-logomark { display: inline-flex; align-items: center; justify-content: center; height: 32px; max-width: 120px; object-fit: contain; flex: none; }
${embed} .tf-logomark[data-monogram] { width: 32px; border-radius: 8px; background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); font-weight: 650; font-size: 15px; }
${embed} .pcl-embed-title { margin: 0; font-size: 17.5px; font-weight: 640; letter-spacing: -0.015em; color: var(--tf-text); }
${embed} .pcl-embed-desc { margin: 3px 0 0; font-size: 13.5px; line-height: 1.5; color: var(--tf-text-muted); }
${embed} .pcl-hero-act .tf-rating-btn { font-size: 38px; }

/* ── Small screens ──────────────────────────────────────────────────────── */
@media (max-width: 860px) {
  ${hosted} .pcl-hosted { grid-template-columns: 1fr; }
  ${hosted} .pcl-brand { position: static; min-height: 0; border-right: 0; border-bottom: 1px solid var(--tf-border); padding: 22px 20px 18px; }
  ${hosted} .pcl-hero-img { aspect-ratio: 16 / 7; margin-bottom: 18px; }
  ${hosted} .pcl-title { font-size: 22px; }
  ${t} .pcl-receipt { margin-top: 16px; }
  ${hosted} .pcl-brand-foot { display: none; }
  ${hosted} .pcl-pane { padding: 20px 16px 36px; }
  ${t} .pcl-hero-act .tf-rating-btn { font-size: 40px; }
}

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
