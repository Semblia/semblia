"use client";

import * as React from "react";
import { useStudioStore } from "@/lib/collect/studio-store";
import {
  STYLE_PRESETS,
  COMMUNITY_PRESETS,
  ALL_PRESETS,
  LAYOUT_PRESETS,
  FONT_CHOICES,
} from "@/lib/collect/studio-presets";
import type {
  DesignTokens,
  FieldShape,
  FlowMode,
  ContainerMode,
  HeroMode,
  StudioQuestion,
  StudioDevice,
  TokenDensity,
  TokenButtonStyle,
  TokenShadow,
  TokenTexture,
  ShowIfOp,
} from "@/lib/collect/studio-types";

/* ─── Studio palette via CSS custom properties (supports dark mode) ─────── */

const C = {
  ink900: "var(--s-ink900)", ink700: "var(--s-ink700)", ink500: "var(--s-ink500)",
  ink300: "var(--s-ink300)", ink100: "var(--s-ink100)", ink50: "var(--s-ink50)",
  paper: "var(--s-paper)", panelBg: "var(--s-panel-bg)",
  line: "var(--s-line)", lineSoft: "var(--s-line-soft)",
  hot: "var(--s-hot)", pillBg: "var(--s-pill-bg)",
  white: "var(--s-white)",
};
const F = {
  sans: '"Geist", sans-serif',
  mono: '"Geist Mono", ui-monospace, monospace',
};

/* ─── Injected styles (CSS vars, dark mode, animations, responsive) ─────── */

const STUDIO_CSS = `
.studio-panel {
  --s-ink900: #111110; --s-ink700: #3a3a38; --s-ink500: #6b6b67;
  --s-ink300: #b8b7b1; --s-ink100: #e8e6df; --s-ink50: #f4f2ec;
  --s-paper: #faf8f2; --s-panel-bg: #f7f5ef;
  --s-line: #d9d5c9; --s-line-soft: #e3dfd2;
  --s-hot: #d7411f; --s-pill-bg: #ede9dd;
  --s-white: #ffffff;
  color-scheme: light;
  transition: background-color 0.25s ease, color 0.25s ease;
}
:is(.dark, [data-theme="dark"]) .studio-panel {
  --s-ink900: #f0ede6; --s-ink700: #ccc9c0; --s-ink500: #9c9a93;
  --s-ink300: #55534e; --s-ink100: #2c2a26; --s-ink50: #1e1c18;
  --s-paper: #161410; --s-panel-bg: #1a1814;
  --s-line: #3b3830; --s-line-soft: #2d2b24;
  --s-hot: #f06b4d; --s-pill-bg: #252320;
  --s-white: #222018;
  color-scheme: dark;
}
/* Section collapse animation */
.s-section-body { display: grid; grid-template-rows: 1fr; transition: grid-template-rows 0.22s ease; }
.s-section-body[data-closed] { grid-template-rows: 0fr; }
.s-section-body > .s-section-inner { overflow: hidden; min-height: 0; }
/* Pill transition */
.s-pill { transition: background 0.14s ease, color 0.14s ease, box-shadow 0.14s ease; }
.s-pill:hover { background: var(--s-ink50); }
.s-pill:active { opacity: 0.85; }
/* Card hover */
.s-card { transition: border-color 0.16s ease, background 0.16s ease; }
.s-card:hover { border-color: var(--s-ink300); background: var(--s-white); }
/* Question row expand */
.s-qrow-body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.2s ease; }
.s-qrow-body[data-open] { grid-template-rows: 1fr; }
.s-qrow-body > .s-qrow-inner { overflow: hidden; min-height: 0; }
/* Icon button hover */
.s-icon-btn { transition: background 0.12s, border-color 0.12s; }
.s-icon-btn:not(:disabled):hover { background: var(--s-ink50); border-color: var(--s-ink300); }
.s-icon-btn:not(:disabled):active { opacity: 0.8; }
/* Add question grid appear */
@keyframes s-slideDown { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
.s-add-grid { animation: s-slideDown 0.18s ease; }
/* Responsive: narrow panel */
@container studio-panel (max-width: 340px) {
  .s-layout-grid { grid-template-columns: 1fr 1fr !important; }
  .s-presets-grid { grid-template-columns: 1fr !important; }
}
@media (max-width: 480px) {
  .s-layout-grid { grid-template-columns: 1fr 1fr !important; }
  .s-presets-grid { grid-template-columns: 1fr !important; }
}
/* Focus ring */
.studio-panel input:focus-visible, .studio-panel select:focus-visible, .studio-panel textarea:focus-visible {
  outline: 2px solid var(--s-ink900); outline-offset: 1px;
  border-color: var(--s-ink900) !important;
}
/* Badge */
.s-badge {
  display: inline-flex; align-items: center; justify-content: center;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 9px; font-weight: 600; letter-spacing: 0.06em;
  padding: 1px 6px; border-radius: 3px; line-height: 1.6;
  text-transform: uppercase;
}
.s-badge-dark { background: var(--s-ink900); color: var(--s-paper); }
.s-badge-info { background: var(--s-ink100); color: var(--s-ink700); }
.s-badge-warn { background: color-mix(in srgb, var(--s-hot) 12%, transparent); color: var(--s-hot); border: 1px solid color-mix(in srgb, var(--s-hot) 20%, transparent); }
/* Destructive button */
.s-btn-destructive {
  font-family: 'Geist', sans-serif; font-size: 11px; font-weight: 500;
  color: var(--s-hot); background: transparent;
  border: 1px solid color-mix(in srgb, var(--s-hot) 22%, transparent);
  border-radius: 5px; padding: 3px 10px; cursor: pointer;
  transition: background 0.14s, color 0.14s, border-color 0.14s;
}
.s-btn-destructive:hover {
  background: color-mix(in srgb, var(--s-hot) 8%, transparent);
  border-color: color-mix(in srgb, var(--s-hot) 36%, transparent);
}
.s-btn-destructive:active { opacity: 0.8; }
/* Custom checkbox */
.s-checkbox {
  appearance: none; -webkit-appearance: none; width: 14px; height: 14px;
  border: 1.5px solid var(--s-ink300); border-radius: 3px;
  background: var(--s-white); cursor: pointer;
  display: inline-grid; place-content: center;
  transition: background 0.12s, border-color 0.12s;
  flex-shrink: 0; margin: 0;
}
.s-checkbox:checked {
  background: var(--s-ink900); border-color: var(--s-ink900);
}
.s-checkbox:checked::after {
  content: ''; width: 8px; height: 5px;
  border-left: 1.5px solid var(--s-paper); border-bottom: 1.5px solid var(--s-paper);
  transform: rotate(-45deg) translateY(-0.5px);
}
.s-checkbox:focus-visible {
  outline: 2px solid var(--s-ink900); outline-offset: 1px;
}
`;

function StudioStyles() {
  return <style dangerouslySetInnerHTML={{ __html: STUDIO_CSS }} />;
}

/* ─── Shared small primitives ─────────────────────────────────────────────── */

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontFamily: F.mono, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase" as const,
        color: C.ink500, marginBottom: 8, display: "flex", justifyContent: "space-between",
      }}>
        <span>{label}</span>
        {hint != null && <span style={{ color: C.ink900, textTransform: "none" as const, letterSpacing: 0, fontSize: 11 }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SectionCollapsible({ title, children, defaultOpen = true, tag }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean; tag?: string;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div style={{ borderTop: `1px solid ${C.line}`, padding: "18px 20px" }}>
      <button type="button" onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "transparent", border: "none", padding: 0, cursor: "pointer",
        fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: C.ink900,
        letterSpacing: "-0.005em", marginBottom: open ? 14 : 0,
        transition: "margin-bottom 0.22s ease",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {title}
          {tag && <span className="s-badge s-badge-dark">{tag}</span>}
        </span>
        <span style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 180ms", fontFamily: F.mono, fontSize: 10, color: C.ink500 }}>▸</span>
      </button>
      <div className="s-section-body" {...(!open ? { "data-closed": "" } : {})}>
        <div className="s-section-inner">{children}</div>
      </div>
    </div>
  );
}

function StudioTextInput({ value, onChange, style: extraStyle, ...rest }: {
  value: string; onChange: (v: string) => void; style?: React.CSSProperties;
  [k: string]: unknown;
}) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)} {...rest}
      style={{
        width: "100%", padding: "8px 10px",
        fontFamily: F.mono, fontSize: 12, color: C.ink900,
        background: C.white, border: `1px solid ${C.line}`, borderRadius: 6, outline: "none",
        ...extraStyle,
      }}
      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = C.ink900; }}
      onBlur={e => { (e.target as HTMLInputElement).style.borderColor = C.line; }} />
  );
}

function StudioNumberInput({ value, onChange, min, max, step = 1, suffix }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: C.ink900 }} />
      <div style={{ minWidth: 52, textAlign: "right" as const,
        fontFamily: F.mono, fontSize: 11, color: C.ink900 }}>{value}{suffix || ""}</div>
    </div>
  );
}

function StudioColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const isHex = typeof value === "string" && value.startsWith("#");
  return (
    <Row label={label}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ width: 32, height: 32, borderRadius: 6, background: value,
          border: `1px solid ${C.line}`, cursor: "pointer", flexShrink: 0,
          position: "relative" as const, overflow: "hidden" as const }}>
          {isHex && <input type="color" value={value} onChange={e => onChange(e.target.value)}
            style={{ position: "absolute" as const, inset: 0, opacity: 0, cursor: "pointer" }} />}
        </label>
        <StudioTextInput value={value} onChange={onChange} />
      </div>
    </Row>
  );
}

function StudioSelect<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as T)}
      style={{ width: "100%", padding: "8px 10px",
        fontFamily: F.mono, fontSize: 12, color: C.ink900,
        background: C.white, border: `1px solid ${C.line}`, borderRadius: 6,
        outline: "none", cursor: "pointer" }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 10px", background: C.white, border: `1px solid ${C.line}`, borderRadius: 6,
      fontFamily: F.sans, fontSize: 11.5, color: C.ink900, cursor: "pointer",
    }}>
      {label}
      <span style={{
        width: 28, height: 16, borderRadius: 999,
        background: value ? C.ink900 : "#c6c4bc",
        position: "relative" as const, transition: "background 120ms",
        flexShrink: 0,
      }}>
        <span style={{
          position: "absolute" as const, top: 2, left: value ? 14 : 2,
          width: 12, height: 12, borderRadius: 999, background: C.white,
          transition: "left 140ms",
        }}/>
      </span>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)}
        style={{ display: "none" }} />
    </label>
  );
}

function Pills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4, background: C.pillBg, padding: 3, borderRadius: 7 }}>
      {options.map(o => {
        const on = value === o.value;
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className="s-pill"
            style={{ flex: 1, minWidth: 0, padding: "7px 10px",
              fontFamily: F.sans, fontSize: 11.5, fontWeight: 500,
              color: on ? C.paper : C.ink700,
              background: on ? C.ink900 : "transparent",
              border: "none", borderRadius: 5, cursor: "pointer",
              boxShadow: on ? "0 2px 6px rgba(0,0,0,0.12)" : "none",
              whiteSpace: "nowrap" as const }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Layout thumbnails ───────────────────────────────────────────────────── */

function LayoutThumbnail({ kind, selected }: { kind: string; selected: boolean }) {
  const stroke = selected ? C.ink900 : C.ink500;
  const fill = selected ? C.pillBg : C.panelBg;
  return (
    <svg viewBox="0 0 80 48" width="100%" height="auto" style={{ display: "block", background: fill, borderRadius: 4 }}>
      {kind === "classic" && (
        <g stroke={stroke} strokeWidth="1" fill="none">
          <rect x="20" y="6" width="40" height="36" rx="2"/>
          <line x1="26" y1="14" x2="44" y2="14" strokeWidth="1.5"/>
          <line x1="26" y1="22" x2="54" y2="22"/><line x1="26" y1="28" x2="54" y2="28"/><line x1="26" y1="34" x2="50" y2="34"/>
        </g>
      )}
      {kind === "split" && (
        <g stroke={stroke} strokeWidth="1" fill="none">
          <rect x="4" y="6" width="30" height="36" rx="2" fill={stroke} fillOpacity="0.12"/>
          <rect x="38" y="6" width="38" height="36" rx="2"/>
          <line x1="10" y1="14" x2="28" y2="14" strokeWidth="1.5"/>
          <line x1="44" y1="16" x2="68" y2="16"/><line x1="44" y1="24" x2="68" y2="24"/><line x1="44" y1="32" x2="64" y2="32"/>
        </g>
      )}
      {kind === "stepped" && (
        <g stroke={stroke} strokeWidth="1" fill="none">
          <line x1="10" y1="10" x2="70" y2="10" strokeWidth="1.5"/>
          <line x1="10" y1="10" x2="40" y2="10" stroke={stroke} strokeWidth="2.5"/>
          <rect x="18" y="20" width="44" height="18" rx="2"/>
          <line x1="24" y1="28" x2="42" y2="28"/>
        </g>
      )}
      {kind === "cards" && (
        <g stroke={stroke} strokeWidth="1" fill="none">
          <rect x="14" y="14" width="44" height="26" rx="3" fill={fill}/>
          <rect x="18" y="10" width="44" height="26" rx="3" fill={fill}/>
          <rect x="22" y="6" width="44" height="26" rx="3" fill={fill}/>
          <line x1="28" y1="14" x2="48" y2="14" strokeWidth="1.5"/>
        </g>
      )}
      {kind === "convo" && (
        <g stroke={stroke} strokeWidth="1" fill="none">
          <rect x="10" y="8" width="44" height="10" rx="3"/>
          <rect x="10" y="22" width="52" height="10" rx="3"/>
          <rect x="10" y="36" width="36" height="6" rx="2" stroke={stroke} fill={stroke} fillOpacity="0.2"/>
        </g>
      )}
      {kind === "magazine" && (
        <g stroke={stroke} strokeWidth="1" fill="none">
          <line x1="8" y1="8" x2="72" y2="8" strokeWidth="2.5"/>
          <line x1="20" y1="14" x2="60" y2="14"/>
          <rect x="14" y="22" width="52" height="20" rx="1"/>
          <line x1="20" y1="30" x2="58" y2="30"/>
          <line x1="20" y1="36" x2="50" y2="36"/>
        </g>
      )}
    </svg>
  );
}

/* ─── Style preset card ───────────────────────────────────────────────────── */

function PresetCard({ k, p, selected, onClick, showAuthor }: {
  k: string; p: { label: string; sub: string; tokens: DesignTokens; author?: string; likes?: number };
  selected: boolean; onClick: () => void; showAuthor?: boolean;
}) {
  return (
    <button type="button" onClick={onClick}
      className="s-card"
      style={{ textAlign: "left" as const, padding: "10px 12px", borderRadius: 7,
        border: selected ? `1.5px solid ${C.ink900}` : `1px solid ${C.line}`,
        background: selected ? C.white : "transparent",
        cursor: "pointer", position: "relative" as const }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        <span style={{ width: 16, height: 16, borderRadius: 3, background: p.tokens.bg, border: "1px solid rgba(0,0,0,0.08)" }}/>
        <span style={{ width: 16, height: 16, borderRadius: 3, background: p.tokens.surface, border: "1px solid rgba(0,0,0,0.08)" }}/>
        <span style={{ width: 16, height: 16, borderRadius: 3, background: p.tokens.ink }}/>
        <span style={{ width: 16, height: 16, borderRadius: 3, background: p.tokens.accent }}/>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink900, letterSpacing: "-0.005em" }}>{p.label}</div>
      <div style={{ fontSize: 10.5, color: C.ink500, marginTop: 2, lineHeight: 1.3 }}>{p.sub}</div>
      {showAuthor && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8,
          fontFamily: F.mono, fontSize: 9.5, color: "#8d8b83", letterSpacing: "0.04em" }}>
          <span>{p.author}</span>
          <span>♥ {p.likes?.toLocaleString()}</span>
        </div>
      )}
    </button>
  );
}

/* ─── Question row ────────────────────────────────────────────────────────── */

const ICON_BTN = (disabled: boolean): React.CSSProperties => ({
  width: 24, height: 24, fontFamily: F.mono, fontSize: 11,
  color: disabled ? "#c6c4bc" : C.ink700,
  background: "transparent", border: `1px solid ${C.lineSoft}`, borderRadius: 4,
  cursor: disabled ? "not-allowed" : "pointer", padding: 0,
  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
});

const TYPE_LABELS: Record<string, string> = {
  shorttext: "Short text", longtext: "Paragraph", stars: "★ Stars",
  nps: "NPS 0–10", emoji: "Emoji scale", radio: "Radio",
  checkbox: "Checkboxes", dropdown: "Dropdown", file: "File upload",
};

function QuestionRow({ q, index, total, questions, onUpdate, onRemove, onMove }: {
  q: StudioQuestion; index: number; total: number; questions: StudioQuestion[];
  onUpdate: (patch: Partial<StudioQuestion>) => void; onRemove: () => void; onMove: (dir: number) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const hasLogic = !!q.showIf;
  const otherQs = questions.filter(x => x.id !== q.id);

  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 6, background: C.white, overflow: "hidden",
      transition: "border-color 0.16s ease, box-shadow 0.16s ease",
      boxShadow: open ? "0 2px 8px rgba(0,0,0,0.05)" : "none" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "8px 10px", gap: 8 }}>
        <div style={{ fontFamily: F.mono, fontSize: 10.5, color: C.ink500, minWidth: 18 }}>
          {String(index + 1).padStart(2, "0")}
        </div>
        <div style={{ flex: 1, fontSize: 12, color: C.ink900,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
          {q.label}
          <div style={{ fontFamily: F.mono, fontSize: 10, color: C.ink500, marginTop: 1,
            display: "flex", gap: 6, alignItems: "center" }}>
            {TYPE_LABELS[q.type] || q.type}
            {hasLogic && <span className="s-badge s-badge-warn">IF</span>}
          </div>
        </div>
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="s-icon-btn" style={ICON_BTN(index === 0)}>↑</button>
        <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="s-icon-btn" style={ICON_BTN(index === total - 1)}>↓</button>
        <button type="button" onClick={() => setOpen(!open)} className="s-icon-btn" style={ICON_BTN(false)}>{open ? "✕" : "✎"}</button>
      </div>
      <div className="s-qrow-body" {...(open ? { "data-open": "" } : {})}>
        <div className="s-qrow-inner">
        <div style={{ padding: "10px 10px 12px", borderTop: `1px solid ${C.pillBg}`, background: C.paper }}>
          <Row label="Label">
            <StudioTextInput value={q.label} onChange={v => onUpdate({ label: v })} />
          </Row>
          {(q.type === "shorttext" || q.type === "longtext" || q.type === "file") && (
            <Row label="Placeholder">
              <StudioTextInput value={q.placeholder || ""} onChange={v => onUpdate({ placeholder: v })} />
            </Row>
          )}
          {(q.type === "radio" || q.type === "checkbox" || q.type === "dropdown") && (
            <Row label="Options (one per line)">
              <textarea value={(q.options || []).join("\n")}
                onChange={e => onUpdate({ options: e.target.value.split("\n").filter(x => x.trim()) })}
                rows={4}
                style={{ width: "100%", padding: "8px 10px",
                  fontFamily: F.mono, fontSize: 12,
                  background: C.white, border: `1px solid ${C.line}`, borderRadius: 6,
                  outline: "none", resize: "vertical" as const }} />
            </Row>
          )}
          <ConditionalLogicEditor q={q} otherQs={otherQs} onUpdate={onUpdate} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: C.ink700, cursor: "pointer" }}>
              <input type="checkbox" className="s-checkbox" checked={!!q.required} onChange={e => onUpdate({ required: e.target.checked })} />
              Required
            </label>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={onRemove} className="s-btn-destructive">Delete</button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

function ConditionalLogicEditor({ q, otherQs, onUpdate }: {
  q: StudioQuestion; otherQs: StudioQuestion[]; onUpdate: (patch: Partial<StudioQuestion>) => void;
}) {
  const has = !!q.showIf;
  const [enabled, setEnabled] = React.useState(has);
  const s = q.showIf || { questionId: otherQs[0]?.id ?? "", op: "eq" as ShowIfOp, value: "" };

  const opsByType: Record<string, [string, string][]> = {
    stars: [["eq","= exactly"],["gte","≥ at least"],["lte","≤ at most"],["gt","> more than"],["lt","< less than"]],
    nps: [["eq","= exactly"],["gte","≥ at least"],["lte","≤ at most"]],
    emoji: [["eq","= exactly"],["gte","≥ at least"],["lte","≤ at most"]],
    radio: [["eq","is"],["neq","is not"]], dropdown: [["eq","is"],["neq","is not"]],
    checkbox: [["includes","includes"]], shorttext: [["eq","is"],["neq","is not"],["includes","contains"]],
    longtext: [["includes","contains"]], file: [["eq","is set"]],
  };
  const refQ = otherQs.find(x => x.id === s.questionId);
  const ops = refQ ? opsByType[refQ.type] || [["eq","is"]] : [["eq","is"]];

  const toggle = () => {
    if (enabled) { setEnabled(false); onUpdate({ showIf: undefined }); }
    else if (otherQs.length) {
      setEnabled(true);
      onUpdate({ showIf: { questionId: otherQs[0].id, op: (opsByType[otherQs[0].type]?.[0]?.[0] || "eq") as ShowIfOp, value: "" } });
    }
  };

  return (
    <div style={{ marginTop: 12, padding: 10, background: C.white, border: `1px solid ${C.lineSoft}`, borderRadius: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: enabled ? 10 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: F.mono, fontSize: 9.5, letterSpacing: "0.08em",
            textTransform: "uppercase" as const, color: C.ink500 }}>Conditional logic</span>
          {enabled && <span className="s-badge s-badge-warn">ON</span>}
        </div>
        {enabled ? (
          <button type="button" onClick={toggle} className="s-btn-destructive">Remove</button>
        ) : (
          <button type="button" onClick={toggle} disabled={!otherQs.length}
            style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 500,
              color: C.ink900, background: "transparent",
              border: `1px solid ${C.line}`,
              borderRadius: 5, padding: "3px 8px", cursor: otherQs.length ? "pointer" : "not-allowed",
              opacity: otherQs.length ? 1 : 0.5,
              transition: "background 0.14s, border-color 0.14s",
            }}>+ Add rule</button>
        )}
      </div>
      {enabled && (
        <>
          <div style={{ fontSize: 11, color: C.ink700, marginBottom: 8 }}>Show this only when…</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
            <StudioSelect value={s.questionId} onChange={v => {
              const nq = otherQs.find(x => x.id === v);
              const nop = (opsByType[nq?.type ?? ""]?.[0]?.[0] || "eq") as ShowIfOp;
              onUpdate({ showIf: { ...s, questionId: v, op: nop, value: "" } });
            }} options={otherQs.map(x => ({ value: x.id, label: x.label.slice(0, 30) }))} />
            <StudioSelect value={s.op} onChange={v => onUpdate({ showIf: { ...s, op: v as ShowIfOp } })}
              options={ops.map(([v, l]) => ({ value: v, label: l }))} />
            {refQ && (refQ.type === "radio" || refQ.type === "dropdown" || refQ.type === "checkbox") ? (
              <StudioSelect value={String(s.value)} onChange={v => onUpdate({ showIf: { ...s, value: v } })}
                options={[{ value: "", label: "— pick a value —" }, ...(refQ.options || []).map(o => ({ value: o, label: o }))]} />
            ) : (
              <StudioTextInput value={String(s.value)} onChange={v => {
                const isNum = refQ && (refQ.type === "stars" || refQ.type === "nps" || refQ.type === "emoji");
                onUpdate({ showIf: { ...s, value: isNum ? Number(v) : v } });
              }} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AddQuestion({ onAdd }: { onAdd: (type: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const types: [string, string][] = [
    ["shorttext", "Short text"], ["longtext", "Paragraph"],
    ["stars", "★ Stars"], ["nps", "NPS 0–10"], ["emoji", "Emoji scale"],
    ["radio", "Radio"], ["checkbox", "Checkboxes"],
    ["dropdown", "Dropdown"], ["file", "File upload"],
  ];
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} style={{
        width: "100%", padding: "10px 12px",
        fontFamily: F.sans, fontSize: 12, fontWeight: 500,
        color: C.ink900, background: "transparent",
        border: `1.5px dashed ${C.ink300}`, borderRadius: 6, cursor: "pointer" }}>+ Add question</button>
      {open && (
        <div className="s-add-grid" style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4,
          padding: 6, background: C.pillBg, borderRadius: 6 }}>
          {types.map(([v, l]) => (
            <button key={v} type="button" onClick={() => { onAdd(v); setOpen(false); }} className="s-pill" style={{
              padding: "8px 10px", fontSize: 11.5, color: C.ink900, background: C.white,
              border: `1px solid ${C.line}`, borderRadius: 5, cursor: "pointer",
              textAlign: "left" as const, fontFamily: F.sans }}>{l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Memoized sub-components ─────────────────────────────────────────────── */

const MemoPresetCard = React.memo(PresetCard);
const MemoQuestionRow = React.memo(QuestionRow);
const MemoLayoutThumbnail = React.memo(LayoutThumbnail);

/* ─── Main controls panel ─────────────────────────────────────────────────── */

export const StudioControls = React.memo(function StudioControls({ formId }: { formId: string }) {
  const draft = useStudioStore((s) => s.snapshots[formId]?.draft);
  const setToken = useStudioStore((s) => s.setToken);
  const applyStylePreset = useStudioStore((s) => s.applyStylePreset);
  const applyLayoutPreset = useStudioStore((s) => s.applyLayoutPreset);
  const updateLayout = useStudioStore((s) => s.updateLayout);
  const setQuestions = useStudioStore((s) => s.setQuestions);
  const setHeadline = useStudioStore((s) => s.setHeadline);
  const setSubhead = useStudioStore((s) => s.setSubhead);
  const setBrandName = useStudioStore((s) => s.setBrandName);
  const randomize = useStudioStore((s) => s.randomize);
  const reset = useStudioStore((s) => s.reset);
  const device = useStudioStore((s) => s.device);
  const setDevice = useStudioStore((s) => s.setDevice);

  // Stable callbacks to prevent child re-renders
  const handleRandomize = React.useCallback(() => randomize(formId), [randomize, formId]);
  const handleReset = React.useCallback(() => reset(formId), [reset, formId]);

  if (!draft) return null;

  const t = draft.tokens;
  const layout = draft.layout;

  const setTok = <K extends keyof DesignTokens>(key: K, value: DesignTokens[K]) =>
    setToken(formId, key, value);

  const devices: { key: StudioDevice; label: string }[] = [
    { key: "desktop", label: "Desktop" },
    { key: "tablet", label: "Tablet" },
    { key: "mobile", label: "Mobile" },
  ];

  return (
    <div className="studio-panel" style={{ height: "100%", overflowY: "auto" as const,
      background: C.panelBg, fontFamily: F.sans, containerType: "inline-size" as React.CSSProperties["containerType"],
      containerName: "studio-panel" }}>
      <StudioStyles />
      {/* ─── Header ──────────────────────────────────────── */}
      <div style={{ padding: "18px 20px 12px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6, background: C.ink900,
          color: C.paper, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: F.sans, fontSize: 15, fontWeight: 700, letterSpacing: "-0.04em",
        }}>T</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink900, letterSpacing: "-0.02em" }}>Tresta Studio</div>
          <div style={{ fontFamily: F.mono, fontSize: 9.5, color: C.ink500, marginTop: 1, letterSpacing: "0.06em" }}>v0.5 · PREVIEW</div>
        </div>
      </div>

      {/* ─── Device toggle ───────────────────────────────── */}
      <div style={{ padding: "0 20px 14px" }}>
        <Pills
          options={devices.map(d => ({ value: d.key, label: d.label }))}
          value={device}
          onChange={v => setDevice(v as StudioDevice)}
        />
      </div>

      {/* ─── Remix / Reset ───────────────────────────────── */}
      <div style={{ padding: "0 20px 6px", display: "flex", gap: 8 }}>
        <button type="button" onClick={handleRandomize} className="s-pill" style={{
          flex: 1, padding: "10px 0", fontFamily: F.sans, fontSize: 12.5, fontWeight: 600,
          color: C.ink900, background: C.white, border: `1px solid ${C.line}`, borderRadius: 6, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          ↻ Remix
        </button>
        <button type="button" onClick={handleReset} className="s-pill" style={{
          flex: 1, padding: "10px 0", fontFamily: F.sans, fontSize: 12.5, fontWeight: 600,
          color: C.ink500, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 6, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          ↺ Reset
        </button>
      </div>

      {/* ─── Layout ──────────────────────────────────────── */}
      <SectionCollapsible title="Layout">
        <div className="s-layout-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
          {Object.keys(LAYOUT_PRESETS).map(id => (
            <button key={id} type="button" onClick={() => applyLayoutPreset(formId, id)}
              className="s-card"
              style={{ padding: 6, border: draft.layoutPreset === id ? `1.5px solid ${C.ink900}` : `1px solid ${C.line}`,
                borderRadius: 6, background: draft.layoutPreset === id ? C.white : "transparent", cursor: "pointer" }}>
              <MemoLayoutThumbnail kind={id} selected={draft.layoutPreset === id} />
              <div style={{ fontFamily: F.mono, fontSize: 9.5, color: C.ink700,
                textAlign: "center" as const, marginTop: 4, letterSpacing: "0.04em" }}>
                {LAYOUT_PRESETS[id].label}
              </div>
            </button>
          ))}
        </div>
        <Row label="Flow">
          <StudioSelect<FlowMode> value={layout.flow} onChange={v => updateLayout(formId, { flow: v })}
            options={[
              { value: "all", label: "All at once" }, { value: "stepped", label: "Stepped" },
              { value: "cards", label: "Cards" }, { value: "conversational", label: "Conversational" },
            ]} />
        </Row>
        <Row label="Container">
          <StudioSelect<ContainerMode> value={layout.container} onChange={v => updateLayout(formId, { container: v })}
            options={[
              { value: "boxed", label: "Boxed" }, { value: "split", label: "Split" },
              { value: "fullbleed", label: "Fullbleed" }, { value: "centered", label: "Centered" },
            ]} />
        </Row>
        <Row label="Hero">
          <StudioSelect<HeroMode> value={layout.hero} onChange={v => updateLayout(formId, { hero: v })}
            options={[
              { value: "none", label: "None" }, { value: "top", label: "Top" },
              { value: "side", label: "Side" }, { value: "floating", label: "Floating" },
            ]} />
        </Row>
      </SectionCollapsible>

      {/* ─── House styles ────────────────────────────────── */}
      <SectionCollapsible title="House styles">
        <div className="s-presets-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {Object.entries(STYLE_PRESETS).map(([k, p]) => (
            <MemoPresetCard key={k} k={k} p={p} selected={draft.preset === k}
              onClick={() => applyStylePreset(formId, k)} />
          ))}
        </div>
      </SectionCollapsible>

      {/* ─── Community presets ────────────────────────────── */}
      <SectionCollapsible title="Community" tag="NEW" defaultOpen={false}>
        <div className="s-presets-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {Object.entries(COMMUNITY_PRESETS).map(([k, p]) => (
            <MemoPresetCard key={k} k={k} p={p} selected={draft.preset === k}
              onClick={() => applyStylePreset(formId, k)} showAuthor />
          ))}
        </div>
      </SectionCollapsible>

      {/* ─── Typography ──────────────────────────────────── */}
      <SectionCollapsible title="Typography">
        <Row label="Heading font">
          <StudioSelect value={t.fontHead} onChange={v => setTok("fontHead", v)}
            options={FONT_CHOICES.map(f => ({ value: f.value, label: f.label }))} />
        </Row>
        <Row label="Body font">
          <StudioSelect value={t.fontBody} onChange={v => setTok("fontBody", v)}
            options={FONT_CHOICES.map(f => ({ value: f.value, label: f.label }))} />
        </Row>
        <Row label="Heading size" hint={`${t.sizeHead}px`}>
          <StudioNumberInput value={t.sizeHead} onChange={v => setTok("sizeHead", v)} min={20} max={80} />
        </Row>
        <Row label="Body size" hint={`${t.sizeBase}px`}>
          <StudioNumberInput value={t.sizeBase} onChange={v => setTok("sizeBase", v)} min={10} max={24} />
        </Row>
        <Row label="Heading weight" hint={String(t.weightHead)}>
          <StudioNumberInput value={t.weightHead} onChange={v => setTok("weightHead", v)} min={100} max={900} step={100} />
        </Row>
        <Row label="Tracking" hint={`${t.trackingHead}em`}>
          <StudioNumberInput value={t.trackingHead} onChange={v => setTok("trackingHead", v)} min={-0.06} max={0.06} step={0.005} />
        </Row>
      </SectionCollapsible>

      {/* ─── Color ───────────────────────────────────────── */}
      <SectionCollapsible title="Color">
        <StudioColorInput label="Background" value={t.bg} onChange={v => setTok("bg", v)} />
        <StudioColorInput label="Surface" value={t.surface} onChange={v => setTok("surface", v)} />
        <StudioColorInput label="Ink" value={t.ink} onChange={v => setTok("ink", v)} />
        <StudioColorInput label="Ink soft" value={t.inkSoft} onChange={v => setTok("inkSoft", v)} />
        <StudioColorInput label="Line" value={t.line} onChange={v => setTok("line", v)} />
        <StudioColorInput label="Accent" value={t.accent} onChange={v => setTok("accent", v)} />
        <StudioColorInput label="Accent ink" value={t.accentInk} onChange={v => setTok("accentInk", v)} />
        <Row label="Dark mode">
          <Pills options={[{ value: "false", label: "Light" }, { value: "true", label: "Dark" }]}
            value={String(t.dark)} onChange={v => setTok("dark", v === "true")} />
        </Row>
      </SectionCollapsible>

      {/* ─── Shape & density ─────────────────────────────── */}
      <SectionCollapsible title="Shape & density">
        <Row label="Corner radius" hint={`${t.radius}px`}>
          <StudioNumberInput value={t.radius} onChange={v => setTok("radius", v)} min={0} max={30} />
        </Row>
        <Row label="Field shape">
          <Pills<FieldShape> options={[
            { value: "rounded", label: "Rounded" }, { value: "square", label: "Square" },
            { value: "underline", label: "Under" }, { value: "pill", label: "Pill" },
          ]} value={t.fieldShape} onChange={v => setTok("fieldShape", v)} />
        </Row>
        <Row label="Density">
          <Pills<TokenDensity> options={[
            { value: "compact", label: "Compact" }, { value: "default", label: "Default" },
            { value: "cozy", label: "Cozy" }, { value: "airy", label: "Airy" },
          ]} value={t.density} onChange={v => setTok("density", v)} />
        </Row>
        <Row label="Button style">
          <Pills<TokenButtonStyle> options={[
            { value: "solid", label: "Solid" }, { value: "pill", label: "Pill" },
            { value: "block", label: "Block" }, { value: "ghost", label: "Ghost" },
          ]} value={t.buttonStyle} onChange={v => setTok("buttonStyle", v)} />
        </Row>
        <Row label="Shadow">
          <Pills<TokenShadow> options={[
            { value: "none", label: "None" }, { value: "sm", label: "Sm" },
            { value: "soft", label: "Soft" }, { value: "hard", label: "Hard" },
          ]} value={t.shadow} onChange={v => setTok("shadow", v)} />
        </Row>
        <Row label="Texture">
          <Pills<TokenTexture> options={[
            { value: "none", label: "None" }, { value: "grain", label: "Grain" },
            { value: "dots", label: "Dots" }, { value: "lines", label: "Lines" },
          ]} value={t.texture} onChange={v => setTok("texture", v)} />
        </Row>
      </SectionCollapsible>

      {/* ─── Content ─────────────────────────────────────── */}
      <SectionCollapsible title="Content">
        <Row label="Headline">
          <StudioTextInput value={draft.headline} onChange={v => setHeadline(formId, v)} />
        </Row>
        <Row label="Subhead">
          <textarea value={draft.subhead} onChange={e => setSubhead(formId, e.target.value)} rows={3}
            style={{ width: "100%", padding: "8px 10px", fontFamily: F.mono, fontSize: 12,
              background: C.white, border: `1px solid ${C.line}`, borderRadius: 6, outline: "none",
              resize: "vertical" as const }} />
        </Row>
        <Row label="Brand name">
          <StudioTextInput value={draft.brandName} onChange={v => setBrandName(formId, v)} />
        </Row>
      </SectionCollapsible>

      {/* ─── Questions & Logic ───────────────────────────── */}
      <SectionCollapsible title="Questions & Logic" tag={String(draft.questions.length)}>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginBottom: 12 }}>
          {draft.questions.map((q, i) => (
            <MemoQuestionRow key={q.id} q={q} index={i} total={draft.questions.length}
              questions={draft.questions}
              onUpdate={(patch) => {
                const next = [...draft.questions];
                next[i] = { ...next[i], ...patch };
                setQuestions(formId, next);
              }}
              onRemove={() => setQuestions(formId, draft.questions.filter((_, j) => j !== i))}
              onMove={(dir) => {
                const next = [...draft.questions];
                const ni = i + dir;
                if (ni < 0 || ni >= next.length) return;
                [next[i], next[ni]] = [next[ni], next[i]];
                setQuestions(formId, next);
              }}
            />
          ))}
        </div>
        <AddQuestion onAdd={(type) => {
          setQuestions(formId, [
            ...draft.questions,
            { id: `q_${Date.now()}`, type: type as StudioQuestion["type"], label: "New question", required: false },
          ]);
        }} />
      </SectionCollapsible>

      <div style={{ height: 60 }} />
    </div>
  );
});
