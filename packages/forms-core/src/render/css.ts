/**
 * Render CSS — the skin, driven entirely by the derived `--tf-*` custom
 * properties. No color, radius, spacing, or font literal appears here except as
 * a structural fallback; everything visible comes from the publish-time theme
 * snapshot, so the studio preview and the served form cannot disagree.
 */

import { derivedThemeToCssVars, type DerivedFormTheme } from "../theme.js";
import type { ResolvedThemeSnapshot } from "../theme.js";
import type { LayoutPresetId } from "../schema/definition.js";

function varsToBlock(theme: DerivedFormTheme): string {
  return Object.entries(derivedThemeToCssVars(theme))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

/**
 * Emit the `:root` theme variables for the form. `system` writes the light
 * scheme as the default plus a `prefers-color-scheme: dark` override, so the
 * embed switches palette with zero client-side derivation.
 */
export function themeVarsCss(snapshot: ResolvedThemeSnapshot): string {
  const { light, dark } = snapshot.schemes;
  if (snapshot.appearance === "dark" && dark) {
    return `.sf-scope{color-scheme:dark;${varsToBlock(dark)}}`;
  }
  if (snapshot.appearance === "light" && light) {
    return `.sf-scope{color-scheme:light;${varsToBlock(light)}}`;
  }
  // system (or a partially-resolved snapshot): default light, swap on dark.
  const base = light ?? dark;
  let css = base
    ? `.sf-scope{color-scheme:light dark;${varsToBlock(base)}}`
    : "";
  if (light && dark) {
    css += `@media (prefers-color-scheme:dark){.sf-scope{${varsToBlock(dark)}}}`;
  }
  return css;
}

/** The shared control + chrome styles. Stable bytes — identical for every form. */
export const BASE_CSS = `
.sf-scope{font-family:var(--tf-font,ui-sans-serif,system-ui,sans-serif);
  color:var(--tf-text);background:var(--tf-bg);-webkit-font-smoothing:antialiased;
  -moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;line-height:1.5;
  letter-spacing:-.006em}
.sf-scope *,.sf-scope *::before,.sf-scope *::after{box-sizing:border-box}
.sf-vh{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.sf-root{width:100%;margin:0 auto}
.sf-header{display:flex;flex-direction:column;margin-bottom:var(--tf-section-gap)}
.sf-logo{height:38px;width:auto;max-width:170px;object-fit:contain;
  align-self:flex-start;margin-bottom:calc(var(--tf-space)*.9)}
.sf-brand{font-size:.8rem;font-weight:650;letter-spacing:-.005em;margin:0 0 calc(var(--tf-space)*.7);
  color:var(--tf-text-muted)}
.sf-headline{font-size:clamp(1.55rem,1.28rem + 1.3vw,1.95rem);font-weight:640;
  letter-spacing:-.022em;line-height:1.12;margin:0;color:var(--tf-text);text-wrap:balance}
.sf-subhead{margin:calc(var(--tf-space)*.7) 0 0;color:var(--tf-text-muted);
  font-size:1.0125rem;line-height:1.55;max-width:46ch;text-wrap:pretty}
.sf-form{display:flex;flex-direction:column;gap:var(--tf-section-gap)}
.sf-fields{display:flex;flex-direction:column;gap:var(--tf-field-gap)}
.sf-field{display:flex;flex-direction:column;gap:calc(var(--tf-space)*.55);
  border:0;padding:0;margin:0;min-width:0}
.sf-field[hidden]{display:none}
.sf-field-label,.sf-legend{padding:0;display:block}
.sf-label{display:block;font-size:.9rem;font-weight:560;letter-spacing:-.008em;
  color:var(--tf-text);line-height:1.4}
.sf-req{color:var(--tf-accent);font-weight:600}
.sf-desc{margin:calc(var(--tf-space)*.2) 0 0;font-size:.84rem;line-height:1.5;
  color:var(--tf-text-muted)}
.sf-input{width:100%;font:inherit;font-size:.96rem;color:var(--tf-text);
  background:var(--tf-surface-raised);border:max(1px,var(--tf-border-width)) solid var(--tf-border-strong);
  border-radius:var(--tf-radius-field);padding:var(--tf-field-pad);min-height:46px;
  transition:border-color .14s ease,box-shadow .14s ease,background-color .14s ease;
  appearance:none}
.sf-input::placeholder{color:var(--tf-text-muted);opacity:.62}
.sf-input:hover{border-color:color-mix(in oklab,var(--tf-border-strong),var(--tf-text) 22%)}
.sf-input:focus-visible{outline:none;border-color:var(--tf-accent);
  box-shadow:0 0 0 3.5px var(--tf-focus-ring)}
.sf-textarea{min-height:118px;resize:vertical;line-height:1.6}
.sf-select-wrap{position:relative;display:block}
.sf-select{cursor:pointer;padding-right:42px}
.sf-select-chevron{position:absolute;right:15px;top:50%;width:15px;height:15px;
  margin-top:-7px;pointer-events:none;color:var(--tf-text-muted)}
.sf-select-chevron path{fill:none;stroke:currentColor;stroke-width:1.6;
  stroke-linecap:round;stroke-linejoin:round}
.sf-file{padding:calc(var(--tf-field-pad) - 1px);cursor:pointer}
.sf-file::file-selector-button{font:inherit;font-size:.875rem;font-weight:560;cursor:pointer;
  margin-right:12px;padding:7px 13px;border:0;border-radius:calc(var(--tf-radius-field) - 3px);
  color:var(--tf-accent-soft-text);background:var(--tf-accent-soft);transition:filter .12s}
.sf-file:hover::file-selector-button{filter:brightness(.97)}
.sf-file-status{font-size:.82rem;color:var(--tf-text-muted)}
.sf-file-status[data-error]{color:#d92d20}
.sf-file-noscript{display:block;font-size:.82rem;color:var(--tf-text-muted)}
.sf-file-fallback{margin:0;font-size:.9rem;color:var(--tf-text-muted);line-height:1.5;
  padding:13px 15px;border:1px dashed var(--tf-border-strong);
  border-radius:var(--tf-radius-field);background:var(--tf-surface-raised)}
.sf-stars{display:inline-flex;flex-direction:row-reverse;justify-content:flex-end;gap:6px}
.sf-star{cursor:pointer;font-size:33px;line-height:1;color:var(--tf-border-strong);
  transition:color .12s ease,transform .12s ease;user-select:none}
.sf-star:hover,.sf-star:hover ~ .sf-star,.sf-vh:checked ~ .sf-star{color:var(--tf-accent)}
.sf-star:hover{transform:scale(1.12)}
.sf-vh:focus-visible + .sf-star{outline:2px solid var(--tf-accent);
  outline-offset:3px;border-radius:5px}
.sf-nps{display:flex;overflow:hidden;border-radius:var(--tf-radius-field);
  border:max(1px,var(--tf-border-width)) solid var(--tf-border-strong);
  background:var(--tf-surface-raised)}
.sf-nps .sf-chip{flex:1 1 0;min-width:0;min-height:46px;display:inline-flex;
  align-items:center;justify-content:center;cursor:pointer;font-size:.92rem;font-weight:540;
  font-variant-numeric:tabular-nums;color:var(--tf-text);background:transparent;
  border:0;border-left:1px solid var(--tf-border);border-radius:0;
  transition:background-color .1s ease,color .1s ease}
.sf-nps .sf-chip:first-of-type{border-left:0}
.sf-nps .sf-chip:hover{background:var(--tf-accent-soft);color:var(--tf-accent-soft-text)}
.sf-nps .sf-vh:checked + .sf-chip{background:var(--tf-accent);color:var(--tf-accent-text)}
.sf-nps .sf-vh:focus-visible + .sf-chip{outline:2px solid var(--tf-accent);outline-offset:-2px}
.sf-scale-ends{display:flex;justify-content:space-between;margin-top:calc(var(--tf-space)*.4);
  font-size:.76rem;color:var(--tf-text-muted)}
.sf-emojis{display:flex;flex-wrap:wrap;gap:10px}
.sf-emoji{cursor:pointer;font-size:27px;line-height:1;width:52px;height:52px;
  display:inline-flex;align-items:center;justify-content:center;border-radius:50%;
  background:var(--tf-surface-raised);
  border:max(1px,var(--tf-border-width)) solid var(--tf-border);
  filter:grayscale(1);opacity:.7;transition:filter .14s ease,opacity .14s ease,transform .14s ease,border-color .14s ease,background-color .14s ease}
.sf-emoji:hover{filter:grayscale(0);opacity:1;transform:scale(1.08);border-color:var(--tf-accent)}
.sf-vh:checked + .sf-emoji{filter:grayscale(0);opacity:1;
  background:var(--tf-accent-soft);border-color:var(--tf-accent);transform:scale(1.08)}
.sf-vh:focus-visible + .sf-emoji{outline:2px solid var(--tf-accent);outline-offset:2px}
.sf-choices{display:flex;flex-direction:column;gap:9px}
.sf-choice{display:flex;align-items:center;gap:12px;cursor:pointer;
  padding:13px 15px;background:var(--tf-surface-raised);
  border:max(1px,var(--tf-border-width)) solid var(--tf-border);
  border-radius:var(--tf-radius-field);
  transition:border-color .12s ease,background-color .12s ease,box-shadow .12s ease}
.sf-choice:hover{border-color:color-mix(in oklab,var(--tf-border-strong),var(--tf-text) 14%)}
.sf-choice:has(.sf-choice-input:checked){border-color:var(--tf-accent);
  background:var(--tf-accent-soft);box-shadow:0 0 0 1px var(--tf-accent) inset}
.sf-choice-input{position:absolute;opacity:0;width:0;height:0}
.sf-choice-mark{flex:0 0 auto;width:20px;height:20px;border-radius:6px;
  border:2px solid var(--tf-border-strong);position:relative;transition:all .12s ease}
.sf-field-radio .sf-choice-mark{border-radius:50%}
.sf-choice:hover .sf-choice-mark{border-color:var(--tf-accent)}
.sf-choice-input:checked + .sf-choice-mark{border-color:var(--tf-accent);
  background:var(--tf-accent)}
.sf-choice-input:checked + .sf-choice-mark::after{content:"";position:absolute;
  inset:0;display:grid;place-items:center}
.sf-field-checkbox .sf-choice-input:checked + .sf-choice-mark::after{
  width:6px;height:10px;margin:auto;border:solid var(--tf-accent-text);
  border-width:0 2px 2px 0;transform:translateY(-1px) rotate(45deg)}
.sf-field-radio .sf-choice-input:checked + .sf-choice-mark::after{
  width:8px;height:8px;border-radius:50%;background:var(--tf-accent-text)}
.sf-choice-input:focus-visible + .sf-choice-mark{box-shadow:0 0 0 3px var(--tf-focus-ring)}
.sf-choice-text{font-size:.95rem;color:var(--tf-text);line-height:1.4}
.sf-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.sf-submit{font:inherit;font-size:.96rem;font-weight:600;letter-spacing:-.005em;
  cursor:pointer;min-height:48px;padding:0 24px;border-radius:var(--tf-radius-field);
  border:1px solid var(--tf-accent);background:var(--tf-accent);color:var(--tf-accent-text);
  box-shadow:0 1px 1.5px rgba(17,20,45,.06),0 3px 10px color-mix(in oklab,var(--tf-accent) 24%,transparent);
  transition:background-color .14s ease,box-shadow .18s ease,transform .08s ease}
.sf-submit:hover{background:var(--tf-accent-hover);border-color:var(--tf-accent-hover);
  box-shadow:0 1px 1.5px rgba(17,20,45,.07),0 6px 18px color-mix(in oklab,var(--tf-accent) 34%,transparent)}
.sf-submit:active{background:var(--tf-accent-active);transform:translateY(1px);
  box-shadow:0 1px 2px color-mix(in oklab,var(--tf-accent) 24%,transparent)}
.sf-submit:focus-visible{outline:none;box-shadow:0 0 0 3.5px var(--tf-focus-ring)}
.sf-submit[disabled]{opacity:.55;cursor:not-allowed;box-shadow:none}
.sf-submit-soft{background:var(--tf-accent-soft);color:var(--tf-accent-soft-text);
  border-color:transparent;box-shadow:none}
.sf-submit-soft:hover{background:var(--tf-accent-soft);
  box-shadow:0 0 0 1px var(--tf-accent) inset}
.sf-submit-outline{background:transparent;color:var(--tf-accent);
  border-color:var(--tf-border-strong);box-shadow:none}
.sf-submit-outline:hover{background:var(--tf-accent-soft);color:var(--tf-accent-soft-text);
  border-color:var(--tf-accent)}
.sf-footer{margin-top:var(--tf-section-gap);font-size:.78rem;color:var(--tf-text-muted)}
.sf-footer a{color:var(--tf-text-muted);text-decoration:none;font-weight:560}
.sf-footer a:hover{color:var(--tf-accent);text-decoration:underline}
.sf-success{text-align:center;padding:calc(var(--tf-section-gap)*1.25) 0 var(--tf-section-gap)}
.sf-success-mark{width:60px;height:60px;margin:0 auto var(--tf-space);border-radius:50%;
  background:var(--tf-accent-soft);display:grid;place-items:center;
  animation:sf-pop .42s cubic-bezier(.16,1,.3,1) both}
.sf-success-mark svg{width:28px;height:28px;stroke:var(--tf-accent-soft-text);fill:none;
  stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;
  stroke-dasharray:26;stroke-dashoffset:26;animation:sf-draw .5s .18s ease forwards}
.sf-success-title{font-size:1.4rem;font-weight:640;letter-spacing:-.018em;margin:0 0 7px;
  color:var(--tf-text)}
.sf-success-msg{margin:0 auto;max-width:40ch;color:var(--tf-text-muted);line-height:1.55}
.sf-success-cta{display:inline-block;margin-top:var(--tf-section-gap);font-weight:600;
  text-decoration:none;padding:12px 22px;border-radius:var(--tf-radius-field);
  background:var(--tf-accent);color:var(--tf-accent-text);
  box-shadow:0 3px 10px color-mix(in oklab,var(--tf-accent) 26%,transparent)}
.sf-error{display:none;color:#d92d20;font-size:.85rem;margin-top:4px}
.sf-scope[data-invalid] .sf-error[data-active]{display:block}
@keyframes sf-pop{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:scale(1)}}
@keyframes sf-draw{to{stroke-dashoffset:0}}
@media (prefers-reduced-motion:reduce){.sf-scope *{transition:none!important;
  animation:none!important}.sf-success-mark svg{stroke-dashoffset:0}}
`.trim();

/** Conversational stepping styles — inert until the runtime adds `data-conv`. */
const CONVERSATIONAL_CSS = `
.sf-scope[data-conv] .sf-fields{position:relative}
.sf-scope[data-conv] .sf-field{display:none}
.sf-scope[data-conv] .sf-field[data-conv-active]{display:flex;
  animation:sf-step-in .28s cubic-bezier(.16,1,.3,1) both}
.sf-scope[data-conv] .sf-field[data-conv-active] .sf-label{font-size:1.05rem}
.sf-scope[data-conv] .sf-actions{justify-content:flex-start}
.sf-conv-progress{height:5px;border-radius:999px;
  background:color-mix(in oklab,var(--tf-border) 80%,transparent);
  overflow:hidden;margin-bottom:var(--tf-section-gap)}
.sf-conv-progress span{display:block;height:100%;background:var(--tf-accent);
  border-radius:999px;transition:width .35s cubic-bezier(.16,1,.3,1);width:0}
.sf-conv-back{display:none}
.sf-scope[data-conv] .sf-conv-back{display:inline-flex}
.sf-conv-count{margin-left:auto;font-size:.82rem;font-variant-numeric:tabular-nums;
  color:var(--tf-text-muted)}
.sf-conv[data-progress=none] .sf-conv-progress,
.sf-conv[data-progress=none] .sf-conv-count{display:none}
.sf-conv[data-progress=bar] .sf-conv-count{display:none}
.sf-conv[data-progress=count] .sf-conv-progress{display:none}
@keyframes sf-step-in{from{opacity:0;transform:translateY(10px)}
  to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){
  .sf-scope[data-conv] .sf-field[data-conv-active]{animation:none}}
`.trim();

const CARD_CSS = `
.sf-card .sf-root{max-width:35rem;padding:clamp(26px,5vw,46px);
  background:var(--tf-surface);border:var(--tf-border-width) solid var(--tf-border);
  border-radius:var(--tf-radius);box-shadow:var(--tf-shadow)}
.sf-card[data-width=cozy] .sf-root{max-width:31rem}
.sf-card[data-width=wide] .sf-root{max-width:40rem}
.sf-card[data-align=center] .sf-header{align-items:center;text-align:center}
.sf-card[data-align=center] .sf-logo{align-self:center}
.sf-card .sf-submit{width:100%;justify-content:center}
.sf-card .sf-actions{flex-direction:column;align-items:stretch}
`.trim();

const INLINE_CSS = `
.sf-inline .sf-root{max-width:34rem;padding:0;background:transparent;
  border:0;box-shadow:none}
.sf-inline[data-width=cozy] .sf-root{max-width:30rem}
.sf-inline[data-width=wide] .sf-root{max-width:40rem}
.sf-inline[data-align=center] .sf-header{align-items:center;text-align:center}
.sf-inline[data-align=center] .sf-logo{align-self:center}
.sf-inline[data-noheader] .sf-header{display:none}
.sf-inline .sf-headline{font-size:clamp(1.35rem,1.2rem + .7vw,1.6rem)}
`.trim();

const SPLIT_CSS = `
.sf-split .sf-root{max-width:60rem;display:grid;grid-template-columns:.92fr 1.08fr;
  background:var(--tf-surface);border:var(--tf-border-width) solid var(--tf-border);
  border-radius:var(--tf-radius);box-shadow:var(--tf-shadow);overflow:hidden}
.sf-split .sf-aside{position:relative;padding:clamp(30px,4vw,52px);
  background:var(--tf-accent-soft);color:var(--tf-accent-soft-text);
  display:flex;flex-direction:column;justify-content:center}
.sf-split .sf-aside::after{content:"";position:absolute;inset:0 auto 0 0;width:3px;
  background:var(--tf-accent)}
.sf-split .sf-aside .sf-header{margin-bottom:0}
.sf-split .sf-aside .sf-brand{color:var(--tf-accent-soft-text);opacity:.85}
.sf-split .sf-aside .sf-headline{color:var(--tf-accent-soft-text);
  font-size:clamp(1.5rem,1.2rem + 1.4vw,1.9rem)}
.sf-split .sf-aside .sf-subhead{color:var(--tf-accent-soft-text);opacity:.82;max-width:34ch}
.sf-split .sf-main{padding:clamp(28px,4vw,48px);display:flex;flex-direction:column}
.sf-split .sf-submit{width:100%;justify-content:center}
.sf-split[data-ratio=narrow] .sf-root{grid-template-columns:.7fr 1.3fr}
.sf-split[data-side=right] .sf-root{direction:rtl}
.sf-split[data-side=right] .sf-root>*{direction:ltr}
.sf-split[data-fill=solid] .sf-aside{background:var(--tf-accent)}
.sf-split[data-fill=solid] .sf-aside .sf-brand,
.sf-split[data-fill=solid] .sf-aside .sf-headline,
.sf-split[data-fill=solid] .sf-aside .sf-subhead,
.sf-split[data-fill=solid] .sf-aside-quote,
.sf-split[data-fill=solid] .sf-aside-blurb{color:var(--tf-accent-text)}
.sf-split[data-fill=solid] .sf-aside::after{
  background:color-mix(in oklab,var(--tf-accent-text) 32%,transparent)}
.sf-split[data-fill=neutral] .sf-aside{background:var(--tf-surface-raised)}
.sf-split[data-fill=neutral] .sf-aside .sf-brand{color:var(--tf-text-muted)}
.sf-split[data-fill=neutral] .sf-aside .sf-headline,
.sf-split[data-fill=neutral] .sf-aside .sf-subhead,
.sf-split[data-fill=neutral] .sf-aside-quote,
.sf-split[data-fill=neutral] .sf-aside-blurb{color:var(--tf-text)}
.sf-split[data-fill=neutral] .sf-aside::after{background:var(--tf-accent)}
.sf-aside-quote{margin:0;display:flex;flex-direction:column}
.sf-aside-quote blockquote{margin:0;font-size:1.3rem;line-height:1.45;
  font-weight:560;letter-spacing:-.012em;color:var(--tf-accent-soft-text)}
.sf-aside-author{margin-top:16px;font-size:.85rem;font-weight:560;opacity:.82;
  color:var(--tf-accent-soft-text)}
.sf-aside-blurb{font-size:1.05rem;line-height:1.6;color:var(--tf-accent-soft-text)}
@media (max-width:640px){.sf-split .sf-root{grid-template-columns:1fr}
  .sf-split .sf-aside{display:none}}
`.trim();

const CONV_SHELL_CSS = `
.sf-conv .sf-root{max-width:35rem;padding:clamp(26px,5vw,46px);
  background:var(--tf-surface);border:var(--tf-border-width) solid var(--tf-border);
  border-radius:var(--tf-radius);box-shadow:var(--tf-shadow)}
.sf-conv .sf-submit{min-width:130px;justify-content:center}
`.trim();

const PRESET_CSS: Record<LayoutPresetId, string> = {
  card: CARD_CSS,
  inline: INLINE_CSS,
  split: SPLIT_CSS,
  conversational: `${CONV_SHELL_CSS}\n${CONVERSATIONAL_CSS}`,
};

/** All non-theme CSS for a preset: base controls + the preset shell. */
export function formCss(preset: LayoutPresetId): string {
  return `${BASE_CSS}\n${PRESET_CSS[preset]}`;
}
