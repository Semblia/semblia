import type { PublicSnapshot } from "@workspace/forms-core";

/**
 * Ledger's personality layer: warm paper, Fraunces serif voice, hairline
 * rules, underline inputs that read as ruled writing lines, ink-draw motion.
 */
export function ledgerStylesheet(t: string, _snapshot: PublicSnapshot): string {
  return `
${t} .ldg-page { min-height: 100%; width: 100%; display: flex; flex-direction: column; align-items: center; background: var(--tf-bg); padding: clamp(20px, 6vh, 72px) 18px 32px; }
${t} .ldg-sheet { width: 100%; max-width: 640px; }

${t} .ldg-letterhead { text-align: center; margin-bottom: clamp(28px, 5vh, 48px); }
${t} .tf-logomark { height: 34px; max-width: 150px; object-fit: contain; }
${t} .tf-logomark[data-monogram] { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--tf-border-strong); color: var(--tf-text); font-size: 17px; }
${t} .ldg-house { margin: 12px 0 0; font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--tf-text-muted); }
${t} .ldg-rule { border: 0; border-top: 1px solid var(--tf-border-strong); width: 64px; margin: 20px auto 0; }

${t} .ldg-opening { margin-bottom: clamp(24px, 4vh, 40px); animation: ldg-in 320ms ease-out both; }
${t} .ldg-title { margin: 0 0 14px; font-size: clamp(30px, 5.4vw, 42px); line-height: 1.12; font-weight: 550; letter-spacing: -0.01em; color: var(--tf-text); }
${t} .ldg-desc { margin: 0; font-size: 17px; line-height: 1.65; color: var(--tf-text-muted); max-width: 56ch; }
${t} .tf-time-contract { margin: 16px 0 0; font-size: 13.5px; font-style: italic; color: var(--tf-text-muted); }

${t} .ldg-trail { margin-bottom: 28px; }
${t} .ldg-trail-entry { margin-bottom: 20px; animation: ldg-in 260ms ease-out both; }
${t} .ldg-trail-q { margin: 0 0 4px; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--tf-text-muted); }
${t} .ldg-trail-a { margin: 0; font-size: 17px; line-height: 1.6; color: var(--tf-text); white-space: pre-wrap; }

${t} .ldg-live { animation: ldg-in 280ms ease-out both; }
${t} .ldg-count { margin: 0 0 10px; font-size: 12.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tf-text-muted); }
${t} .ldg-live .tf-label, ${t} .tf-form .tf-label { font-size: clamp(20px, 3.4vw, 26px); line-height: 1.25; font-weight: 550; margin-bottom: 12px; color: var(--tf-text); }

/* Ruled writing lines: underline-only inputs. */
${t} .tf-input, ${t} .tf-textarea { border: 0; border-bottom: 1.5px solid var(--tf-border-strong); border-radius: 0; background: transparent; padding: 8px 2px 10px; font-size: 18px; line-height: 1.6; color: var(--tf-text); transition: border-color 180ms ease; font-family: inherit; }
${t} .tf-input:focus-visible, ${t} .tf-textarea:focus-visible { outline: none; border-bottom-color: var(--tf-accent); box-shadow: 0 1.5px 0 0 var(--tf-accent); }
/* The signature moment: the author's name writes in italic. */
${t} [data-tf-field="name"] .tf-input { font-style: italic; }

${t} .tf-actions { display: flex; align-items: center; gap: 14px; margin-top: 32px; }
${t} .tf-btn { appearance: none; cursor: pointer; font: inherit; font-size: 15.5px; font-weight: 550; padding: 12px 24px; border-radius: 2px; transition: background 160ms ease, color 160ms ease, border-color 160ms ease; }
${t} .tf-btn-primary { background: var(--tf-accent); border: 1px solid var(--tf-accent); color: var(--tf-accent-text); }
${t} .tf-btn-primary:hover { background: var(--tf-accent-hover); border-color: var(--tf-accent-hover); }
${t} .tf-btn-primary:disabled { opacity: 0.6; }
${t} .tf-btn-ghost { background: transparent; border: 1px solid transparent; color: var(--tf-text-muted); }
${t} .tf-btn-ghost:hover { color: var(--tf-text); border-color: var(--tf-border-strong); }

${t} .ldg-moment { text-align: center; padding: clamp(28px, 6vh, 56px) 8px; animation: ldg-in 320ms ease-out both; }
${t} .ldg-seal { display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 50%; border: 1.5px solid var(--tf-accent); color: var(--tf-accent); font-size: 22px; margin-bottom: 18px; animation: ldg-seal 460ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
${t} .ldg-moment-title { margin: 0 0 10px; font-size: clamp(26px, 4.6vw, 34px); font-weight: 550; color: var(--tf-text); }
${t} .ldg-moment-text { margin: 0 auto; max-width: 48ch; font-size: 16.5px; line-height: 1.65; color: var(--tf-text-muted); }
${t} .ldg-moment .ldg-rule { margin-top: 28px; }

${t} .ldg-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; min-height: 260px; background: var(--tf-bg); }
${t} .ldg-loader-logo { height: 36px; max-width: 160px; object-fit: contain; }
${t} .ldg-loader-mark { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--tf-border-strong); color: var(--tf-text); font-size: 18px; }
${t} .ldg-loader-line { width: 64px; height: 1px; background: var(--tf-border-strong); position: relative; overflow: hidden; }
${t} .ldg-loader-line::after { content: ""; position: absolute; inset: 0; background: var(--tf-accent); transform: translateX(-100%); animation: ldg-write 1.4s ease-in-out infinite; }

@keyframes ldg-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes ldg-seal { from { opacity: 0; transform: scale(0.6) rotate(-8deg); } to { opacity: 1; transform: none; } }
@keyframes ldg-write { 0% { transform: translateX(-100%); } 55% { transform: translateX(0); } 100% { transform: translateX(100%); } }
`;
}
