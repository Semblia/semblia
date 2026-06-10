import { Fragment, type CSSProperties, type ReactNode } from "react";
import type {
  ContainerMode,
  FormViewModel,
  FormViewModelQuestion,
} from "./types.js";

/**
 * Hosted form renderer.
 *
 * Server-rendered HTML that delivers the full designed experience: layout
 * containers (boxed / centered / fullbleed / split), hero placements (top /
 * side / floating), rich controls built from real form inputs (star radios,
 * NPS chips, emoji scale, choice cards), a branded loader screen, and a
 * success screen with confetti / CTA / redirect.
 *
 * Progressive enhancement contract: everything works as a plain HTML form
 * POST with zero JS — all questions visible, native validation, CSS-timed
 * loader reveal. The inline client runtime (see `client/runtime.ts`) upgrades
 * the page to stepped / cards / conversational flows, conditional questions,
 * inline validation, and keyboard navigation by toggling `data-*` attributes
 * this markup and CSS already understand.
 *
 * Every visible attribute reads a `--f-*` token so the public form reflects
 * exactly what the owner designed in the Collect Studio.
 */

export const HOSTED_FORM_CSS = `
*, *::before, *::after { box-sizing: border-box; }
/* The hidden attribute must always win over component display values. */
[hidden] { display: none !important; }
html { height: 100%; }
body { margin: 0; min-height: 100dvh; }
::selection { background: var(--f-accent-16); }

/* ── Root (the --f-* tokens live here, so typography must too) ─────────── */
.hf-root {
  min-height: 100dvh; display: flex; flex-direction: column;
  font-family: var(--f-font-body);
  font-size: var(--f-size-base);
  font-weight: var(--f-weight-body);
  line-height: var(--f-body-line-height);
  color: var(--f-ink);
  background-color: var(--f-bg);
  background-image: var(--f-texture);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* ── Loader overlay ────────────────────────────────────────────────────── */
.hf-loader {
  position: fixed; inset: 0; z-index: 50;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 1.1rem; text-align: center; padding: 2rem;
  background-color: var(--f-bg);
  background-image: var(--f-texture);
  /* No-JS fallback: fade the overlay away on a CSS timer. The runtime removes
     the node at the same moment; whichever happens first wins. */
  animation: hf-loader-out .45s ease var(--hf-loader-ms, 1400ms) forwards;
}
@keyframes hf-loader-out {
  to { opacity: 0; visibility: hidden; pointer-events: none; }
}
.hf-loader-msg { margin: 0; font-size: var(--f-size-base); color: var(--f-ink-soft); }
@keyframes hf-spin { to { transform: rotate(360deg); } }
@keyframes hf-dot { 0%,80%,100% { transform: scale(.55); opacity: .35; } 40% { transform: scale(1); opacity: 1; } }
@keyframes hf-bar { 0% { left: -45%; } 100% { left: 100%; } }
@keyframes hf-pulse { 0%,100% { transform: scale(.82); opacity: .5; } 50% { transform: scale(1.08); opacity: 1; } }
@keyframes hf-logo-pulse { 0%,100% { opacity: .42; transform: scale(.92); } 50% { opacity: 1; transform: scale(1); } }
@keyframes hf-wipe { from { -webkit-mask-position: 130% 0; mask-position: 130% 0; } to { -webkit-mask-position: 0% 0; mask-position: 0% 0; } }
.hf-spinner { width: 48px; height: 48px; border-radius: 50%; border: 4px solid var(--f-line-50); border-top-color: var(--hf-tint); animation: hf-spin .8s linear infinite; }
.hf-ring { width: 52px; height: 52px; border-radius: 50%; background: conic-gradient(var(--hf-tint) 0 25%, transparent 25% 100%); -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #000 0); mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #000 0); animation: hf-spin .9s linear infinite; }
.hf-dots { display: inline-flex; gap: .5rem; }
.hf-dots span { width: 11px; height: 11px; border-radius: 50%; background: var(--hf-tint); animation: hf-dot 1.2s ease-in-out infinite; }
.hf-dots span:nth-child(2) { animation-delay: .16s; }
.hf-dots span:nth-child(3) { animation-delay: .32s; }
.hf-lbar { position: relative; width: 180px; height: 5px; border-radius: 999px; background: var(--f-line-50); overflow: hidden; }
.hf-lbar::after { content: ""; position: absolute; top: 0; bottom: 0; width: 42%; border-radius: 999px; background: var(--hf-tint); animation: hf-bar 1.1s ease-in-out infinite; }
.hf-lpulse { width: 46px; height: 46px; border-radius: 50%; background: var(--hf-tint); animation: hf-pulse 1.1s ease-in-out infinite; }
.hf-logo-pulse { height: 64px; width: auto; max-width: 60%; object-fit: contain; animation: hf-logo-pulse 1.3s ease-in-out infinite; }
.hf-logo-draw { height: 64px; width: auto; max-width: 60%; object-fit: contain; -webkit-mask-image: linear-gradient(90deg, #000 35%, transparent 65%); mask-image: linear-gradient(90deg, #000 35%, transparent 65%); -webkit-mask-size: 300% 100%; mask-size: 300% 100%; animation: hf-wipe 1.4s ease-in-out infinite; }

/* ── Stage + containers ────────────────────────────────────────────────── */
.hf-stage {
  flex: 1; width: 100%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: clamp(1rem, 3vw, var(--f-container-pad-y)) clamp(1rem, 4vw, var(--f-container-pad-x));
}
.hf-stage[data-container="fullbleed"], .hf-stage[data-container="split"] { padding: 0; align-items: stretch; }
.hf-card {
  width: 100%; max-width: min(100%, var(--f-container-max-w)); margin: 0 auto;
  background: var(--f-surface);
  border: 1px solid var(--f-line-50);
  border-radius: var(--f-radius);
  box-shadow: var(--f-shadow);
  padding: var(--f-container-pad-y) var(--f-container-pad-x);
  display: flex; flex-direction: column; gap: var(--f-gap);
}
.hf-bare {
  width: 100%; max-width: min(100%, var(--hf-col-w, 560px)); margin: 0 auto;
  display: flex; flex-direction: column; gap: var(--f-gap);
}
.hf-stage[data-container="centered"] .hf-bare { --hf-col-w: 460px; }
.hf-stage[data-container="fullbleed"] .hf-bare { --hf-col-w: 760px; padding: var(--f-container-pad-y) var(--f-container-pad-x); }

/* split: hero panel + form panel side by side, stacking when narrow */
.hf-split { display: flex; flex-wrap: wrap; min-height: 100dvh; width: 100%; align-items: stretch; }
.hf-split-hero {
  flex: 1 1 300px; background: var(--f-surface); border-right: 1px solid var(--f-line-50);
  display: flex; align-items: center;
  padding: var(--f-container-pad-y) clamp(1.25rem, 5vw, calc(var(--f-container-pad-x) * 1.5));
}
.hf-split-form { flex: 1.4 1 340px; display: flex; align-items: center; justify-content: center; padding: var(--f-container-pad-y) var(--f-container-pad-x); }
.hf-split-form .hf-flow { width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: var(--f-gap); }

/* hero beside the form (side) */
.hf-aside { display: flex; flex-wrap: wrap; gap: clamp(1.25rem, 4vw, calc(var(--f-container-pad-x) * 1.25)); width: 100%; max-width: 880px; margin: 0 auto; align-items: flex-start; }
.hf-aside[data-wide] { max-width: 1040px; }
.hf-aside-hero { flex: 1 1 220px; position: sticky; top: clamp(1rem, 4vh, 3rem); }
.hf-aside > .hf-card, .hf-aside > .hf-bare { flex: 2 1 340px; max-width: none; margin: 0; }

/* floating hero above the form shell */
.hf-stack { display: flex; flex-direction: column; gap: calc(var(--f-gap) * 1.1); width: 100%; max-width: var(--hf-col-w, 560px); margin: 0 auto; }
.hf-stack[data-wide] { max-width: 760px; }
.hf-stack > .hf-card, .hf-stack > .hf-bare { margin: 0; max-width: none; }

/* ── Hero ──────────────────────────────────────────────────────────────── */
.hf-hero { display: flex; flex-direction: column; gap: calc(var(--f-gap) * .55); }
.hf-brand {
  display: inline-flex; align-items: center; gap: .5rem; align-self: flex-start;
  margin: 0; font-family: var(--f-font-mono); font-size: var(--f-size-xs);
  letter-spacing: .12em; text-transform: uppercase; color: var(--f-accent);
}
.hf-brand img { height: 1.5rem; width: auto; max-width: 9rem; display: block; object-fit: contain; }
.hf-headline {
  margin: 0; font-family: var(--f-font-head); font-size: var(--f-size-head);
  font-weight: var(--f-weight-head); letter-spacing: var(--f-tracking-head);
  line-height: 1.12; color: var(--f-ink); text-wrap: balance;
}
.hf-hero--feature .hf-headline { font-size: calc(var(--f-size-head) * 1.12); }
.hf-subhead { margin: 0; font-size: var(--f-size-base); line-height: var(--f-body-line-height); color: var(--f-ink-soft); max-width: 56ch; }

/* ── Fields ────────────────────────────────────────────────────────────── */
.hf-fields { display: flex; flex-direction: column; gap: var(--f-flow-gap); margin-top: calc(var(--f-gap) * .35); }
.hf-field { display: flex; flex-direction: column; gap: var(--f-label-gap); border: 0; padding: 0; margin: 0; min-width: 0; }
.hf-field[data-step-hidden] { display: none; }
.hf-field[data-cond-hidden] { display: none; }
.hf-label {
  font-size: var(--f-size-sm); font-weight: 600; color: var(--f-ink);
  text-transform: var(--f-label-casing); letter-spacing: var(--f-label-tracking);
  /* float strips the legend's special fieldset positioning so it behaves as a
     normal flex child across browsers */
  padding: 0; display: block; float: left; width: 100%;
}
.hf-req { color: var(--f-accent); margin-left: .15rem; }
.hf-desc { margin: 0; font-size: var(--f-size-sm); color: var(--f-ink-soft); }
.hf-error { margin: .15rem 0 0; font-size: var(--f-size-sm); color: var(--f-error-color); }
.hf-field[data-invalid] .hf-input, .hf-field[data-invalid] .hf-textarea, .hf-field[data-invalid] .hf-select { border-color: var(--f-error-color); }
@keyframes hf-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
.hf-field[data-invalid] { animation: hf-shake .25s ease; }

.hf-input, .hf-textarea, .hf-select {
  width: 100%; font: inherit; font-size: var(--f-size-base); color: var(--f-ink);
  background: var(--f-bg);
  border: var(--f-field-border-w) solid var(--f-line);
  border-radius: var(--f-field-radius);
  padding: var(--f-field-pad) calc(var(--f-field-pad) + .15rem);
  outline: none;
  transition: border-color .12s, box-shadow .12s;
}
.hf-input::placeholder, .hf-textarea::placeholder { color: var(--f-ink-soft-50); }
.hf-textarea { min-height: 7.5rem; resize: vertical; }
.hf-input:focus, .hf-textarea:focus, .hf-select:focus {
  border-color: var(--f-focus-border);
  box-shadow: var(--f-focus-shadow);
}
.hf-root[data-shape="underline"] .hf-input,
.hf-root[data-shape="underline"] .hf-textarea,
.hf-root[data-shape="underline"] .hf-select {
  border-width: 0 0 var(--f-field-border-w) 0; border-radius: 0;
  background: transparent; padding-left: 0; padding-right: 0;
}
.hf-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23888' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right .8rem center;
  padding-right: 2.4rem;
}

/* visually hidden but focusable input (radio/checkbox engines) */
.hf-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

/* stars — reversed DOM so input:checked ~ label fills leftward */
.hf-stars { display: inline-flex; flex-direction: row-reverse; justify-content: flex-end; gap: .2rem; }
.hf-stars label {
  font-size: calc(var(--f-size-base) * 1.9); line-height: 1; color: var(--f-line);
  cursor: pointer; transition: color .1s, transform .1s; user-select: none;
}
.hf-stars label:hover { transform: scale(1.12); }
.hf-stars label:hover, .hf-stars label:hover ~ label,
.hf-stars input:checked ~ label { color: var(--f-accent); }
.hf-stars input:focus-visible + label { outline: 2px solid var(--f-accent); outline-offset: 3px; border-radius: 4px; }

/* chip scales (NPS / emoji) */
.hf-scale { display: flex; flex-wrap: wrap; gap: .3rem; }
.hf-chip {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 2.3rem; cursor: pointer; font-size: var(--f-size-sm); color: var(--f-ink);
  background: var(--f-bg); border: var(--f-field-border-w) solid var(--f-line);
  border-radius: var(--f-field-radius); padding: .45rem .6rem;
  transition: background .1s, border-color .1s, color .1s, transform .1s;
  user-select: none;
}
.hf-chip:hover { border-color: var(--f-accent); }
.hf-chip:has(input:checked) { background: var(--f-accent); color: var(--f-accent-ink); border-color: var(--f-accent); }
.hf-chip:has(input:focus-visible) { outline: 2px solid var(--f-accent); outline-offset: 2px; }
.hf-scale-ends { display: flex; justify-content: space-between; width: 100%; max-width: 26rem; font-size: var(--f-size-xs); color: var(--f-ink-soft); margin-top: .2rem; }
.hf-emoji-chip { background: none; border-color: transparent; font-size: 1.55rem; padding: .2rem .25rem; filter: grayscale(1); opacity: .55; }
.hf-emoji-chip:hover { filter: none; opacity: .85; border-color: transparent; }
.hf-emoji-chip:has(input:checked) { background: none; border-color: transparent; filter: none; opacity: 1; transform: scale(1.18); }

/* choice cards (radio / checkbox) */
.hf-choices { display: flex; flex-direction: column; gap: var(--f-label-gap); }
.hf-choice {
  display: flex; align-items: center; gap: .55rem; cursor: pointer;
  font-size: var(--f-size-base); color: var(--f-ink);
  border: var(--f-field-border-w) solid var(--f-line);
  border-radius: var(--f-field-radius);
  padding: .55rem .7rem;
  transition: border-color .1s, background .1s;
}
.hf-choice:hover { border-color: var(--f-accent); }
.hf-choice:has(input:checked) { border-color: var(--f-accent); background: var(--f-accent-08); }
.hf-choice:has(input:focus-visible) { outline: 2px solid var(--f-accent); outline-offset: 2px; }
.hf-choice-mark {
  flex: none; width: 1rem; height: 1rem;
  border: var(--f-field-border-w) solid var(--f-line);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: .65rem; line-height: 1; color: var(--f-accent-ink); background: transparent;
  transition: background .1s, border-color .1s;
}
.hf-choice[data-multi] .hf-choice-mark { border-radius: 3px; }
.hf-choice:not([data-multi]) .hf-choice-mark { border-radius: 999px; }
.hf-choice:has(input:checked) .hf-choice-mark { background: var(--f-accent); border-color: var(--f-accent); }
.hf-choice:has(input:checked) .hf-choice-mark::after { content: "✓"; }
.hf-choice:not([data-multi]):has(input:checked) .hf-choice-mark::after { content: ""; width: .375rem; height: .375rem; border-radius: 999px; background: var(--f-accent-ink); }

/* file */
.hf-file {
  display: flex; align-items: center; gap: .55rem;
  border: 1.5px dashed var(--f-line); border-radius: var(--f-field-radius);
  padding: .8rem 1rem; color: var(--f-ink-soft); font-size: var(--f-size-sm);
  cursor: pointer; transition: border-color .1s;
}
.hf-file:hover { border-color: var(--f-accent); }
.hf-file input { font-size: var(--f-size-sm); color: var(--f-ink-soft); max-width: 100%; }

/* ── Actions / buttons ─────────────────────────────────────────────────── */
.hf-actions { margin-top: calc(var(--f-gap) * .8); display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
.hf-btn {
  display: inline-flex; justify-content: center; align-items: center; gap: .4rem;
  width: var(--f-btn-width);
  border: var(--f-btn-border-w) solid var(--f-btn-border-c);
  border-radius: var(--f-btn-radius);
  background: var(--f-btn-bg); color: var(--f-btn-color);
  box-shadow: var(--f-btn-shadow);
  padding: var(--f-btn-pad-y) var(--f-btn-pad-x);
  font: inherit; font-size: var(--f-size-base); font-weight: 600;
  text-transform: var(--f-btn-uppercase); letter-spacing: var(--f-btn-tracking);
  cursor: pointer;
  transition: filter .1s, transform .08s;
}
.hf-btn:hover { filter: brightness(.96); }
.hf-btn:active { transform: translateY(1px); }
.hf-btn:focus-visible { outline: 2px solid var(--f-accent); outline-offset: 2px; }
.hf-btn[data-ghost] { background: transparent; color: var(--f-ink); border: 1.5px solid var(--f-line); box-shadow: none; width: auto; }
.hf-btn[disabled] { opacity: .6; cursor: default; }
.hf-key-hint { font-size: var(--f-size-xs); color: var(--f-ink-soft-50); font-family: var(--f-font-mono); }
.hf-key-hint kbd { font: inherit; border: 1px solid var(--f-line); border-bottom-width: 2px; border-radius: 4px; padding: .1rem .3rem; }

/* ── Progress ──────────────────────────────────────────────────────────── */
.hf-progress { display: flex; flex-direction: column; gap: .45rem; }
.hf-progress[data-sticky] { position: sticky; top: 0; z-index: 5; padding: .6rem 0; background: color-mix(in srgb, var(--f-surface) 88%, transparent); backdrop-filter: blur(6px); }
.hf-progress-track { height: 4px; width: 100%; background: var(--f-line-50); border-radius: 999px; overflow: hidden; }
.hf-progress-fill { height: 100%; width: 0%; background: var(--f-accent); border-radius: 999px; transition: width .3s ease; }
.hf-step-meta { font-family: var(--f-font-mono); font-size: var(--f-size-xs); letter-spacing: .08em; text-transform: uppercase; color: var(--f-ink-soft); }

/* ── Flow upgrades (runtime adds .hf-js to the root) ───────────────────── */
@keyframes hf-step-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
.hf-js .hf-field[data-step-active] { animation: hf-step-in .28s ease both; }

/* cards: each visible question becomes its own floating card */
.hf-js[data-flow="cards"] .hf-field[data-step-active] {
  background: var(--f-surface);
  border: 1px solid var(--f-line-50);
  border-radius: var(--f-radius);
  box-shadow: var(--f-shadow);
  padding: calc(var(--f-container-pad-y) * .75) calc(var(--f-container-pad-x) * .75);
}
.hf-js[data-flow="cards"] .hf-card { background: transparent; border-color: transparent; box-shadow: none; }

/* conversational: one large question, editorial scale */
.hf-js[data-flow="conversational"] .hf-field[data-step-active] .hf-label { font-size: calc(var(--f-size-head) * .62); font-family: var(--f-font-head); font-weight: var(--f-weight-head); letter-spacing: var(--f-tracking-head); line-height: 1.2; text-transform: none; }
.hf-js[data-flow="conversational"] .hf-field[data-step-active] { gap: calc(var(--f-label-gap) * 2); }
.hf-js[data-flow="conversational"] .hf-hero .hf-headline { font-size: calc(var(--f-size-head) * .55); }
.hf-js[data-flow="conversational"] .hf-stars label { font-size: calc(var(--f-size-base) * 2.4); }

/* ── Success screen ────────────────────────────────────────────────────── */
.hf-success {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 1rem; text-align: center; padding: var(--f-container-pad-y) var(--f-container-pad-x);
  position: relative; overflow: hidden; min-height: 100dvh;
}
.hf-success-emoji { font-size: 2.6rem; line-height: 1; }
.hf-success-logo { height: 56px; width: auto; max-width: 12rem; object-fit: contain; }
.hf-success .hf-subhead { max-width: 46ch; }
@keyframes hf-confetti { to { transform: translateY(110vh) rotate(540deg); opacity: 0; } }
.hf-confetti { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.hf-confetti span { position: absolute; top: -14px; width: 8px; height: 14px; border-radius: 1px; animation: hf-confetti linear both; animation-iteration-count: 1; }

/* ── Watermark ─────────────────────────────────────────────────────────── */
.hf-watermark {
  position: fixed; right: .9rem; bottom: .9rem; z-index: 20;
  display: inline-flex; align-items: center; gap: .35rem;
  font-size: 11px; font-family: var(--f-font-mono); letter-spacing: .02em;
  color: var(--f-ink-soft); text-decoration: none;
  background: color-mix(in srgb, var(--f-surface) 85%, transparent);
  border: 1px solid var(--f-line-50); border-radius: 999px;
  padding: .3rem .65rem; backdrop-filter: blur(6px);
}
.hf-watermark:hover { color: var(--f-ink); }
.hf-watermark b { font-weight: 650; }

/* ── Mobile container overrides (data-m-container) ─────────────────────── */
@media (max-width: 719px) {
  .hf-aside-hero { position: static; }
  .hf-split-hero { border-right: 0; border-bottom: 1px solid var(--f-line-50); flex-basis: auto; width: 100%; }
  .hf-stage[data-m-container="boxed"] { padding: clamp(1rem, 3vw, var(--f-container-pad-y)) 1rem; align-items: center; }
  .hf-stage[data-m-container="boxed"] .hf-bare {
    background: var(--f-surface); border: 1px solid var(--f-line-50);
    border-radius: var(--f-radius); box-shadow: var(--f-shadow);
    padding: var(--f-container-pad-y) var(--f-container-pad-x);
  }
  .hf-stage[data-m-container="centered"], .hf-stage[data-m-container="fullbleed"] { padding: clamp(1rem, 3vw, var(--f-container-pad-y)) 1rem; }
  .hf-stage[data-m-container="centered"] .hf-card, .hf-stage[data-m-container="fullbleed"] .hf-card {
    background: transparent; border-color: transparent; box-shadow: none; padding-left: 0; padding-right: 0;
  }
}

/* ── Reduced motion ────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .hf-spinner, .hf-ring, .hf-dots span, .hf-lbar::after, .hf-lpulse,
  .hf-logo-pulse, .hf-logo-draw, .hf-confetti span,
  .hf-field[data-step-active], .hf-field[data-invalid] { animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
  .hf-loader { animation-delay: 0ms; }
  .hf-progress-fill, .hf-btn, .hf-chip, .hf-choice, .hf-stars label { transition: none !important; }
}
`;

/* ─── Controls ─────────────────────────────────────────────────────────────── */

const EMOJIS = ["😞", "😕", "😐", "🙂", "😍"];

function Stars(question: FormViewModelQuestion) {
  // Reverse order (5→1) so the pure-CSS `input:checked ~ label` fill works.
  return (
    <div className="hf-stars" role="radiogroup" aria-label={question.label}>
      {[5, 4, 3, 2, 1].map((n) => {
        const id = `star-${question.id}-${n}`;
        // input + label are direct siblings of .hf-stars so the pure-CSS
        // `input:checked ~ label` fill can reach the labels that follow.
        return (
          <Fragment key={n}>
            <input
              id={id}
              className="hf-sr"
              type="radio"
              name={question.inputName}
              value={n}
              required={question.required}
            />
            <label htmlFor={id} title={`${n} star${n > 1 ? "s" : ""}`}>
              ★
            </label>
          </Fragment>
        );
      })}
    </div>
  );
}

function ChipScale(props: {
  question: FormViewModelQuestion;
  values: Array<number | string>;
  faces?: string[];
  emoji?: boolean;
  ends?: [string, string];
}) {
  const { question, values, faces, emoji, ends } = props;
  return (
    <>
      <div className="hf-scale" role="radiogroup" aria-label={question.label}>
        {values.map((value, index) => (
          <label
            key={value}
            className={emoji ? "hf-chip hf-emoji-chip" : "hf-chip"}
          >
            <input
              className="hf-sr"
              type="radio"
              name={question.inputName}
              value={value}
              required={question.required}
              aria-label={faces ? `${faces[index]} (${value})` : `${value}`}
            />
            <span aria-hidden="true">{faces ? faces[index] : value}</span>
          </label>
        ))}
      </div>
      {ends ? (
        <div className="hf-scale-ends" aria-hidden="true">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </div>
      ) : null}
    </>
  );
}

function Choices(question: FormViewModelQuestion, multiple: boolean) {
  return (
    <div
      className="hf-choices"
      role={multiple ? "group" : "radiogroup"}
      aria-label={question.label}
    >
      {question.options.map((option, index) => (
        <label
          key={`${question.id}-${index}`}
          className="hf-choice"
          data-multi={multiple ? "" : undefined}
        >
          <input
            className="hf-sr"
            type={multiple ? "checkbox" : "radio"}
            name={multiple ? `${question.inputName}[]` : question.inputName}
            value={option}
            required={question.required && !multiple}
          />
          <span className="hf-choice-mark" aria-hidden="true" />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

function renderControl(question: FormViewModelQuestion) {
  switch (question.type) {
    case "longtext":
    case "textarea":
      return (
        <textarea
          className="hf-textarea"
          name={question.inputName}
          placeholder={question.placeholder}
          required={question.required}
        />
      );
    case "stars":
    case "rating":
      return Stars(question);
    case "emoji":
      return (
        <ChipScale
          question={question}
          values={[1, 2, 3, 4, 5]}
          faces={EMOJIS}
          emoji
        />
      );
    case "nps":
      return (
        <ChipScale
          question={question}
          values={Array.from({ length: 11 }, (_, n) => n)}
          ends={["Not likely", "Very likely"]}
        />
      );
    case "dropdown":
      return (
        <select
          className="hf-select"
          name={question.inputName}
          required={question.required}
          defaultValue=""
        >
          <option value="" disabled>
            Choose one…
          </option>
          {question.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    case "radio":
      return question.options.length > 0 ? (
        Choices(question, false)
      ) : (
        <input
          className="hf-input"
          type="text"
          name={question.inputName}
          required={question.required}
        />
      );
    case "checkbox":
      return Choices(question, true);
    case "file":
      return (
        <label className="hf-file">
          <input
            type="file"
            name={question.inputName}
            required={question.required}
          />
        </label>
      );
    case "email":
      return (
        <input
          className="hf-input"
          type="email"
          name={question.inputName}
          placeholder={question.placeholder}
          required={question.required}
          autoComplete="email"
        />
      );
    default:
      return (
        <input
          className="hf-input"
          type="text"
          name={question.inputName}
          placeholder={question.placeholder}
          required={question.required}
        />
      );
  }
}

function FieldBlock(question: FormViewModelQuestion) {
  return (
    <fieldset
      className="hf-field"
      key={question.id}
      data-qid={question.id}
      data-qtype={question.type}
      data-required={question.required ? "" : undefined}
    >
      <legend className="hf-label">
        {question.label}
        {question.required ? (
          <span className="hf-req" aria-hidden="true">
            *
          </span>
        ) : null}
      </legend>
      {question.description ? (
        <p className="hf-desc">{question.description}</p>
      ) : null}
      {renderControl(question)}
      <p className="hf-error" data-error="" hidden />
    </fieldset>
  );
}

/* ─── Hero ─────────────────────────────────────────────────────────────────── */

function HeroBlock(props: { model: FormViewModel; feature?: boolean }) {
  const { model, feature } = props;
  return (
    <header className={feature ? "hf-hero hf-hero--feature" : "hf-hero"}>
      {model.layout.showBrandPill ? (
        <p className="hf-brand">
          {model.logoUrl ? <img src={model.logoUrl} alt="" /> : null}
          <span>{model.brandName}</span>
        </p>
      ) : null}
      <h1 className="hf-headline">{model.headline}</h1>
      {model.subhead ? <p className="hf-subhead">{model.subhead}</p> : null}
    </header>
  );
}

/* ─── Form body ────────────────────────────────────────────────────────────── */

function FormBody(props: { model: FormViewModel; actionPath: string }) {
  const { model, actionPath } = props;
  const sticky = model.layout.stickyProgress;
  return (
    <form
      method="post"
      action={actionPath}
      className="hf-form"
      data-form=""
      style={{ display: "contents" }}
    >
      <div
        className="hf-progress"
        data-progress=""
        data-sticky={sticky ? "" : undefined}
        hidden
      >
        <div className="hf-progress-track">
          <div className="hf-progress-fill" data-progress-fill="" />
        </div>
        <span className="hf-step-meta" data-step-meta="" aria-live="polite" />
      </div>
      <div className="hf-fields">{model.questions.map(FieldBlock)}</div>
      <div className="hf-actions">
        <button
          type="button"
          className="hf-btn"
          data-ghost=""
          data-nav-back=""
          hidden
        >
          Back
        </button>
        <button type="button" className="hf-btn" data-nav-next="" hidden>
          Next
        </button>
        <button className="hf-btn" type="submit" data-submit="">
          {model.submitLabel}
        </button>
        <span className="hf-key-hint" data-key-hint="" hidden>
          press <kbd>Enter ↵</kbd>
        </span>
      </div>
    </form>
  );
}

/* ─── Form stage (container × hero placement) ──────────────────────────────── */

function FormStage(props: { model: FormViewModel; actionPath: string }) {
  const { model, actionPath } = props;
  const { container, hero } = model.layout;
  const showHero = hero !== "none";
  const body = <FormBody model={model} actionPath={actionPath} />;
  const mContainer = resolveMobileContainer(model);

  // Two-pane split — hero lives in its own panel beside the form.
  if (container === "split" && showHero) {
    return (
      <div
        className="hf-stage"
        data-container="split"
        data-m-container={mContainer}
      >
        <div className="hf-split">
          <div className="hf-split-hero">
            <HeroBlock model={model} feature />
          </div>
          <main className="hf-split-form">
            <div className="hf-flow">{body}</div>
          </main>
        </div>
      </div>
    );
  }

  // Split with no hero collapses to a single full-bleed column.
  const effContainer: ContainerMode =
    container === "split" ? "fullbleed" : container;
  const wide = effContainer === "fullbleed";
  const shellClass = effContainer === "boxed" ? "hf-card" : "hf-bare";

  // Hero beside the form (side).
  if (hero === "side") {
    return (
      <div
        className="hf-stage"
        data-container={effContainer}
        data-m-container={mContainer}
      >
        <div className="hf-aside" data-wide={wide ? "" : undefined}>
          <div className="hf-aside-hero">
            <HeroBlock model={model} feature />
          </div>
          <main className={shellClass}>{body}</main>
        </div>
      </div>
    );
  }

  // Floating hero above the form shell.
  if (hero === "floating") {
    return (
      <div
        className="hf-stage"
        data-container={effContainer}
        data-m-container={mContainer}
      >
        <div className="hf-stack" data-wide={wide ? "" : undefined}>
          <HeroBlock model={model} feature />
          <main className={shellClass}>{body}</main>
        </div>
      </div>
    );
  }

  // Hero on top (inside the shell) or no hero at all.
  return (
    <div
      className="hf-stage"
      data-container={effContainer}
      data-m-container={mContainer}
    >
      <main className={shellClass} data-wide={wide ? "" : undefined}>
        {showHero ? <HeroBlock model={model} /> : null}
        {body}
      </main>
    </div>
  );
}

/** Mobile container override only when explicitly set and different. */
function resolveMobileContainer(model: FormViewModel): string | undefined {
  const { container, mobileContainer } = model.layout;
  if (mobileContainer === "auto" || mobileContainer === container) {
    return undefined;
  }
  return mobileContainer;
}

/* ─── Loader screen ────────────────────────────────────────────────────────── */

function LoaderOverlay(props: { model: FormViewModel }) {
  const { loader, logoUrl } = props.model;
  const tint = loader.tint === "ink" ? "var(--f-ink)" : "var(--f-accent)";
  const wantsLogo = loader.useLogo && Boolean(logoUrl);

  let visual: ReactNode;
  if (wantsLogo) {
    visual =
      loader.style === "logo-draw" ? (
        <img className="hf-logo-draw" src={logoUrl!} alt="" />
      ) : (
        <img className="hf-logo-pulse" src={logoUrl!} alt="" />
      );
  } else if (loader.style === "spinner") {
    visual = <span className="hf-spinner" />;
  } else if (loader.style === "dots") {
    visual = (
      <span className="hf-dots">
        <span />
        <span />
        <span />
      </span>
    );
  } else if (loader.style === "bar") {
    visual = <span className="hf-lbar" />;
  } else if (loader.style === "pulse") {
    visual = <span className="hf-lpulse" />;
  } else {
    // ring (default) + fallback for logo styles without a logo
    visual = <span className="hf-ring" />;
  }

  return (
    <div
      className="hf-loader"
      data-loader=""
      role="status"
      style={
        {
          "--hf-tint": tint,
          "--hf-loader-ms": `${props.model.loader.durationMs}ms`,
        } as CSSProperties
      }
    >
      {visual}
      {loader.message ? (
        <p className="hf-loader-msg">{loader.message}</p>
      ) : (
        <span className="hf-sr">Loading</span>
      )}
    </div>
  );
}

/* ─── Success screen ───────────────────────────────────────────────────────── */

const CONFETTI_COLORS = [
  "var(--f-accent)",
  "var(--f-ink)",
  "var(--f-accent)",
  "var(--f-ink-soft)",
];

function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    left: `${(i * 4.1 + (i % 3) * 7) % 100}%`,
    delay: `${(i % 7) * 0.16}s`,
    duration: `${2 + (i % 4) * 0.4}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    rotate: `${(i * 37) % 180}deg`,
  }));
  return (
    <div className="hf-confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: p.left,
            background: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            transform: `rotate(${p.rotate})`,
          }}
        />
      ))}
    </div>
  );
}

function SuccessScreen(props: { model: FormViewModel }) {
  const { model } = props;
  const { success, logoUrl } = model;
  const showCta = success.action === "cta" && success.ctaUrl;
  return (
    <main className="hf-success">
      {success.showConfetti ? <Confetti /> : null}
      {success.useLogo && logoUrl ? (
        <img className="hf-success-logo" src={logoUrl} alt="" />
      ) : success.emoji ? (
        <div className="hf-success-emoji" aria-hidden="true">
          {success.emoji}
        </div>
      ) : null}
      <h1 className="hf-headline">{success.title}</h1>
      {success.message ? <p className="hf-subhead">{success.message}</p> : null}
      {showCta ? (
        <a className="hf-btn" href={success.ctaUrl}>
          {success.ctaLabel || "Continue"}
        </a>
      ) : null}
      {success.action === "redirect" && success.redirectUrl ? (
        <p className="hf-step-meta">Redirecting…</p>
      ) : null}
    </main>
  );
}

/* ─── Root ─────────────────────────────────────────────────────────────────── */

export function HostedForm(props: {
  model: FormViewModel;
  actionPath: string;
  submitted?: boolean;
}) {
  const { model } = props;
  const style = {
    ...model.cssVars,
    colorScheme: model.colorScheme,
  } as CSSProperties;

  return (
    <div
      className="hf-root"
      data-shape={model.fieldShape}
      data-flow={model.layout.flow}
      style={style}
    >
      {props.submitted ? (
        <SuccessScreen model={model} />
      ) : (
        <>
          {model.loader.enabled ? <LoaderOverlay model={model} /> : null}
          <FormStage model={model} actionPath={props.actionPath} />
        </>
      )}
      <a
        className="hf-watermark"
        href="https://tresta.app"
        target="_blank"
        rel="noopener noreferrer"
      >
        Powered by <b>Tresta</b>
      </a>
    </div>
  );
}
