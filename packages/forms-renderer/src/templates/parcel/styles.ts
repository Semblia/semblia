import type { PublicSnapshot } from "@workspace/forms-core";

/**
 * Parcel's personality layer: warm commerce card with a product hero, giant
 * springy stars, a celebrated photo-upload tile, rounded friendly geometry.
 */
export function parcelStylesheet(t: string, _snapshot: PublicSnapshot): string {
  return `
${t} .pcl-page { min-height: 100%; width: 100%; display: flex; flex-direction: column; align-items: center; background: var(--tf-bg); padding: clamp(16px, 4vh, 48px) 14px 28px; }
${t} .pcl-card { width: 100%; max-width: 560px; background: var(--tf-surface); border: var(--tf-border-width) solid var(--tf-border); border-radius: var(--tf-radius); box-shadow: var(--tf-shadow); overflow: hidden; animation: pcl-pop 320ms cubic-bezier(0.34, 1.3, 0.5, 1) both; }

${t} .pcl-hero { position: relative; }
${t} .pcl-hero-img { display: block; width: 100%; height: clamp(140px, 26vw, 210px); object-fit: cover; }
${t} .pcl-hero-band { height: 84px; background: linear-gradient(120deg, var(--tf-accent-soft), var(--tf-accent)); opacity: 0.9; }
${t} .pcl-hero-brand { position: absolute; left: 20px; bottom: -24px; }
${t} .tf-logomark { display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 14px; background: var(--tf-surface); border: 1px solid var(--tf-border); box-shadow: 0 4px 14px rgb(0 0 0 / 0.10); object-fit: contain; padding: 6px; }
${t} .tf-logomark[data-monogram] { color: var(--tf-accent); font-weight: 700; font-size: 20px; padding: 0; }

${t} .pcl-body { padding: 40px clamp(18px, 4.5vw, 32px) clamp(20px, 4vw, 30px); }
${t} .pcl-title { margin: 0 0 6px; font-size: clamp(21px, 3.8vw, 26px); line-height: 1.2; letter-spacing: -0.015em; font-weight: 700; color: var(--tf-text); }
${t} .pcl-desc { margin: 0; font-size: 15px; line-height: 1.55; color: var(--tf-text-muted); }
${t} .tf-time-contract { margin: 10px 0 0; font-size: 12.5px; font-weight: 550; color: var(--tf-text-muted); }
${t} .tf-form { margin-top: 22px; }

${t} .pcl-fields { display: flex; flex-direction: column; gap: var(--tf-field-gap); }
${t} .pcl-step { animation: pcl-rise 220ms cubic-bezier(0.34, 1.2, 0.5, 1) both; }
${t} .pcl-step-count { margin: 0 0 12px; font-size: 12.5px; font-weight: 600; color: var(--tf-text-muted); }

/* Giant springy stars — the zero-typing first tap. */
${t} .tf-rating { display: flex; gap: 6px; }
${t} .tf-rating-btn { appearance: none; border: 0; background: transparent; cursor: pointer; font-size: clamp(30px, 7vw, 38px); line-height: 1; color: var(--tf-border-strong); padding: 2px; transition: transform 140ms cubic-bezier(0.34, 1.8, 0.5, 1), color 120ms ease; }
${t} .tf-rating-btn[aria-pressed="true"] { color: var(--tf-accent); }
${t} .tf-rating-btn:hover { transform: scale(1.18) rotate(-4deg); }
${t} .tf-rating-btn:active { transform: scale(0.92); }

/* "Show it in the wild" — the photo moment reads as an invitation, not a field. */
${t} .tf-upload { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 84px; border: 1.5px dashed var(--tf-border-strong); border-radius: var(--tf-radius-field); background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); font-weight: 600; font-size: 14.5px; cursor: pointer; transition: border-color 160ms ease, transform 160ms cubic-bezier(0.34, 1.4, 0.5, 1); }
${t} .tf-upload:hover { border-color: var(--tf-accent); transform: translateY(-2px); }

${t} .tf-actions { display: flex; align-items: center; gap: 10px; margin-top: 22px; }
${t} .tf-btn { appearance: none; border: 0; cursor: pointer; font: inherit; font-weight: 700; font-size: 15.5px; padding: 13px 22px; border-radius: var(--tf-radius-field); transition: transform 150ms cubic-bezier(0.34, 1.4, 0.5, 1), background 140ms ease; }
${t} .tf-btn-primary { flex: 1; background: var(--tf-accent); color: var(--tf-accent-text); box-shadow: 0 2px 8px -2px var(--tf-accent); }
${t} .tf-btn-primary:hover { background: var(--tf-accent-hover); transform: translateY(-1px); }
${t} .tf-btn-primary:active { transform: translateY(0) scale(0.99); }
${t} .tf-btn-primary:disabled { opacity: 0.65; transform: none; }
${t} .tf-btn-ghost { background: transparent; color: var(--tf-text-muted); }
${t} .tf-btn-ghost:hover { color: var(--tf-text); }

${t} .pcl-moment { text-align: center; padding: clamp(18px, 4vw, 36px) 6px; animation: pcl-pop 360ms cubic-bezier(0.34, 1.4, 0.5, 1) both; }
${t} .pcl-burst { display: inline-flex; color: var(--tf-accent); margin-bottom: 12px; animation: pcl-star 520ms cubic-bezier(0.34, 1.8, 0.5, 1) both; }
${t} .pcl-moment-title { margin: 0 0 6px; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
${t} .pcl-moment-text { margin: 0 auto; max-width: 44ch; font-size: 15px; line-height: 1.55; color: var(--tf-text-muted); }

${t} .pcl-loader { display: flex; align-items: center; justify-content: center; min-height: 240px; }
${t} .pcl-loader-box { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 16px; background: var(--tf-surface); border: 1px solid var(--tf-border); box-shadow: var(--tf-shadow); color: var(--tf-accent); font-weight: 700; font-size: 22px; animation: pcl-bounce 1.1s cubic-bezier(0.34, 1.4, 0.5, 1) infinite; }
${t} .pcl-loader-box img { width: 34px; height: 34px; object-fit: contain; }

@keyframes pcl-pop { from { opacity: 0; transform: scale(0.985) translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes pcl-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes pcl-star { 0% { transform: scale(0) rotate(-30deg); } 100% { transform: scale(1) rotate(0); } }
@keyframes pcl-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
`;
}
