import type { PublicSnapshot } from "@workspace/forms-core";

/**
 * Aperture's personality layer: a near-black stage with a tinted vignette per
 * `stage` accent, giant prompts, a cinematic record moment, luminous progress.
 */
export function apertureStylesheet(t: string, _snapshot: PublicSnapshot): string {
  return `
${t} .apt-page { position: relative; min-height: 100%; width: 100%; display: flex; flex-direction: column; background: var(--tf-bg); overflow: hidden; }
${t} .apt-page::before { content: ""; position: absolute; inset: -20%; pointer-events: none; background: radial-gradient(ellipse 70% 55% at 50% 0%, var(--tf-accent-soft), transparent 70%); opacity: 0.55; }
${t}[data-a-stage="noir"] .apt-page::before { opacity: 0.25; }
${t}[data-a-stage="ember"] .apt-page::before { opacity: 0.7; }

${t} .apt-progress { position: absolute; top: 0; left: 0; right: 0; height: 2px; background: color-mix(in oklab, var(--tf-border) 60%, transparent); z-index: 2; }
${t} .apt-progress span { display: block; height: 100%; background: var(--tf-accent); box-shadow: 0 0 12px var(--tf-accent); transition: width 320ms cubic-bezier(0.2, 0.8, 0.2, 1); }

${t} .apt-top { position: relative; display: flex; justify-content: center; padding: 28px 20px 0; }
${t} .tf-logomark { height: 30px; max-width: 140px; object-fit: contain; opacity: 0.9; }
${t} .tf-logomark[data-monogram] { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: var(--tf-surface-raised); color: var(--tf-text); font-weight: 650; }

${t} .apt-stage { position: relative; flex: 1; display: flex; flex-direction: column; justify-content: center; width: 100%; max-width: 760px; margin: 0 auto; padding: clamp(24px, 6vh, 72px) 20px; }
${t} .apt-welcome { margin-bottom: 30px; animation: apt-in 360ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
${t} .apt-title { margin: 0 0 12px; font-size: clamp(30px, 6vw, 46px); line-height: 1.06; letter-spacing: -0.025em; font-weight: 650; color: var(--tf-text); }
${t} .apt-desc { margin: 0; font-size: 17px; line-height: 1.55; color: var(--tf-text-muted); max-width: 52ch; }
${t} .tf-time-contract { margin: 16px 0 0; font-size: 13px; color: var(--tf-text-muted); letter-spacing: 0.02em; }

${t} .apt-step { animation: apt-in 300ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
${t} .apt-count { margin: 0 0 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; letter-spacing: 0.14em; color: var(--tf-text-muted); }
${t} .apt-prompt { margin: 0 0 8px; font-size: clamp(24px, 4.6vw, 36px); line-height: 1.12; letter-spacing: -0.02em; font-weight: 600; color: var(--tf-text); }
${t} .apt-hint { margin: 0 0 26px; font-size: 15px; color: var(--tf-text-muted); }
${t} .apt-step .tf-label { font-size: clamp(21px, 3.6vw, 30px); line-height: 1.15; letter-spacing: -0.02em; font-weight: 600; margin-bottom: 16px; }

${t} .apt-row { display: flex; flex-direction: column; gap: 14px; }
/* The giant prompt (h2) already presents the ask; hide the duplicate field
   label visually while keeping it for screen readers. */
${t} .apt-row .tf-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
${t} .apt-or { margin: 0; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tf-text-muted); }

${t} .tf-capture-btn { display: inline-flex; align-items: center; gap: 14px; padding: 16px 26px 16px 18px; border-radius: 999px; background: var(--tf-surface); border: 1px solid var(--tf-border-strong); cursor: pointer; transition: border-color 160ms ease, background 160ms ease, transform 140ms ease; }
${t} .tf-capture-btn:hover { border-color: var(--tf-accent); transform: translateY(-1px); }
${t} .tf-capture-dot { position: relative; width: 16px; height: 16px; border-radius: 50%; background: #e5484d; }
${t} .tf-capture-dot::after { content: ""; position: absolute; inset: -6px; border-radius: 50%; border: 1.5px solid #e5484d; opacity: 0.6; animation: apt-pulse 1.8s ease-out infinite; }
${t} .tf-capture-label { font-size: 16.5px; font-weight: 600; color: var(--tf-text); }
${t} .tf-capture-file { margin: 6px 0 0; font-size: 13.5px; color: var(--tf-text-muted); }
${t} .tf-capture-hint { margin: 6px 0 0; font-size: 13px; color: var(--tf-text-muted); }

${t} .tf-actions { display: flex; align-items: center; gap: 12px; margin-top: 30px; }
${t} .tf-btn { appearance: none; border: 0; cursor: pointer; font: inherit; font-weight: 600; font-size: 16px; padding: 13px 26px; border-radius: 999px; transition: background 150ms ease, transform 130ms ease, box-shadow 150ms ease; }
${t} .tf-btn-primary { background: var(--tf-accent); color: var(--tf-accent-text); box-shadow: 0 0 0 0 var(--tf-accent); }
${t} .tf-btn-primary:hover { background: var(--tf-accent-hover); box-shadow: 0 0 24px -6px var(--tf-accent); }
${t} .tf-btn-primary:disabled { opacity: 0.6; }
${t} .tf-btn-ghost { background: transparent; color: var(--tf-text-muted); }
${t} .tf-btn-ghost:hover { color: var(--tf-text); }

${t} .apt-moment { text-align: center; margin: auto; padding: 40px 12px; animation: apt-in 360ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
${t} .apt-iris { display: block; width: 54px; height: 54px; margin: 0 auto 20px; border-radius: 50%; border: 2px solid var(--tf-accent); box-shadow: 0 0 32px -6px var(--tf-accent); animation: apt-iris 700ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
${t} .apt-moment-title { margin: 0 0 8px; font-size: clamp(26px, 5vw, 36px); font-weight: 650; letter-spacing: -0.02em; color: var(--tf-text); }
${t} .apt-moment-text { margin: 0 auto; max-width: 46ch; font-size: 16px; line-height: 1.55; color: var(--tf-text-muted); }

${t} .tf-attribution { position: relative; text-align: center; padding: 0 0 18px; }

${t} .apt-loader { display: flex; align-items: center; justify-content: center; min-height: 280px; background: var(--tf-bg); }
${t} .apt-loader-ring { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 50%; color: var(--tf-text); font-weight: 650; font-size: 24px; }
${t} .apt-loader-ring::before { content: ""; position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--tf-border); border-top-color: var(--tf-accent); animation: apt-spin 900ms linear infinite; }
${t} .apt-loader-ring img { width: 40px; height: 40px; object-fit: contain; border-radius: 50%; }

@keyframes apt-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes apt-pulse { 0% { transform: scale(0.7); opacity: 0.7; } 100% { transform: scale(1.4); opacity: 0; } }
@keyframes apt-iris { from { transform: scale(0.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes apt-spin { to { transform: rotate(360deg); } }
`;
}
