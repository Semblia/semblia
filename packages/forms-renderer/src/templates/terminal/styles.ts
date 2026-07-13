import type { PublicSnapshot } from "@workspace/forms-core";

const MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';

/**
 * Terminal's personality layer: grid paper (accent-gated), a bordered panel
 * with a mono metadata bar, keyboard-key option chips, instant crisp motion,
 * caret-blink accents.
 */
export function terminalStylesheet(t: string, _snapshot: PublicSnapshot): string {
  return `
${t} .trm-page { min-height: 100%; width: 100%; display: flex; flex-direction: column; align-items: center; background: var(--tf-bg); padding: clamp(16px, 5vh, 56px) 14px 28px; }
${t}[data-a-grid="on"] .trm-page { background-image: linear-gradient(var(--tf-border) 1px, transparent 1px), linear-gradient(90deg, var(--tf-border) 1px, transparent 1px); background-size: 28px 28px; background-position: center top; }

${t} .trm-panel { width: 100%; max-width: 560px; background: var(--tf-surface); border: 1px solid var(--tf-border-strong); border-radius: var(--tf-radius); overflow: hidden; }
${t} .trm-bar { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--tf-border-strong); background: var(--tf-surface-raised); font-family: ${MONO}; font-size: 12px; color: var(--tf-text-muted); }
${t} .tf-logomark { height: 18px; max-width: 90px; object-fit: contain; }
${t} .tf-logomark[data-monogram] { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 4px; background: var(--tf-accent); color: var(--tf-accent-text); font-size: 11px; font-weight: 700; }
${t} .trm-bar-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${t} .trm-bar-count { margin-left: auto; font-variant-numeric: tabular-nums; color: var(--tf-text); }

${t} .trm-body { padding: clamp(20px, 4vw, 30px); }
${t} .trm-head { margin-bottom: 22px; }
${t} .trm-title { margin: 0 0 6px; font-size: clamp(19px, 3.4vw, 23px); line-height: 1.25; letter-spacing: -0.01em; font-weight: 650; color: var(--tf-text); }
${t} .trm-desc { margin: 0; font-size: 14px; line-height: 1.55; color: var(--tf-text-muted); }

${t} .trm-fields { display: flex; flex-direction: column; gap: var(--tf-field-gap); }
${t} .trm-step { /* instant: no entrance animation — the tool responds, it doesn't perform */ }
${t} .tf-label { font-size: 15.5px; font-weight: 600; margin-bottom: 10px; color: var(--tf-text); }

/* Options read as keyboard keys with digit hints. */
${t} .tf-options { display: flex; flex-direction: column; gap: 6px; counter-reset: trm-opt; }
${t} .tf-option { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--tf-border-strong); border-radius: var(--tf-radius-field); background: var(--tf-surface); cursor: pointer; font-size: 14.5px; transition: border-color 80ms linear, background 80ms linear; counter-increment: trm-opt; }
${t} .tf-option::before { content: counter(trm-opt); font-family: ${MONO}; font-size: 11px; display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border: 1px solid var(--tf-border-strong); border-bottom-width: 2px; border-radius: 4px; color: var(--tf-text-muted); background: var(--tf-surface-raised); }
${t} .tf-option[data-selected="true"] { border-color: var(--tf-accent); background: var(--tf-accent-soft); }
${t} .tf-option[data-selected="true"]::before { border-color: var(--tf-accent); color: var(--tf-accent-soft-text); }
${t} .tf-option input { position: absolute; opacity: 0; pointer-events: none; }

/* Numeric rating renders as key caps too. */
${t} .tf-rating { display: flex; gap: 6px; flex-wrap: wrap; }
${t} .tf-rating-btn { appearance: none; cursor: pointer; font-family: ${MONO}; font-size: 15px; min-width: 38px; height: 38px; border: 1px solid var(--tf-border-strong); border-bottom-width: 2.5px; border-radius: 6px; background: var(--tf-surface); color: var(--tf-text); transition: transform 60ms linear, border-color 80ms linear, background 80ms linear; }
${t} .tf-rating-btn:active { transform: translateY(1px); border-bottom-width: 1px; }
${t} .tf-rating-btn[aria-pressed="true"] { border-color: var(--tf-accent); background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); }

${t} .tf-input, ${t} .tf-textarea { width: 100%; border: 1px solid var(--tf-border-strong); border-radius: var(--tf-radius-field); background: var(--tf-bg); color: var(--tf-text); font-size: 14.5px; padding: var(--tf-field-pad); font-family: inherit; transition: border-color 80ms linear, box-shadow 80ms linear; caret-color: var(--tf-accent); }
${t} .tf-input:focus-visible, ${t} .tf-textarea:focus-visible { outline: none; border-color: var(--tf-accent); box-shadow: 0 0 0 3px var(--tf-focus-ring); }

${t} .trm-kbd-hint { margin: 14px 0 0; font-family: ${MONO}; font-size: 11.5px; color: var(--tf-text-muted); }
${t} .trm-kbd-hint kbd { font-family: inherit; padding: 1px 5px; border: 1px solid var(--tf-border-strong); border-bottom-width: 2px; border-radius: 4px; background: var(--tf-surface-raised); }

${t} .tf-actions { display: flex; align-items: center; gap: 8px; margin-top: 20px; }
${t} .tf-btn { appearance: none; cursor: pointer; font: inherit; font-weight: 600; font-size: 14px; padding: 10px 18px; border-radius: var(--tf-radius-field); transition: background 80ms linear, border-color 80ms linear; }
${t} .tf-btn-primary { background: transparent; border: 1px solid var(--tf-accent); color: var(--tf-accent); }
${t} .tf-btn-primary:hover { background: var(--tf-accent-soft); }
${t} .tf-btn-primary:disabled { opacity: 0.6; }
${t} .tf-btn-ghost { background: transparent; border: 1px solid transparent; color: var(--tf-text-muted); }
${t} .tf-btn-ghost:hover { border-color: var(--tf-border-strong); color: var(--tf-text); }

${t} .trm-moment { padding: 18px 4px; }
${t} .trm-stamp { margin: 0 0 8px; font-family: ${MONO}; font-size: 17px; font-weight: 600; color: var(--tf-accent); }
${t} .trm-stamp[data-closed] { color: var(--tf-text-muted); }
${t} .trm-moment-text { margin: 0; font-size: 14.5px; line-height: 1.55; color: var(--tf-text-muted); }

${t} .trm-loader { display: flex; align-items: center; justify-content: center; min-height: 220px; font-family: ${MONO}; font-size: 13px; color: var(--tf-text-muted); }
${t} .trm-loader-line { display: inline-flex; align-items: center; gap: 10px; }
${t} .trm-loader-line img { height: 20px; object-fit: contain; }
${t} .trm-caret { display: inline-block; width: 7px; height: 14px; margin-left: 3px; background: var(--tf-accent); vertical-align: text-bottom; animation: trm-blink 1s steps(1) infinite; }

@keyframes trm-blink { 50% { opacity: 0; } }
`;
}
