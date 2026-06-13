/**
 * Render CSS — the skin, driven entirely by the derived `--tf-*` custom
 * properties. No color, radius, spacing, or font literal appears here except as
 * a structural fallback; everything visible comes from the publish-time theme
 * snapshot, so the studio preview and the served form cannot disagree.
 */

import {
  derivedThemeToCssVars,
  type DerivedFormTheme,
} from "../theme.js";
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
  let css = base ? `.sf-scope{color-scheme:light dark;${varsToBlock(base)}}` : "";
  if (light && dark) {
    css += `@media (prefers-color-scheme:dark){.sf-scope{${varsToBlock(dark)}}}`;
  }
  return css;
}

/** The shared control + chrome styles. Stable bytes — identical for every form. */
export const BASE_CSS = `
.sf-scope{font-family:var(--tf-font,ui-sans-serif,system-ui,sans-serif);
  color:var(--tf-text);background:var(--tf-bg);-webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;line-height:1.5}
.sf-scope *,.sf-scope *::before,.sf-scope *::after{box-sizing:border-box}
.sf-vh{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.sf-root{width:100%;margin:0 auto}
.sf-header{display:flex;flex-direction:column;gap:calc(var(--tf-space)*.5);
  margin-bottom:var(--tf-section-gap)}
.sf-logo{height:40px;width:auto;max-width:180px;object-fit:contain;
  align-self:flex-start;margin-bottom:calc(var(--tf-space)*.75)}
.sf-brand{font-size:.78rem;font-weight:600;letter-spacing:.04em;
  text-transform:uppercase;color:var(--tf-accent-soft-text,var(--tf-accent))}
.sf-headline{font-size:1.5rem;font-weight:680;letter-spacing:-.01em;margin:0;
  color:var(--tf-text)}
.sf-subhead{margin:0;color:var(--tf-text-muted);font-size:.975rem;max-width:48ch}
.sf-form{display:flex;flex-direction:column;gap:var(--tf-section-gap)}
.sf-fields{display:flex;flex-direction:column;gap:var(--tf-field-gap)}
.sf-field{display:flex;flex-direction:column;gap:calc(var(--tf-space)*.6);
  border:0;padding:0;margin:0;min-width:0}
.sf-field[hidden]{display:none}
.sf-field-label,.sf-legend{padding:0}
.sf-label{display:block;font-size:.925rem;font-weight:560;color:var(--tf-text)}
.sf-req{color:var(--tf-accent)}
.sf-desc{margin:calc(var(--tf-space)*.25) 0 0;font-size:.85rem;
  color:var(--tf-text-muted)}
.sf-input{width:100%;font:inherit;color:var(--tf-text);
  background:var(--tf-surface-raised);border:max(1px,var(--tf-border-width)) solid var(--tf-border-strong);
  border-radius:var(--tf-radius-field);padding:var(--tf-field-pad);min-height:44px;
  transition:border-color .12s,box-shadow .12s,background-color .12s;
  appearance:none}
.sf-input::placeholder{color:var(--tf-text-muted);opacity:.85}
.sf-input:hover{border-color:var(--tf-accent)}
.sf-input:focus-visible{outline:none;border-color:var(--tf-accent);
  box-shadow:0 0 0 3px var(--tf-focus-ring)}
.sf-textarea{min-height:104px;resize:vertical;line-height:1.55}
.sf-select{cursor:pointer;
  background-image:linear-gradient(45deg,transparent 50%,var(--tf-text-muted) 50%),
    linear-gradient(135deg,var(--tf-text-muted) 50%,transparent 50%);
  background-position:calc(100% - 18px) center,calc(100% - 13px) center;
  background-size:5px 5px,5px 5px;background-repeat:no-repeat;padding-right:38px}
.sf-file{padding:calc(var(--tf-field-pad) - 2px);cursor:pointer}
.sf-file::file-selector-button{font:inherit;font-weight:560;cursor:pointer;
  margin-right:12px;padding:7px 12px;border:0;border-radius:calc(var(--tf-radius-field) - 2px);
  color:var(--tf-accent-soft-text);background:var(--tf-accent-soft)}
.sf-stars{display:inline-flex;flex-direction:row-reverse;justify-content:flex-end;gap:4px}
.sf-star{cursor:pointer;font-size:30px;line-height:1;color:var(--tf-border-strong);
  transition:color .1s,transform .1s;user-select:none}
.sf-star:hover,.sf-star:hover ~ .sf-star,.sf-vh:checked ~ .sf-star{color:var(--tf-accent)}
.sf-star:hover{transform:scale(1.08)}
.sf-vh:focus-visible + .sf-star{outline:2px solid var(--tf-accent);
  outline-offset:2px;border-radius:4px}
.sf-nps,.sf-emojis{display:flex;flex-wrap:wrap;gap:8px}
.sf-chip{cursor:pointer;min-width:44px;min-height:44px;display:inline-flex;
  align-items:center;justify-content:center;padding:0 10px;font-weight:560;
  color:var(--tf-text);background:var(--tf-surface-raised);
  border:max(1px,var(--tf-border-width)) solid var(--tf-border-strong);
  border-radius:var(--tf-radius-field);transition:all .1s}
.sf-chip:hover{border-color:var(--tf-accent);color:var(--tf-accent)}
.sf-vh:checked + .sf-chip{background:var(--tf-accent);color:var(--tf-accent-text);
  border-color:var(--tf-accent)}
.sf-vh:focus-visible + .sf-chip{box-shadow:0 0 0 3px var(--tf-focus-ring)}
.sf-emoji{cursor:pointer;font-size:26px;line-height:1;width:48px;height:48px;
  display:inline-flex;align-items:center;justify-content:center;border-radius:50%;
  filter:grayscale(1);opacity:.6;transition:all .12s}
.sf-emoji:hover{filter:grayscale(0);opacity:1;transform:scale(1.1)}
.sf-vh:checked + .sf-emoji{filter:grayscale(0);opacity:1;
  background:var(--tf-accent-soft);transform:scale(1.1)}
.sf-vh:focus-visible + .sf-emoji{outline:2px solid var(--tf-accent);outline-offset:2px}
.sf-choices{display:flex;flex-direction:column;gap:8px}
.sf-choice{display:flex;align-items:center;gap:11px;cursor:pointer;
  padding:11px 14px;border:max(1px,var(--tf-border-width)) solid var(--tf-border);
  border-radius:var(--tf-radius-field);transition:border-color .1s,background-color .1s}
.sf-choice:hover{border-color:var(--tf-accent);background:var(--tf-accent-soft)}
.sf-choice-input{position:absolute;opacity:0;width:0;height:0}
.sf-choice-mark{flex:0 0 auto;width:20px;height:20px;border-radius:6px;
  border:2px solid var(--tf-border-strong);position:relative;transition:all .1s}
.sf-field-radio .sf-choice-mark{border-radius:50%}
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
.sf-choice-text{font-size:.95rem;color:var(--tf-text)}
.sf-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.sf-submit{font:inherit;font-weight:620;cursor:pointer;min-height:46px;
  padding:0 22px;border-radius:var(--tf-radius-field);
  border:1.5px solid var(--tf-accent);background:var(--tf-accent);
  color:var(--tf-accent-text);transition:background-color .12s,box-shadow .12s,transform .06s}
.sf-submit:hover{background:var(--tf-accent-hover);border-color:var(--tf-accent-hover)}
.sf-submit:active{background:var(--tf-accent-active);transform:translateY(1px)}
.sf-submit:focus-visible{outline:none;box-shadow:0 0 0 3px var(--tf-focus-ring)}
.sf-submit[disabled]{opacity:.55;cursor:not-allowed}
.sf-submit-soft{background:var(--tf-accent-soft);color:var(--tf-accent-soft-text);
  border-color:transparent}
.sf-submit-soft:hover{background:var(--tf-accent-soft);
  box-shadow:0 0 0 1px var(--tf-accent) inset}
.sf-submit-outline{background:transparent;color:var(--tf-accent);
  border-color:var(--tf-accent)}
.sf-submit-outline:hover{background:var(--tf-accent-soft);color:var(--tf-accent-soft-text)}
.sf-footer{margin-top:var(--tf-section-gap);font-size:.78rem;
  color:var(--tf-text-muted)}
.sf-footer a{color:var(--tf-text-muted);text-decoration:none;font-weight:560}
.sf-footer a:hover{color:var(--tf-accent);text-decoration:underline}
.sf-success{text-align:center;padding:calc(var(--tf-section-gap)) 0}
.sf-success-mark{width:54px;height:54px;margin:0 auto calc(var(--tf-space));
  border-radius:50%;background:var(--tf-accent-soft);display:grid;place-items:center}
.sf-success-mark svg{width:26px;height:26px;stroke:var(--tf-accent);fill:none;
  stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.sf-success-title{font-size:1.25rem;font-weight:660;margin:0 0 6px;color:var(--tf-text)}
.sf-success-msg{margin:0 auto;max-width:42ch;color:var(--tf-text-muted)}
.sf-success-cta{display:inline-block;margin-top:var(--tf-section-gap);
  font-weight:600;text-decoration:none;padding:11px 20px;
  border-radius:var(--tf-radius-field);background:var(--tf-accent);
  color:var(--tf-accent-text)}
.sf-error{display:none;color:#b42318;font-size:.85rem;margin-top:4px}
.sf-scope[data-invalid] .sf-error[data-active]{display:block}
@media (prefers-reduced-motion:reduce){.sf-scope *{transition:none!important;
  animation:none!important}}
`.trim();

/** Conversational stepping styles — inert until the runtime adds `data-conv`. */
const CONVERSATIONAL_CSS = `
.sf-scope[data-conv] .sf-fields{position:relative}
.sf-scope[data-conv] .sf-field{display:none}
.sf-scope[data-conv] .sf-field[data-conv-active]{display:flex;
  animation:sf-step-in .22s ease both}
.sf-scope[data-conv] .sf-actions{justify-content:space-between}
.sf-conv-progress{height:4px;border-radius:999px;background:var(--tf-border);
  overflow:hidden;margin-bottom:var(--tf-section-gap)}
.sf-conv-progress span{display:block;height:100%;background:var(--tf-accent);
  border-radius:999px;transition:width .25s ease;width:0}
.sf-conv-back{display:none}
.sf-scope[data-conv] .sf-conv-back{display:inline-flex}
.sf-conv-count{margin-left:auto;font-size:.82rem;color:var(--tf-text-muted)}
@keyframes sf-step-in{from{opacity:0;transform:translateY(8px)}
  to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){
  .sf-scope[data-conv] .sf-field[data-conv-active]{animation:none}}
`.trim();

const CARD_CSS = `
.sf-card .sf-root{max-width:36rem;padding:clamp(20px,5vw,40px);
  background:var(--tf-surface);border:var(--tf-border-width) solid var(--tf-border);
  border-radius:var(--tf-radius);box-shadow:var(--tf-shadow)}
.sf-card .sf-submit{width:100%;justify-content:center}
.sf-card .sf-actions{flex-direction:column;align-items:stretch}
`.trim();

const INLINE_CSS = `
.sf-inline .sf-root{max-width:34rem;padding:0;background:transparent;
  border:0;box-shadow:none}
.sf-inline .sf-headline{font-size:1.25rem}
`.trim();

const SPLIT_CSS = `
.sf-split .sf-root{max-width:58rem;display:grid;grid-template-columns:1fr 1.15fr;
  background:var(--tf-surface);border:var(--tf-border-width) solid var(--tf-border);
  border-radius:var(--tf-radius);box-shadow:var(--tf-shadow);overflow:hidden}
.sf-split .sf-aside{padding:clamp(24px,4vw,44px);background:var(--tf-accent-soft);
  color:var(--tf-accent-soft-text);display:flex;flex-direction:column;
  justify-content:center;gap:calc(var(--tf-space)*.6)}
.sf-split .sf-aside .sf-brand{color:var(--tf-accent-soft-text)}
.sf-split .sf-aside .sf-headline,.sf-split .sf-aside .sf-subhead{color:var(--tf-accent-soft-text)}
.sf-split .sf-aside .sf-subhead{opacity:.86}
.sf-split .sf-main{padding:clamp(24px,4vw,44px)}
.sf-split .sf-header{margin-bottom:0}
.sf-split .sf-submit{width:100%;justify-content:center}
@media (max-width:640px){.sf-split .sf-root{grid-template-columns:1fr}
  .sf-split .sf-aside{display:none}}
`.trim();

const CONV_SHELL_CSS = `
.sf-conv .sf-root{max-width:34rem;padding:clamp(20px,5vw,40px);
  background:var(--tf-surface);border:var(--tf-border-width) solid var(--tf-border);
  border-radius:var(--tf-radius);box-shadow:var(--tf-shadow)}
.sf-conv .sf-submit{min-width:120px;justify-content:center}
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
