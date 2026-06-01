"use client";

/**
 * Interactive form preview runtime.
 *
 * Renders the three live screens an owner is designing — Loader, Form, and
 * Success — styled entirely by the `--f-*` design tokens so the studio preview
 * matches what a respondent will eventually see. Unlike the old static card,
 * the form here is real: inputs are controlled, conditional questions evaluate,
 * stepped flow advances one question at a time, and submitting flips to the
 * success screen. Nothing is persisted — it's a sandbox.
 */

/* Brand logos are arbitrary owner-supplied URLs (blob preview / CDN) rendered
   inside a scaled token sandbox — next/image's optimizer/domain model does not
   apply here, matching the media-uploader and forms-core renderer precedent. */
/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import { tokensToCssVars, textureBg } from "@/lib/collect/studio-token-css";
import {
  evalShowIf,
  type FormConfig,
  type StudioQuestion,
} from "@/lib/collect/studio-types";

/* ─── Scoped runtime CSS (injected once) ──────────────────────────────────── */

const RUNTIME_CSS = `
.tfp-root { height:100%; overflow-y:auto; }
.tfp-center { min-height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding: var(--f-container-pad-y) var(--f-container-pad-x); gap: 1rem; }
.tfp-card {
  width:100%; max-width: min(100%, var(--f-container-max-w)); margin:0 auto;
  border:1px solid var(--f-line-50); background:var(--f-surface);
  box-shadow:var(--f-shadow); border-radius:calc(var(--f-radius) * 1px);
  padding: var(--f-container-pad-y) var(--f-container-pad-x);
  display:flex; flex-direction:column; gap:var(--f-gap);
}
.tfp-brand { display:inline-flex; align-items:center; gap:.5rem; font-family:var(--f-font-mono); font-size:var(--f-size-xs); letter-spacing:.12em; text-transform:uppercase; color:var(--f-accent); }
.tfp-brand img { height:1.4rem; width:auto; display:block; object-fit:contain; }
.tfp-headline { margin:0; font-family:var(--f-font-head); font-size:calc(var(--f-size-head) * 0.8); font-weight:var(--f-weight-head); letter-spacing:var(--f-tracking-head); line-height:1.1; color:var(--f-ink); }
.tfp-subhead { margin:0; font-size:var(--f-size-base); line-height:var(--f-body-line-height); color:var(--f-ink-soft); }
.tfp-field { display:flex; flex-direction:column; gap:var(--f-label-gap); }
.tfp-label { font-size:var(--f-size-sm); font-weight:600; color:var(--f-ink); text-transform:var(--f-label-casing); letter-spacing:var(--f-label-tracking); }
.tfp-req { color:var(--f-accent); margin-left:.15rem; }
.tfp-input, .tfp-textarea, .tfp-select {
  width:100%; font:inherit; font-size:var(--f-size-base); color:var(--f-ink); background:var(--f-bg);
  border:var(--f-field-border-w) solid var(--f-line); border-radius:var(--f-field-radius);
  padding:var(--f-field-pad) calc(var(--f-field-pad) + .15rem); outline:none;
  transition:border-color .12s, box-shadow .12s;
}
.tfp-textarea { min-height:6rem; resize:none; }
.tfp-root[data-shape="underline"] .tfp-input,
.tfp-root[data-shape="underline"] .tfp-textarea,
.tfp-root[data-shape="underline"] .tfp-select { border-width:0 0 var(--f-field-border-w) 0; border-radius:0; background:transparent; padding-left:0; padding-right:0; }
.tfp-input:focus, .tfp-textarea:focus, .tfp-select:focus { border-color:var(--f-focus-border); box-shadow:var(--f-focus-shadow); }
.tfp-stars { display:inline-flex; gap:.2rem; }
.tfp-star { cursor:pointer; font-size:calc(var(--f-size-head) * 0.5); line-height:1; color:var(--f-line); background:none; border:none; padding:0; transition:color .1s, transform .1s; }
.tfp-star[data-on] { color:var(--f-accent); }
.tfp-star:hover { transform:scale(1.12); }
.tfp-scale { display:flex; flex-wrap:wrap; gap:.3rem; }
.tfp-chip { cursor:pointer; min-width:2rem; font:inherit; font-size:var(--f-size-sm); color:var(--f-ink); background:var(--f-bg); border:var(--f-field-border-w) solid var(--f-line); border-radius:var(--f-field-radius); padding:.35rem .55rem; transition:all .1s; }
.tfp-chip[data-on] { background:var(--f-accent); color:var(--f-accent-ink); border-color:var(--f-accent); }
.tfp-emoji { cursor:pointer; font-size:1.4rem; background:none; border:none; padding:.2rem; border-radius:var(--f-field-radius); filter:grayscale(1); opacity:.55; transition:all .12s; }
.tfp-emoji[data-on] { filter:none; opacity:1; transform:scale(1.18); }
.tfp-choices { display:flex; flex-direction:column; gap:var(--f-label-gap); }
.tfp-choice { display:flex; align-items:center; gap:.55rem; cursor:pointer; font-size:var(--f-size-base); color:var(--f-ink); border:var(--f-field-border-w) solid var(--f-line); border-radius:var(--f-field-radius); padding:.5rem .65rem; transition:border-color .1s, background .1s; }
.tfp-choice[data-on] { border-color:var(--f-accent); background:var(--f-accent-08); }
.tfp-choice-mark { width:1rem; height:1rem; border:var(--f-field-border-w) solid var(--f-line); display:inline-flex; align-items:center; justify-content:center; color:var(--f-accent-ink); background:transparent; }
.tfp-choice[data-multi] .tfp-choice-mark { border-radius:3px; }
.tfp-choice:not([data-multi]) .tfp-choice-mark { border-radius:999px; }
.tfp-choice[data-on] .tfp-choice-mark { background:var(--f-accent); border-color:var(--f-accent); }
.tfp-file { display:inline-flex; align-items:center; gap:.4rem; cursor:pointer; font:inherit; font-size:var(--f-size-sm); color:var(--f-ink-soft); border:1px dashed var(--f-line); border-radius:var(--f-field-radius); padding:.7rem 1rem; }
.tfp-btn { display:inline-flex; justify-content:center; align-items:center; width:var(--f-btn-width); border:var(--f-btn-border-w) solid var(--f-btn-border-c); border-radius:var(--f-btn-radius); background:var(--f-btn-bg); color:var(--f-btn-color); box-shadow:var(--f-btn-shadow); padding:var(--f-btn-pad-y) var(--f-btn-pad-x); font:inherit; font-weight:600; text-transform:var(--f-btn-uppercase); letter-spacing:var(--f-btn-tracking); cursor:pointer; transition:filter .1s; }
.tfp-btn:hover { filter:brightness(.96); }
.tfp-btn[data-ghost] { background:transparent; color:var(--f-ink); border:1px solid var(--f-line); box-shadow:none; }
.tfp-actions { margin-top:calc(var(--f-gap) * .6); display:flex; align-items:center; gap:.6rem; }
.tfp-progress-track { height:4px; width:100%; background:var(--f-line-50); border-radius:999px; overflow:hidden; }
.tfp-progress-fill { height:100%; background:var(--f-accent); border-radius:999px; transition:width .3s ease; }
.tfp-step-meta { font-family:var(--f-font-mono); font-size:var(--f-size-xs); letter-spacing:.08em; text-transform:uppercase; color:var(--f-ink-soft); }
/* loaders */
.tfp-loader-msg { font-size:var(--f-size-base); color:var(--f-ink-soft); }
@keyframes tfp-spin { to { transform:rotate(360deg); } }
@keyframes tfp-dot { 0%,80%,100%{ transform:scale(.55); opacity:.35 } 40%{ transform:scale(1); opacity:1 } }
@keyframes tfp-bar { 0%{ left:-45% } 100%{ left:100% } }
@keyframes tfp-pulse { 0%,100%{ transform:scale(.82); opacity:.5 } 50%{ transform:scale(1.08); opacity:1 } }
@keyframes tfp-logo-pulse { 0%,100%{ opacity:.42; transform:scale(.92) } 50%{ opacity:1; transform:scale(1) } }
@keyframes tfp-wipe { from { -webkit-mask-position:130% 0; mask-position:130% 0 } to { -webkit-mask-position:0% 0; mask-position:0% 0 } }
@keyframes tfp-confetti { to { transform:translateY(420px) rotate(540deg); opacity:0 } }
.tfp-spinner { width:48px; height:48px; border-radius:50%; border:4px solid var(--f-line-50); border-top-color:var(--tfp-tint); animation:tfp-spin .8s linear infinite; }
.tfp-ring { width:52px; height:52px; border-radius:50%; background:conic-gradient(var(--tfp-tint) 0 25%, transparent 25% 100%); -webkit-mask:radial-gradient(circle 18px at center, transparent 98%, #000 100%); mask:radial-gradient(farthest-side, transparent calc(100% - 6px), #000 0); animation:tfp-spin .9s linear infinite; }
.tfp-dots { display:inline-flex; gap:.5rem; }
.tfp-dots span { width:11px; height:11px; border-radius:50%; background:var(--tfp-tint); animation:tfp-dot 1.2s ease-in-out infinite; }
.tfp-dots span:nth-child(2){ animation-delay:.16s } .tfp-dots span:nth-child(3){ animation-delay:.32s }
.tfp-bar { position:relative; width:180px; height:5px; border-radius:999px; background:var(--f-line-50); overflow:hidden; }
.tfp-bar::after { content:""; position:absolute; top:0; bottom:0; width:42%; border-radius:999px; background:var(--tfp-tint); animation:tfp-bar 1.1s ease-in-out infinite; }
.tfp-pulse { width:46px; height:46px; border-radius:50%; background:var(--tfp-tint); animation:tfp-pulse 1.1s ease-in-out infinite; }
.tfp-logo-pulse { height:64px; width:auto; max-width:60%; object-fit:contain; animation:tfp-logo-pulse 1.3s ease-in-out infinite; }
.tfp-logo-draw { height:64px; width:auto; max-width:60%; object-fit:contain; -webkit-mask-image:linear-gradient(90deg, #000 35%, transparent 65%); mask-image:linear-gradient(90deg, #000 35%, transparent 65%); -webkit-mask-size:300% 100%; mask-size:300% 100%; animation:tfp-wipe 1.4s ease-in-out infinite; }
.tfp-confetti { position:absolute; inset:0; overflow:hidden; pointer-events:none; }
.tfp-confetti span { position:absolute; top:-12px; width:8px; height:14px; border-radius:1px; animation:tfp-confetti linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .tfp-spinner,.tfp-ring,.tfp-dots span,.tfp-bar::after,.tfp-pulse,.tfp-logo-pulse,.tfp-logo-draw,.tfp-confetti span { animation:none !important; }
}
`;

let _runtimeCssInjected = false;
export function ensureRuntimeCss() {
  if (_runtimeCssInjected || typeof document === "undefined") return;
  _runtimeCssInjected = true;
  const style = document.createElement("style");
  style.setAttribute("data-studio-runtime", "");
  style.textContent = RUNTIME_CSS;
  document.head.appendChild(style);
}

/* ─── Per-question control ────────────────────────────────────────────────── */

const EMOJIS = ["😞", "😕", "😐", "🙂", "😍"];

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: StudioQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const options = question.options ?? [];

  switch (question.type) {
    case "longtext":
      return (
        <textarea
          className="tfp-textarea"
          placeholder={question.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "stars":
      return (
        <div
          className="tfp-stars"
          role="radiogroup"
          aria-label={question.label}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className="tfp-star"
              data-on={typeof value === "number" && n <= value ? "" : undefined}
              onClick={() => onChange(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
            >
              ★
            </button>
          ))}
        </div>
      );
    case "nps":
      return (
        <div className="tfp-scale">
          {Array.from({ length: 11 }, (_, n) => (
            <button
              key={n}
              type="button"
              className="tfp-chip"
              data-on={value === n ? "" : undefined}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          ))}
        </div>
      );
    case "emoji":
      return (
        <div className="tfp-scale">
          {EMOJIS.map((e, i) => (
            <button
              key={e}
              type="button"
              className="tfp-emoji"
              data-on={value === i + 1 ? "" : undefined}
              onClick={() => onChange(i + 1)}
              aria-label={`Rating ${i + 1}`}
            >
              {e}
            </button>
          ))}
        </div>
      );
    case "radio":
      return (
        <div className="tfp-choices">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              className="tfp-choice"
              data-on={value === opt ? "" : undefined}
              onClick={() => onChange(opt)}
            >
              <span className="tfp-choice-mark" aria-hidden />
              <span>{opt}</span>
            </button>
          ))}
        </div>
      );
    case "checkbox": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="tfp-choices">
          {options.map((opt) => {
            const on = arr.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                className="tfp-choice"
                data-multi=""
                data-on={on ? "" : undefined}
                onClick={() =>
                  onChange(on ? arr.filter((o) => o !== opt) : [...arr, opt])
                }
              >
                <span className="tfp-choice-mark" aria-hidden>
                  {on ? "✓" : ""}
                </span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      );
    }
    case "dropdown":
      return (
        <select
          className="tfp-select"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled>
            Choose one…
          </option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case "file":
      return (
        <span className="tfp-file">
          📎 {question.placeholder || "Choose a file"}
        </span>
      );
    default:
      return (
        <input
          className="tfp-input"
          type="text"
          placeholder={question.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

function FieldBlock({
  question,
  value,
  onChange,
}: {
  question: StudioQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  return (
    <div className="tfp-field">
      <span className="tfp-label">
        {question.label}
        {question.required && (
          <span className="tfp-req" aria-hidden>
            *
          </span>
        )}
      </span>
      <QuestionField question={question} value={value} onChange={onChange} />
    </div>
  );
}

/* ─── Form header (brand + headline + subhead) ────────────────────────────── */

function FormHeader({ draft }: { draft: FormConfig }) {
  const brandName =
    draft.brandName.trim() || draft.tokens.brandName.trim() || "Your brand";
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "var(--f-gap)" }}
    >
      {draft.layout.showBrandPill && (
        <span className="tfp-brand">
          {draft.logoUrl && <img src={draft.logoUrl} alt="" />}
          <span>{brandName}</span>
        </span>
      )}
      <h1 className="tfp-headline">{draft.headline}</h1>
      {draft.subhead && <p className="tfp-subhead">{draft.subhead}</p>}
    </div>
  );
}

/* ─── Form screen (single-page or stepped) ────────────────────────────────── */

export function FormScreen({
  draft,
  flow,
  onSubmit,
}: {
  draft: FormConfig;
  flow: "all" | "stepped";
  onSubmit: () => void;
}) {
  const [answers, setAnswers] = React.useState<Record<string, unknown>>({});
  const [step, setStep] = React.useState(0);

  const setAnswer = (id: string, v: unknown) =>
    setAnswers((prev) => ({ ...prev, [id]: v }));

  const visible = draft.questions.filter((q) => evalShowIf(q, answers));
  const clampedStep = Math.min(step, Math.max(0, visible.length - 1));

  // Reset to the first step whenever flow flips so the demo is predictable.
  React.useEffect(() => {
    setStep(0);
  }, [flow]);

  if (flow === "all" || visible.length <= 1) {
    return (
      <div className="tfp-card studio-shell-card">
        <FormHeader draft={draft} />
        {visible.map((q) => (
          <FieldBlock
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(v) => setAnswer(q.id, v)}
          />
        ))}
        <div className="tfp-actions">
          <button type="button" className="tfp-btn" onClick={onSubmit}>
            {draft.submitLabel || "Submit"}
          </button>
        </div>
      </div>
    );
  }

  const current = visible[clampedStep];
  const isLast = clampedStep === visible.length - 1;
  const progress = ((clampedStep + 1) / visible.length) * 100;

  return (
    <div className="tfp-card studio-shell-card">
      {clampedStep === 0 && <FormHeader draft={draft} />}
      <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
        <div className="tfp-progress-track">
          <div
            className="tfp-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="tfp-step-meta">
          Step {clampedStep + 1} of {visible.length}
        </span>
      </div>
      <FieldBlock
        key={current.id}
        question={current}
        value={answers[current.id]}
        onChange={(v) => setAnswer(current.id, v)}
      />
      <div className="tfp-actions">
        {clampedStep > 0 && (
          <button
            type="button"
            className="tfp-btn"
            data-ghost=""
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </button>
        )}
        <button
          type="button"
          className="tfp-btn"
          onClick={() => (isLast ? onSubmit() : setStep((s) => s + 1))}
        >
          {isLast ? draft.submitLabel || "Submit" : "Next"}
        </button>
      </div>
    </div>
  );
}

/* ─── Loader screen ───────────────────────────────────────────────────────── */

export function LoaderScreen({ draft }: { draft: FormConfig }) {
  const { loader, logoUrl } = draft;
  const tint = loader.tint === "ink" ? "var(--f-ink)" : "var(--f-accent)";
  const hasLogo = loader.useLogo && Boolean(logoUrl);

  let visual: React.ReactNode;
  if (loader.style === "logo-pulse" && hasLogo) {
    visual = <img className="tfp-logo-pulse" src={logoUrl!} alt="" />;
  } else if (loader.style === "logo-draw" && hasLogo) {
    visual = <img className="tfp-logo-draw" src={logoUrl!} alt="" />;
  } else if (loader.style === "spinner") {
    visual = <span className="tfp-spinner" />;
  } else if (loader.style === "dots") {
    visual = (
      <span className="tfp-dots">
        <span />
        <span />
        <span />
      </span>
    );
  } else if (loader.style === "bar") {
    visual = <span className="tfp-bar" />;
  } else if (loader.style === "pulse") {
    visual = <span className="tfp-pulse" />;
  } else {
    // ring (default) + fallback for logo styles without a logo
    visual = <span className="tfp-ring" />;
  }

  return (
    <div className="tfp-center" style={{ ["--tfp-tint" as string]: tint }}>
      {visual}
      {loader.message && <p className="tfp-loader-msg">{loader.message}</p>}
    </div>
  );
}

/* ─── Success screen ──────────────────────────────────────────────────────── */

const CONFETTI_COLORS = [
  "var(--f-accent)",
  "var(--f-ink)",
  "var(--f-accent)",
  "var(--f-ink-soft)",
];

function Confetti() {
  const pieces = React.useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        left: `${(i * 4.1 + (i % 3) * 7) % 100}%`,
        delay: `${(i % 6) * 0.18}s`,
        duration: `${1.6 + (i % 4) * 0.3}s`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: `${(i * 37) % 180}deg`,
      })),
    [],
  );
  return (
    <div className="tfp-confetti" aria-hidden>
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

export function SuccessScreen({ draft }: { draft: FormConfig }) {
  const { success, logoUrl } = draft;
  return (
    <div className="tfp-center" style={{ position: "relative" }}>
      {success.showConfetti && <Confetti />}
      {success.useLogo && logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          style={{ height: 56, width: "auto", objectFit: "contain" }}
        />
      ) : success.emoji ? (
        <div style={{ fontSize: "2.6rem", lineHeight: 1 }}>{success.emoji}</div>
      ) : null}
      <h1 className="tfp-headline">{success.title}</h1>
      <p className="tfp-subhead" style={{ maxWidth: 420 }}>
        {success.message}
      </p>
      {success.action === "cta" && (
        <span
          className="tfp-btn"
          role="presentation"
          style={{ marginTop: ".4rem" }}
        >
          {success.ctaLabel || "Continue"}
        </span>
      )}
      {success.action === "redirect" && (
        <p className="tfp-step-meta">
          Redirecting to {success.redirectUrl || "your site"}…
        </p>
      )}
    </div>
  );
}

/* ─── Root: applies tokens + texture, switches the active screen ──────────── */

export function FormPreviewRuntime({
  draft,
  screen,
  flow,
  onSubmit,
}: {
  draft: FormConfig;
  screen: "loader" | "form" | "success";
  flow: "all" | "stepped";
  onSubmit: () => void;
}) {
  React.useEffect(ensureRuntimeCss, []);

  const { tokens } = draft;
  const cssVars = React.useMemo(
    () => tokensToCssVars(tokens) as React.CSSProperties,
    [tokens],
  );
  const textureImage = React.useMemo(
    () => textureBg(tokens.texture, tokens.ink),
    [tokens.texture, tokens.ink],
  );

  const rootStyle = React.useMemo<React.CSSProperties>(
    () => ({
      ...cssVars,
      background: tokens.bg,
      backgroundImage: textureImage,
      color: tokens.ink,
      fontFamily: tokens.fontBody,
      lineHeight: tokens.bodyLineHeight,
    }),
    [
      cssVars,
      textureImage,
      tokens.bg,
      tokens.ink,
      tokens.fontBody,
      tokens.bodyLineHeight,
    ],
  );

  return (
    <div className="tfp-root" data-shape={tokens.fieldShape} style={rootStyle}>
      {screen === "loader" ? (
        <LoaderScreen draft={draft} />
      ) : screen === "success" ? (
        <SuccessScreen draft={draft} />
      ) : (
        <div className="tfp-center" style={{ justifyContent: "flex-start" }}>
          <FormScreen
            key={flow}
            draft={draft}
            flow={flow}
            onSubmit={onSubmit}
          />
        </div>
      )}
    </div>
  );
}
