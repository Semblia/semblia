import type { PublicSnapshot } from "@workspace/forms-core";

function stageRules(t: string, hosted: string): string {
  return `
${t} .apt-stage { position: relative; display: flex; flex-direction: column; overflow: hidden; background: conic-gradient(from 164deg at 50% -6%, transparent 0deg, color-mix(in oklab, var(--tf-accent) 9%, transparent) 16deg, transparent 32deg), radial-gradient(640px 340px at 50% 30%, color-mix(in oklab, var(--tf-accent) 7%, transparent), transparent 70%), var(--tf-bg); }
${hosted} .apt-stage { min-height: var(--tf-viewport, 100svh); }
${t}[data-a-stage="noir"] .apt-stage { background: conic-gradient(from 164deg at 50% -6%, transparent 0deg, color-mix(in oklab, var(--tf-accent) 5%, transparent) 16deg, transparent 32deg), radial-gradient(640px 340px at 50% 30%, color-mix(in oklab, var(--tf-accent) 4%, transparent), transparent 70%), var(--tf-bg); }
${t}[data-a-stage="ember"] .apt-stage { background: conic-gradient(from 164deg at 50% -6%, transparent 0deg, color-mix(in oklab, var(--tf-accent) 10%, transparent) 16deg, transparent 32deg), radial-gradient(640px 340px at 50% 30%, color-mix(in oklab, var(--tf-accent) 8%, transparent), transparent 70%), radial-gradient(900px 420px at 50% 112%, color-mix(in oklab, var(--tf-accent) 6%, transparent), transparent 70%), var(--tf-bg); }

/* Film-strip progress along the top edge. */
${t} .apt-strip { position: absolute; top: 0; left: 0; right: 0; display: flex; gap: 5px; padding: 12px 16px; z-index: 3; }
${t} .apt-strip span { flex: 1; height: 3px; border-radius: 999px; background: rgb(255 255 255 / 0.16); transition: background 240ms ease; }
${t} .apt-strip span[data-done="true"] { background: var(--tf-accent); }

${t} .apt-back { position: absolute; top: 30px; left: 18px; z-index: 3; display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgb(255 255 255 / 0.22); background: rgb(255 255 255 / 0.05); color: var(--tf-text); cursor: pointer; transition: background 160ms ease, border-color 160ms ease; }
${t} .apt-back:hover { background: rgb(255 255 255 / 0.12); border-color: rgb(255 255 255 / 0.4); }
`;
}

function sceneRules(t: string): string {
  return `
${t} .apt-scene-wrap { flex: 1; display: flex; align-items: center; justify-content: center; padding: 92px 24px 116px; }
${t} .apt-scene { width: 100%; max-width: 720px; text-align: center; animation: apt-in 360ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
${t} .apt-lede { margin: 0 0 18px; font-size: 17px; line-height: 1.6; color: var(--tf-text-muted); }

/* Cue chrome: "01 — 04" scene numbering above the question. */
${t} .apt-cue { margin: 0 0 20px; font-family: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace; font-size: 12px; font-weight: 500; letter-spacing: 0.08em; font-variant-numeric: tabular-nums; color: var(--tf-text-muted); }

/* Cue-card prompts. */
${t} .apt-scene .tf-field { align-items: center; }
${t} .apt-scene .tf-label { font-size: clamp(30px, 4vw, 44px); font-weight: 650; letter-spacing: -0.025em; line-height: 1.15; margin-bottom: 12px; text-wrap: balance; }
${t} .apt-scene .tf-help { font-size: 17px; margin: 0 0 16px; }
${t} .apt-scene .tf-step-field + .tf-step-field, ${t} .apt-scene .apt-reassure + .tf-step-field { margin-top: 36px; }
${t} .apt-scene .tf-step-field + .tf-step-field .tf-label, ${t} .apt-scene .apt-reassure + .tf-step-field .tf-label { font-size: 17px; font-weight: 500; color: var(--tf-text-muted); }
`;
}

function inputRules(t: string): string {
  return `
/* Ring-style inputs: raised surface, no border, halo on focus. */
${t} .tf-input, ${t} .tf-textarea { max-width: 540px; border: 0; background: var(--tf-surface-raised); border-radius: var(--tf-radius-field); box-shadow: 0 0 0 1px rgb(255 255 255 / 0.13); font-size: 18px; text-align: center; transition: box-shadow 200ms ease, background 200ms ease; }
${t} .tf-textarea { text-align: left; max-width: 580px; min-height: 180px; line-height: 1.6; }
${t} .tf-input:focus-visible, ${t} .tf-textarea:focus-visible { outline: none; background: var(--tf-surface-raised); box-shadow: 0 0 0 1px var(--tf-accent), 0 0 0 4px var(--tf-focus-ring); }
${t} .tf-input::placeholder, ${t} .tf-textarea::placeholder { opacity: 0.4; }

/* Floating pill options. */
${t} .tf-options { flex-direction: row; flex-wrap: wrap; justify-content: center; gap: 10px; }
${t} .tf-option { border-radius: 999px; padding: 12px 22px; background: rgb(255 255 255 / 0.06); border: 1px solid rgb(255 255 255 / 0.17); font-size: 16px; transition: border-color 160ms ease, background 200ms ease, transform 160ms ease; }
${t} .tf-option:hover { border-color: rgb(255 255 255 / 0.45); transform: translateY(-1px); }
${t} .tf-option[data-selected="true"] { background: var(--tf-accent); border-color: transparent; color: var(--tf-accent-text); }

/* Rating holds center stage. */
${t} .tf-rating { justify-content: center; gap: 10px; }
${t} .tf-rating-btn { font-size: 54px; color: rgb(255 255 255 / 0.22); transition: color 160ms ease, transform 160ms ease; }
${t} .tf-rating-btn:hover { transform: scale(1.1); }
${t} .tf-rating-btn[aria-pressed="true"] { color: var(--tf-accent); }
`;
}

function captureRules(t: string): string {
  return `
/* The protagonist: a 16:9 stage awaits the take; record wears a halo. */
${t} .tf-capture { display: flex; flex-direction: column; align-items: center; width: 100%; }
${t} .tf-capture[data-kind="video"] .tf-rec-stage { display: block; position: relative; width: 100%; max-width: 560px; margin: 0 auto 18px; aspect-ratio: 16 / 9; border-radius: var(--tf-radius-field); overflow: hidden; background: radial-gradient(80% 120% at 50% 120%, rgb(255 255 255 / 0.07), transparent 60%), #000; box-shadow: 0 0 0 1px rgb(255 255 255 / 0.12); }
${t} .tf-capture[data-kind="video"] .tf-rec-live, ${t} .tf-capture[data-kind="video"] .tf-rec-play { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; aspect-ratio: auto; border-radius: 0; }
${t} .tf-rec-audio { margin: 0 auto 12px; }
${t} .tf-capture-btn { border: 0; padding: 18px 34px; border-radius: 999px; background: var(--tf-accent); color: var(--tf-accent-text); font-size: 17px; font-weight: 600; box-shadow: 0 0 0 9px color-mix(in oklab, var(--tf-accent) 18%, transparent); transition: transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 200ms ease; }
${t} .tf-capture-btn:hover { transform: scale(1.03); box-shadow: 0 0 0 13px color-mix(in oklab, var(--tf-accent) 13%, transparent); }
${t} .tf-capture-dot { width: 12px; height: 12px; border-radius: 50%; background: #fff; animation: apt-pulse 1.8s ease-in-out infinite; }
${t} .tf-capture-file, ${t} .tf-capture-hint { margin: 14px 0 0; font-size: 13.5px; color: var(--tf-text-muted); }
${t} .apt-reassure { margin: 16px 0 0; font-size: 14.5px; line-height: 1.5; color: var(--tf-text-muted); }

${t} .tf-upload { border-radius: 999px; border-color: rgb(255 255 255 / 0.25); }

${t} .tf-consent { justify-content: center; text-align: left; max-width: 460px; margin: 18px auto 0; }
`;
}

function chromeRules(t: string): string {
  return `
${t} .tf-actions { justify-content: center; display: flex; align-items: center; gap: 12px; margin-top: 38px; }
${t} .tf-btn { appearance: none; border: 0; cursor: pointer; font: inherit; font-weight: 600; font-size: 16px; min-height: 48px; padding: 0 34px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; transition: transform 160ms ease, background 160ms ease, color 160ms ease; }
${t} .tf-btn:active { transform: translateY(1px); }
${t} .tf-btn-primary { background: var(--tf-accent); color: var(--tf-accent-text); }
${t} .tf-btn-primary:hover { background: var(--tf-accent-hover); }
${t} .tf-btn-primary:disabled { opacity: 0.6; cursor: default; }
${t} .tf-btn-ghost { background: transparent; color: var(--tf-text-muted); }
${t} .tf-btn-ghost:hover { color: var(--tf-text); }

/* Stage footer: who's filming. */
${t} .apt-foot { position: absolute; bottom: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 22px; z-index: 3; }
${t} .apt-foot-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
${t} .tf-logomark { display: inline-flex; align-items: center; justify-content: center; height: 24px; max-width: 110px; object-fit: contain; }
${t} .tf-logomark[data-monogram] { width: 24px; border-radius: 7px; background: var(--tf-accent-soft); color: var(--tf-accent-soft-text); font-weight: 650; font-size: 12px; }
${t} .apt-foot-title { font-size: 13px; color: var(--tf-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${t} .apt-foot .tf-attribution { margin: 0; font-size: 12px; }
`;
}

function momentRules(t: string, embed: string): string {
  return `
/* Moments. */
${t} .apt-moment { text-align: center; max-width: 640px; animation: apt-in 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
${t} .apt-moment-title { margin: 0 0 10px; font-size: clamp(30px, 5vw, 46px); font-weight: 650; letter-spacing: -0.03em; color: var(--tf-text); }
${t} .apt-moment-text { margin: 0 auto; max-width: 44ch; font-size: 17px; line-height: 1.6; color: var(--tf-text-muted); }

/* Embed: the compact dark card — same input language, content-sized. */
${embed} .apt-stage { border-radius: var(--tf-radius); box-shadow: 0 0 0 1px rgb(255 255 255 / 0.1); max-width: 720px; margin: 0 auto; }
${embed} .apt-scene-wrap { padding: 64px 20px 88px; }
${embed} .apt-scene .tf-label { font-size: clamp(22px, 3vw, 28px); }
${embed} .apt-cue { margin-bottom: 14px; }
${embed} .tf-rating-btn { font-size: 44px; }
${embed} .tf-capture[data-kind="video"] .tf-rec-stage { max-width: 480px; }
${embed} .apt-strip { padding: 10px 12px; }
${embed} .apt-back { top: 24px; left: 12px; width: 36px; height: 36px; }
`;
}

function loaderRules(t: string): string {
  return `
@media (max-width: 640px) {
  ${t} .apt-scene-wrap { padding: 78px 18px 108px; }
  ${t} .tf-rating-btn { font-size: 46px; }
  ${t} .tf-capture[data-kind="video"] .tf-rec-stage { margin-bottom: 14px; }
  ${t} .apt-foot { padding: 14px 16px; }
}

/* Loader: the iris opens. */
${t} .apt-loader { position: relative; display: flex; align-items: center; justify-content: center; min-height: 280px; background: var(--tf-bg); border-radius: 20px; overflow: hidden; }
${t} .apt-loader-iris { position: absolute; width: 120px; height: 120px; border-radius: 50%; background: color-mix(in oklab, var(--tf-accent) 22%, transparent); filter: blur(34px); animation: apt-iris 1.9s ease-in-out infinite; }
${t} .apt-loader-logo { position: relative; height: 36px; max-width: 160px; object-fit: contain; }
${t} .apt-loader-mark { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; background: var(--tf-accent); color: var(--tf-accent-text); font-weight: 650; font-size: 20px; }

@keyframes apt-in { from { opacity: 0; transform: translateY(14px) scale(0.985); } to { opacity: 1; transform: none; } }
@keyframes apt-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
@keyframes apt-iris { 0%, 100% { transform: scale(0.85); opacity: 0.6; } 50% { transform: scale(1.15); opacity: 1; } }
`;
}

/**
 * Aperture's world: a dark stage under a spotlight. A conic light-cone falls
 * from the top edge onto the cue card (the void has a job now); a mono cue
 * number sits above display-type prompts; options float as pills; the
 * recorder is the protagonist on a 16:9 stage. Aperture is dark-native
 * (manifest clamps appearance to dark), so white-alpha surfaces are safe
 * throughout.
 */
export function apertureStylesheet(t: string, _snapshot: PublicSnapshot): string {
  const hosted = `${t}[data-tf-surface="hosted"]`;
  const embed = `${t}[data-tf-surface="embed"]`;
  return [
    stageRules(t, hosted),
    sceneRules(t),
    inputRules(t),
    captureRules(t),
    chromeRules(t),
    momentRules(t, embed),
    loaderRules(t),
  ].join("");
}
