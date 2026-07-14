import type { PublicSnapshot } from "@workspace/forms-core";

const MONO =
  'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

/**
 * Terminal's world: a session, not a card. Grid-paper field (accent-gated),
 * a panel with a mono status bar, a dimmed transcript of answered asks above
 * the caret, keycap digit options, instant linear motion. The tool responds;
 * it doesn't perform.
 */
export function terminalStylesheet(t: string, _snapshot: PublicSnapshot): string {
  const hosted = `${t}[data-tf-surface="hosted"]`;
  const embed = `${t}[data-tf-surface="embed"]`;
  return `
/* ── The field and the panel ────────────────────────────────────────────── */
${hosted} .trm-field { min-height: 100vh; min-height: 100svh; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; background: var(--tf-bg); padding: clamp(16px, 6vh, 64px) 14px 28px; }
${hosted}[data-a-grid="on"] .trm-field { background-image: linear-gradient(var(--tf-border) 1px, transparent 1px), linear-gradient(90deg, var(--tf-border) 1px, transparent 1px); background-size: 28px 28px; background-position: center top; }
${embed} .trm-field { padding: 0; }

${t} .trm-panel { width: 100%; max-width: 600px; margin: 0 auto; background: var(--tf-surface); border: 1px solid var(--tf-border-strong); border-radius: var(--tf-radius); overflow: hidden; }

${t} .trm-bar { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--tf-border-strong); background: var(--tf-surface-raised); font-family: ${MONO}; font-size: 12px; color: var(--tf-text-muted); }
${t} .tf-logomark { height: 18px; max-width: 90px; object-fit: contain; }
${t} .tf-logomark[data-monogram] { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 4px; background: var(--tf-accent); color: var(--tf-accent-text); font-size: 11px; font-weight: 700; }
${t} .trm-path { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${t} .trm-count { margin-left: auto; font-variant-numeric: tabular-nums; color: var(--tf-text); }

${t} .trm-body { padding: clamp(18px, 4vw, 28px); }
${t} .trm-head { margin-bottom: 20px; }
${t} .trm-title { margin: 0 0 5px; font-size: clamp(18px, 3vw, 22px); line-height: 1.25; letter-spacing: -0.01em; font-weight: 650; color: var(--tf-text); }
${t} .trm-desc { margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--tf-text-muted); }

/* ── The transcript: history accumulates above the prompt ───────────────── */
${t} .trm-log { list-style: none; margin: 0 0 18px; padding: 0 0 14px; border-bottom: 1px dashed var(--tf-border-strong); display: flex; flex-direction: column; gap: 5px; }
${t} .trm-line { display: flex; align-items: baseline; gap: 8px; font-family: ${MONO}; font-size: 12.5px; line-height: 1.5; min-width: 0; }
${t} .trm-prompt { color: var(--tf-accent); flex: none; }
${t} .trm-key { color: var(--tf-text-muted); flex: none; max-width: 46%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${t} .trm-key::after { content: ":"; }
${t} .trm-val { color: var(--tf-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── The current ask at the caret ───────────────────────────────────────── */
${t} .trm-ask .tf-label { font-size: 15.5px; font-weight: 600; margin-bottom: 10px; display: flex; align-items: baseline; gap: 8px; }
${t} .trm-ask .tf-label::before { content: "›"; font-family: ${MONO}; color: var(--tf-accent); }
${t} .trm-ask .tf-help { font-size: 13px; margin: 0 0 10px 16px; }
${t} .trm-ask .tf-step-field + .tf-step-field { margin-top: 22px; }

${t} .tf-input, ${t} .tf-textarea { border: 1px solid var(--tf-border-strong); border-radius: var(--tf-radius-field); background: var(--tf-bg); font-size: 14.5px; padding: 10px 12px; caret-color: var(--tf-accent); transition: border-color 80ms linear, box-shadow 80ms linear; }
${t} .tf-input:focus-visible, ${t} .tf-textarea:focus-visible { outline: none; border-color: var(--tf-accent); box-shadow: 0 0 0 3px var(--tf-focus-ring); }

/* Options read as keycaps with live digit hints. */
${t} .tf-options { gap: 6px; counter-reset: trm-opt; }
${t} .tf-option { counter-increment: trm-opt; padding: 10px 12px; border: 1px solid var(--tf-border-strong); border-radius: var(--tf-radius-field); background: var(--tf-surface); font-size: 14.5px; transition: border-color 80ms linear, background 80ms linear; }
${t} .tf-option::before { content: counter(trm-opt); font-family: ${MONO}; font-size: 11px; display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; flex: none; border: 1px solid var(--tf-border-strong); border-bottom-width: 2px; border-radius: 4px; color: var(--tf-text-muted); background: var(--tf-surface-raised); }
${t} .tf-option:hover { border-color: var(--tf-accent); }
${t} .tf-option[data-selected="true"] { border-color: var(--tf-accent); background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); }
${t} .tf-option[data-selected="true"]::before { border-color: var(--tf-accent); color: var(--tf-accent-soft-text); }
${t} .tf-option input { position: absolute; opacity: 0; pointer-events: none; }

/* Numeric rating renders as keycaps too. */
${t} .tf-rating { gap: 6px; flex-wrap: wrap; }
${t} .tf-rating-btn { font-family: ${MONO}; font-size: 15px; min-width: 38px; height: 38px; border: 1px solid var(--tf-border-strong); border-bottom-width: 2.5px; border-radius: 6px; background: var(--tf-surface); color: var(--tf-text); padding: 0; transition: transform 60ms linear, border-color 80ms linear, background 80ms linear; }
${t} .tf-rating-btn:active { transform: translateY(1px); border-bottom-width: 1px; }
${t} .tf-rating-btn[aria-pressed="true"] { border-color: var(--tf-accent); background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); }

${t} .tf-upload, ${t} .tf-capture-btn { border-radius: var(--tf-radius-field); font-family: ${MONO}; font-size: 13px; }
${t} .tf-consent { font-size: 13px; }

${t} .trm-hint { margin: 16px 0 0; font-family: ${MONO}; font-size: 11.5px; color: var(--tf-text-muted); }
${t} .trm-hint kbd { font-family: inherit; padding: 1px 5px; border: 1px solid var(--tf-border-strong); border-bottom-width: 2px; border-radius: 4px; background: var(--tf-surface-raised); }

${t} .tf-actions { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
${t} .tf-btn { appearance: none; cursor: pointer; font: inherit; font-weight: 600; font-size: 14px; padding: 9px 18px; border-radius: var(--tf-radius-field); transition: background 80ms linear, border-color 80ms linear, color 80ms linear; }
${t} .tf-btn-primary { background: transparent; border: 1px solid var(--tf-accent); color: var(--tf-accent); }
${t} .tf-btn-primary:hover { background: var(--tf-accent-soft); }
${t} .tf-btn-primary:disabled { opacity: 0.6; cursor: default; }
${t} .tf-btn-ghost { background: transparent; border: 1px solid transparent; color: var(--tf-text-muted); }
${t} .tf-btn-ghost:hover { border-color: var(--tf-border-strong); color: var(--tf-text); }

/* ── Moments: log-line stamps, no confetti ──────────────────────────────── */
${t} .trm-moment { padding: 6px 2px 10px; }
${t} .trm-stamp { margin: 0 0 8px; font-family: ${MONO}; font-size: 16px; font-weight: 600; color: var(--tf-accent); }
${t} .trm-moment-text { margin: 0; font-size: 14px; line-height: 1.6; color: var(--tf-text-muted); }

${t} .tf-attribution { font-family: ${MONO}; font-size: 11.5px; }
${embed} .tf-attribution { margin: 10px 0 0; }

/* ── Loader: a blinking caret ───────────────────────────────────────────── */
${t} .trm-loader { display: flex; align-items: center; justify-content: center; gap: 12px; min-height: 200px; }
${t} .trm-loader-logo { height: 26px; max-width: 120px; object-fit: contain; }
${t} .trm-loader-mark { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: var(--tf-accent); color: var(--tf-accent-text); font-family: ${MONO}; font-weight: 700; font-size: 14px; }
${t} .trm-caret { width: 9px; height: 20px; background: var(--tf-accent); animation: trm-blink 1.06s steps(1) infinite; }

@keyframes trm-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
`;
}
