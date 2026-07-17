import type { PublicSnapshot } from "@workspace/forms-core";

const MONO =
  'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

/**
 * Terminal's world: a session window, not a card lost on a field. The page is
 * flat --tf-bg; the window IS the composition — max 720px, ~72% of the
 * viewport tall, title bar with three dots, a dotted progress line, grid paper
 * confined to the body. Keycap digits, keycap stars, bottom-rule mono inputs,
 * instant linear motion. The tool responds; it doesn't perform.
 */
export function terminalStylesheet(t: string, _snapshot: PublicSnapshot): string {
  const hosted = `${t}[data-tf-surface="hosted"]`;
  const embed = `${t}[data-tf-surface="embed"]`;
  return `
/* ── The field and the session window ───────────────────────────────────── */
${hosted} .trm-field { min-height: var(--tf-viewport, 100svh); display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--tf-bg); padding: clamp(16px, 4vh, 44px) 14px; }
${embed} .trm-field { padding: 0; }

${t} .trm-panel { width: 100%; max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; background: var(--tf-surface); border: 1px solid var(--tf-border-strong); border-radius: var(--tf-radius); overflow: hidden; }
${hosted} .trm-panel { min-height: calc(var(--tf-viewport, 100svh) * 0.72); }
${embed} .trm-panel { max-width: 560px; }

${t} .trm-bar { display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 14px; flex: none; border-bottom: 1px solid var(--tf-border-strong); background: var(--tf-surface-raised); font-family: ${MONO}; font-size: 12px; color: var(--tf-text-muted); }
${t} .trm-dots { display: inline-flex; gap: 6px; flex: none; }
${t} .trm-dots i { width: 8px; height: 8px; border-radius: 50%; background: var(--tf-border-strong); }
${t} .tf-logomark { height: 18px; max-width: 90px; object-fit: contain; }
${t} .tf-logomark[data-monogram] { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 4px; background: var(--tf-accent); color: var(--tf-accent-text); font-size: 11px; font-weight: 700; }
${t} .trm-path { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${t} .trm-count { margin-left: auto; flex: none; font-variant-numeric: tabular-nums; color: var(--tf-text); }

/* ── Progress: a dotted line under the title bar, filled per step ───────── */
${t} .trm-progress { position: relative; height: 3px; margin: 12px 16px 0; flex: none; background-image: repeating-linear-gradient(90deg, var(--tf-border-strong) 0 3px, transparent 3px 9px); }
${t} .trm-progress-fill { position: absolute; top: 0; bottom: 0; left: 0; display: block; background-image: repeating-linear-gradient(90deg, var(--tf-accent) 0 3px, transparent 3px 9px); transition: width 160ms linear; }

/* Grid paper lives inside the window body only — never on the page. */
${t} .trm-body { flex: 1; padding: clamp(20px, 4vw, 32px); }
${hosted}[data-a-grid="on"] .trm-body { background-image: linear-gradient(color-mix(in oklab, var(--tf-border) 40%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--tf-border) 40%, transparent) 1px, transparent 1px); background-size: 24px 24px; }

${t} .trm-head { margin-bottom: 22px; }
${t} .trm-title { margin: 0 0 6px; font-size: clamp(19px, 3vw, 24px); line-height: 1.25; letter-spacing: -0.01em; font-weight: 650; color: var(--tf-text); }
${t} .trm-desc { margin: 0; font-size: 14px; line-height: 1.55; color: var(--tf-text-muted); max-width: 56ch; }

/* ── The transcript: history accumulates above the prompt ───────────────── */
${t} .trm-log { list-style: none; margin: 0 0 18px; padding: 0 0 14px; border-bottom: 1px dashed var(--tf-border-strong); display: flex; flex-direction: column; gap: 5px; }
${t} .trm-line { display: flex; align-items: baseline; gap: 8px; font-family: ${MONO}; font-size: 12.5px; line-height: 1.5; min-width: 0; }
${t} .trm-prompt { color: var(--tf-accent); flex: none; }
${t} .trm-key { color: var(--tf-text-muted); flex: none; max-width: 46%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${t} .trm-key::after { content: ":"; }
${t} .trm-val { color: var(--tf-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── The current ask at the caret ───────────────────────────────────────── */
${t} .trm-ask .tf-label { font-family: ${MONO}; font-size: 17px; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 12px; display: flex; align-items: baseline; gap: 9px; }
${t} .trm-ask .tf-label::before { content: "▸"; color: var(--tf-accent); flex: none; }
${t} .trm-ask .tf-help { font-size: 13px; margin: 0 0 12px 19px; }
${t} .trm-ask .tf-step-field + .tf-step-field { margin-top: 26px; }

/* Answers are mono on a bottom rule — transparent, no box. */
${t} .tf-input, ${t} .tf-textarea { font-family: ${MONO}; font-size: 15.5px; background: transparent; border: 0; border-bottom: 1.5px solid var(--tf-border-strong); border-radius: 0; padding: 8px 2px; caret-color: var(--tf-accent); transition: border-color 80ms linear, box-shadow 80ms linear; }
${t} .tf-input:focus-visible, ${t} .tf-textarea:focus-visible { outline: none; border-color: var(--tf-accent); box-shadow: 0 1px 0 0 var(--tf-accent); }
${t} .tf-textarea { min-height: 150px; line-height: 1.6; }

/* Options read as keycaps with live digit hints. */
${t} .tf-options { gap: 8px; counter-reset: trm-opt; }
${t} .tf-option { counter-increment: trm-opt; padding: 11px 12px; border: 1px solid var(--tf-border-strong); border-radius: var(--tf-radius-field); background: var(--tf-surface); font-family: ${MONO}; font-size: 15.5px; transition: border-color 80ms linear, background 80ms linear; }
${t} .tf-option::before { content: counter(trm-opt); font-family: ${MONO}; font-size: 11px; display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; flex: none; border: 1px solid var(--tf-border-strong); border-bottom-width: 2px; border-radius: 4px; color: var(--tf-text-muted); background: var(--tf-surface-raised); }
${t} .tf-option:hover { border-color: var(--tf-accent); }
${t} .tf-option[data-selected="true"] { border-color: var(--tf-accent); background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); }
${t} .tf-option[data-selected="true"]::before { border-color: var(--tf-accent); color: var(--tf-accent-soft-text); }
${t} .tf-option input { position: absolute; opacity: 0; pointer-events: none; }

/* ── Keycap stars: digit above a tiny glyph, pressed = accent fill ──────── */
${t} .tf-rating { gap: 8px; flex-wrap: wrap; counter-reset: trm-cap; }
${t} .tf-rating-btn { counter-increment: trm-cap; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; width: 46px; height: 46px; padding: 0; font-family: ${MONO}; font-size: 12px; line-height: 1; border: 1px solid var(--tf-border-strong); border-bottom-width: 3px; border-radius: 6px; background: var(--tf-surface-raised); color: var(--tf-text-muted); transition: transform 60ms linear, border-color 80ms linear, background 80ms linear, color 80ms linear; }
${t} .tf-rating:not([data-style="numbers"]) .tf-rating-btn::before { content: counter(trm-cap); font-size: 15px; font-weight: 600; color: var(--tf-text); }
${t} .tf-rating[data-style="numbers"] .tf-rating-btn { font-size: 15px; font-weight: 600; color: var(--tf-text); }
${t} .tf-rating[data-style="numbers"] .tf-rating-btn::after { content: "★"; font-size: 10px; font-weight: 400; color: var(--tf-text-muted); }
${t} .tf-rating-btn:active { transform: translateY(1px); border-bottom-width: 1px; }
${t} .tf-rating-btn[aria-pressed="true"] { border-color: var(--tf-accent); border-bottom-color: color-mix(in oklab, var(--tf-accent) 70%, #000); background: var(--tf-accent); color: var(--tf-accent-text); transform: translateY(1px); }
${t} .tf-rating-btn[aria-pressed="true"]::before, ${t} .tf-rating-btn[aria-pressed="true"]::after { color: var(--tf-accent-text); }

${t} .tf-upload, ${t} .tf-capture-btn { border-radius: var(--tf-radius-field); font-family: ${MONO}; font-size: 13px; }
${t} .tf-consent { font-family: ${MONO}; font-size: 12.5px; }

${t} .trm-hint { margin: 16px 0 0; font-family: ${MONO}; font-size: 12px; color: var(--tf-text-muted); }
${t} .trm-hint kbd { font-family: inherit; padding: 1px 5px; border: 1px solid var(--tf-border-strong); border-bottom-width: 2px; border-radius: 4px; background: var(--tf-surface-raised); }

/* ── Buttons are keycaps too — the primary carries the brand fill ───────── */
${t} .tf-actions { display: flex; align-items: center; gap: 10px; margin-top: 16px; }
${t} .tf-btn { appearance: none; cursor: pointer; font-family: ${MONO}; font-weight: 600; font-size: 14px; padding: 11px 20px; border-radius: 6px; transition: background 80ms linear, border-color 80ms linear, color 80ms linear, transform 60ms linear; }
${t} .tf-btn:active { transform: translateY(1px); }
${t} .tf-btn-primary { background: var(--tf-accent); border: 1px solid var(--tf-accent); border-bottom: 3px solid color-mix(in oklab, var(--tf-accent) 70%, #000); color: var(--tf-accent-text); }
${t} .tf-btn-primary:hover { background: color-mix(in oklab, var(--tf-accent) 92%, #fff); }
${t} .tf-btn-primary:active { border-bottom-width: 1px; }
${t} .tf-btn-primary:disabled { opacity: 0.6; cursor: default; transform: none; }
${t} .tf-btn-ghost { background: var(--tf-surface-raised); border: 1px solid var(--tf-border-strong); border-bottom-width: 2px; color: var(--tf-text-muted); }
${t} .tf-btn-ghost:hover { color: var(--tf-text); }

/* ── Moments: log-line stamps, no confetti ──────────────────────────────── */
${t} .trm-moment { padding: 6px 2px 10px; }
${t} .trm-stamp { margin: 0 0 8px; font-family: ${MONO}; font-size: 16px; font-weight: 600; color: var(--tf-accent); }
${t} .trm-moment-text { margin: 0; font-size: 14px; line-height: 1.6; color: var(--tf-text-muted); max-width: 52ch; }

${t} .tf-attribution { font-family: ${MONO}; font-size: 11.5px; }

/* ── Embed: a mini session card in the host's flow — no grid, no viewport ─ */
${embed} .trm-bar { height: 36px; }
${embed} .trm-progress { margin: 10px 14px 0; }
${embed} .trm-body { padding: 18px 18px 20px; }
${embed} .trm-title { font-size: 18px; }
${embed} .tf-attribution { margin: 10px 0 0; }

/* ── Small screens: the window goes near-flush, keycaps tighten ─────────── */
@media (max-width: 768px) {
  ${hosted} .trm-field { padding: clamp(12px, 3vh, 24px) 10px; }
  ${t} .trm-body { padding: 20px 16px 24px; }
}
@media (max-width: 480px) {
  ${hosted} .trm-field { padding: 8px 6px 16px; }
  ${t} .trm-title { font-size: 18px; }
  ${t} .trm-ask .tf-label { font-size: 16px; }
  ${t} .tf-rating { gap: 6px; }
  ${t} .tf-rating-btn { width: 42px; height: 44px; }
}

/* ── Loader: a blinking caret ───────────────────────────────────────────── */
${t} .trm-loader { display: flex; align-items: center; justify-content: center; gap: 12px; min-height: 200px; }
${t} .trm-loader-logo { height: 26px; max-width: 120px; object-fit: contain; }
${t} .trm-loader-mark { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: var(--tf-accent); color: var(--tf-accent-text); font-family: ${MONO}; font-weight: 700; font-size: 14px; }
${t} .trm-caret { width: 9px; height: 20px; background: var(--tf-accent); animation: trm-blink 1.06s steps(1) infinite; }

@keyframes trm-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
`;
}
