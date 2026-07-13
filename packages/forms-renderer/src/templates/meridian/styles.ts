import type { PublicSnapshot } from "@workspace/forms-core";

/**
 * Meridian's personality layer. Calm lifted card, precise rhythm, ink-quiet
 * motion. Structural/a11y bones come from the base stylesheet; everything
 * here reads from the AA-clamped `--tf-*` theme variables.
 */
export function meridianStylesheet(t: string, _snapshot: PublicSnapshot): string {
  return `
${t} .mrd-page { min-height: 100%; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: clamp(20px, 5vh, 64px) 16px 32px; background: var(--tf-bg); }
${t} .mrd-card { width: 100%; max-width: 620px; background: var(--tf-surface); border: var(--tf-border-width) solid var(--tf-border); border-radius: var(--tf-radius); box-shadow: var(--tf-shadow); padding: clamp(24px, 4vw, 44px); animation: mrd-settle 240ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }

${t} .mrd-header { margin-bottom: var(--tf-section-gap); }
${t} .tf-logomark { display: inline-flex; align-items: center; justify-content: center; height: 36px; max-width: 160px; object-fit: contain; margin-bottom: 18px; }
${t} .tf-logomark[data-monogram] { width: 36px; border-radius: 10px; background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); font-weight: 650; font-size: 17px; }
${t} .mrd-title { margin: 0 0 8px; font-size: clamp(24px, 4vw, 30px); line-height: 1.15; letter-spacing: -0.02em; font-weight: 650; color: var(--tf-text); }
${t} .mrd-description { margin: 0; font-size: 15.5px; line-height: 1.55; color: var(--tf-text-muted); max-width: 52ch; }
${t} .tf-time-contract { margin: 14px 0 0; font-size: 13px; color: var(--tf-text-muted); display: inline-flex; align-items: center; gap: 6px; }
${t} .tf-time-contract::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: var(--tf-accent); }

${t} .mrd-intro { margin: 0 0 var(--tf-field-gap); font-size: 15px; line-height: 1.55; color: var(--tf-text); }
${t} .mrd-fields { display: flex; flex-direction: column; gap: var(--tf-field-gap); }
${t} .mrd-step { animation: mrd-rise 200ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
${t} .mrd-step-count { margin: 0 0 14px; font-size: 12.5px; font-variant-numeric: tabular-nums; color: var(--tf-text-muted); }

${t} .tf-actions { display: flex; align-items: center; gap: 10px; margin-top: calc(var(--tf-section-gap) * 0.8); }
${t} .tf-btn { appearance: none; border: 0; cursor: pointer; font: inherit; font-weight: 600; font-size: 15px; padding: var(--tf-field-pad); border-radius: var(--tf-radius-field); transition: background 140ms ease, transform 120ms ease, box-shadow 140ms ease; }
${t} .tf-btn:active { transform: translateY(1px); }
${t} .tf-btn-primary { background: var(--tf-accent); color: var(--tf-accent-text); box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.12), 0 1px 2px rgb(0 0 0 / 0.12); }
${t} .tf-btn-primary:hover { background: var(--tf-accent-hover); }
${t} .tf-btn-primary:disabled { opacity: 0.65; cursor: default; }
${t} .tf-btn-ghost { background: transparent; color: var(--tf-text-muted); }
${t} .tf-btn-ghost:hover { color: var(--tf-text); background: var(--tf-accent-soft); }

${t} .mrd-moment { text-align: center; padding: clamp(20px, 5vw, 44px) 8px; animation: mrd-settle 240ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
${t} .mrd-check { display: inline-flex; color: var(--tf-accent); margin-bottom: 14px; }
${t} .mrd-check-ring { stroke-dasharray: 82; stroke-dashoffset: 82; animation: mrd-draw 420ms 80ms ease-out forwards; }
${t} .mrd-check-tick { stroke-dasharray: 24; stroke-dashoffset: 24; animation: mrd-draw 260ms 360ms ease-out forwards; }
${t} .mrd-moment-title { margin: 0 0 6px; font-size: 21px; font-weight: 650; letter-spacing: -0.01em; }
${t} .mrd-moment-text { margin: 0 auto; max-width: 46ch; font-size: 15px; line-height: 1.55; color: var(--tf-text-muted); }

${t} .mrd-loader { display: flex; align-items: center; justify-content: center; min-height: 240px; }
${t} .mrd-loader-logo, ${t} .mrd-loader-mark { animation: mrd-breathe 1.6s ease-in-out infinite; }
${t} .mrd-loader-logo { height: 40px; max-width: 180px; object-fit: contain; }
${t} .mrd-loader-mark { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 12px; background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); font-weight: 650; font-size: 20px; }

@keyframes mrd-settle { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes mrd-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes mrd-draw { to { stroke-dashoffset: 0; } }
@keyframes mrd-breathe { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
`;
}
