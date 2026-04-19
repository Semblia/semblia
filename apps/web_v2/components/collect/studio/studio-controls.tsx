"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

/* ─── Shared small primitives ─────────────────────────────────────────────── */

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5">
      <div className="label-quiet mb-2 flex justify-between">
        <span>{label}</span>
        {hint != null && (
          <span className="text-foreground normal-case tracking-normal text-[11px]">{hint}</span>
        )}
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
    <div className="border-t border-border px-5 py-4.5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center justify-between bg-transparent p-0 text-[13px] font-semibold text-foreground tracking-tight cursor-pointer border-none",
          "transition-[margin-bottom] duration-200",
          open ? "mb-3.5" : "mb-0"
        )}
      >
        <span className="flex items-center gap-2">
          {title}
          {tag && <Badge variant="default" className="rounded-sm px-1.5 py-px font-mono text-[9px] font-semibold tracking-wider">{tag}</Badge>}
        </span>
        <span className={cn(
          "font-mono text-[10px] text-muted-foreground transition-transform duration-150",
          open && "rotate-90"
        )}>▸</span>
      </button>
      <div className="studio-collapse" {...(!open ? { "data-closed": "" } : {})}>
        <div className="studio-collapse-inner">{children}</div>
      </div>
    </div>
  );
}

function StudioTextInput({ value, onChange, className: extraClass, ...rest }: {
  value: string; onChange: (v: string) => void; className?: string;
  [k: string]: unknown;
}) {
  return (
    <Input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cn("h-8 font-mono text-xs", extraClass)}
      {...rest}
    />
  );
}

function StudioNumberInput({ value, onChange, min = 0, max = 100, step = 1, suffix }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="flex-1"
      />
      <span className="min-w-[52px] text-right font-mono text-[11px] text-foreground">{value}{suffix || ""}</span>
    </div>
  );
}

function StudioColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const isHex = typeof value === "string" && value.startsWith("#");
  return (
    <Row label={label}>
      <div className="flex items-center gap-2">
        <label
          className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border"
          style={{ background: value }}
        >
          {isHex && (
            <input
              type="color"
              value={value}
              onChange={e => onChange(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          )}
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
    <Select value={value} onValueChange={v => onChange(v as T)}>
      <SelectTrigger className="h-8 w-full text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Label className="flex items-center justify-between rounded-lg border border-border bg-card px-2.5 py-2 text-[11.5px] cursor-pointer">
      {label}
      <Switch size="sm" checked={value} onCheckedChange={onChange} />
    </Label>
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
    <div className="flex flex-wrap gap-1 rounded-lg bg-secondary p-0.5">
      {options.map(o => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 min-w-0 rounded-md px-2.5 py-1.5 text-[11.5px] font-medium whitespace-nowrap cursor-pointer border-none",
              "transition-[background,color,box-shadow] duration-150",
              on
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Layout thumbnails ───────────────────────────────────────────────────── */

function LayoutThumbnail({ kind, selected }: { kind: string; selected: boolean }) {
  const stroke = selected ? "currentColor" : "var(--color-muted-foreground)";
  const fill = selected ? "var(--color-secondary)" : "var(--color-muted)";
  return (
    <svg viewBox="0 0 80 48" className="block w-full rounded text-foreground" style={{ background: fill }}>
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
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative cursor-pointer rounded-lg border p-2.5 text-left transition-colors duration-150",
        selected
          ? "border-foreground bg-card"
          : "border-border bg-transparent hover:border-muted-foreground/40 hover:bg-card"
      )}
    >
      <div className="mb-2 flex gap-1">
        <span className="size-4 rounded-sm border border-black/8" style={{ background: p.tokens.bg }}/>
        <span className="size-4 rounded-sm border border-black/8" style={{ background: p.tokens.surface }}/>
        <span className="size-4 rounded-sm" style={{ background: p.tokens.ink }}/>
        <span className="size-4 rounded-sm" style={{ background: p.tokens.accent }}/>
      </div>
      <div className="text-[12.5px] font-semibold text-foreground tracking-tight">{p.label}</div>
      <div className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">{p.sub}</div>
      {showAuthor && (
        <div className="mt-2 flex items-center justify-between font-mono text-[9.5px] tracking-wide text-muted-foreground/70">
          <span>{p.author}</span>
          <span>♥ {p.likes?.toLocaleString()}</span>
        </div>
      )}
    </button>
  );
}

/* ─── Question row ────────────────────────────────────────────────────────── */

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
    <div className={cn(
      "rounded-lg border bg-card transition-[border-color,box-shadow] duration-150",
      open ? "border-border shadow-sm" : "border-border"
    )}>
      <div className="flex items-center gap-2 px-2.5 py-2">
        <div className="min-w-[18px] font-mono text-[10.5px] text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-foreground">
          {q.label}
          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            {TYPE_LABELS[q.type] || q.type}
            {hasLogic && <Badge variant="destructive" className="rounded-sm px-1 py-px text-[9px] font-semibold tracking-wide">IF</Badge>}
          </div>
        </div>
        <Button variant="outline" size="icon-xs" onClick={() => onMove(-1)} disabled={index === 0} className="font-mono text-[11px]">↑</Button>
        <Button variant="outline" size="icon-xs" onClick={() => onMove(1)} disabled={index === total - 1} className="font-mono text-[11px]">↓</Button>
        <Button variant="outline" size="icon-xs" onClick={() => setOpen(!open)} className="font-mono text-[11px]">{open ? "✕" : "✎"}</Button>
      </div>
      <div className="studio-collapse" {...(open ? {} : { "data-closed": "" })}>
        <div className="studio-collapse-inner">
          <div className="border-t border-border/60 bg-background px-2.5 py-2.5 pb-3">
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
                <textarea
                  value={(q.options || []).join("\n")}
                  onChange={e => onUpdate({ options: e.target.value.split("\n").filter(x => x.trim()) })}
                  rows={4}
                  className="w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                />
              </Row>
            )}
            <ConditionalLogicEditor q={q} otherQs={otherQs} onUpdate={onUpdate} />
            <div className="mt-2 flex items-center gap-2">
              <Label className="flex items-center gap-1.5 text-[11.5px] cursor-pointer">
                <Checkbox checked={!!q.required} onCheckedChange={v => onUpdate({ required: !!v })} />
                Required
              </Label>
              <div className="flex-1" />
              <Button variant="destructive" size="xs" onClick={onRemove}>Delete</Button>
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
    <div className="mt-3 rounded-lg border border-border/60 bg-card p-2.5">
      <div className={cn("flex items-center justify-between", enabled && "mb-2.5")}>
        <div className="flex items-center gap-2">
          <span className="label-quiet">Conditional logic</span>
          {enabled && <Badge variant="destructive" className="rounded-sm px-1 py-px text-[9px] font-semibold tracking-wide">ON</Badge>}
        </div>
        {enabled ? (
          <Button variant="destructive" size="xs" onClick={toggle}>Remove</Button>
        ) : (
          <Button variant="outline" size="xs" onClick={toggle} disabled={!otherQs.length}>+ Add rule</Button>
        )}
      </div>
      {enabled && (
        <>
          <div className="mb-2 text-[11px] text-foreground/80">Show this only when…</div>
          <div className="grid grid-cols-1 gap-1.5">
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
      <Button
        variant="outline"
        className="w-full border-dashed border-muted-foreground/40 text-xs font-medium"
        onClick={() => setOpen(!open)}
      >
        + Add question
      </Button>
      {open && (
        <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1.5 animate-fade-up">
          {types.map(([v, l]) => (
            <Button
              key={v}
              variant="outline"
              size="sm"
              className="justify-start text-[11.5px]"
              onClick={() => { onAdd(v); setOpen(false); }}
            >
              {l}
            </Button>
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
    <div className="h-full overflow-y-auto bg-sidebar font-sans [container-type:inline-size] [container-name:studio-panel]">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-5 pt-4.5 pb-3">
        <div className="flex size-[26px] items-center justify-center rounded-md bg-primary text-primary-foreground text-[15px] font-bold tracking-tighter">T</div>
        <div>
          <div className="text-sm font-bold text-foreground tracking-tight">Tresta Studio</div>
          <div className="mt-px font-mono text-[9.5px] text-muted-foreground tracking-wider">v0.5 · PREVIEW</div>
        </div>
      </div>

      {/* ─── Device toggle ───────────────────────────────── */}
      <div className="px-5 pb-3.5">
        <Pills
          options={devices.map(d => ({ value: d.key, label: d.label }))}
          value={device}
          onChange={v => setDevice(v as StudioDevice)}
        />
      </div>

      {/* ─── Remix / Reset ───────────────────────────────── */}
      <div className="flex gap-2 px-5 pb-1.5">
        <Button variant="outline" className="flex-1 text-[12.5px] font-semibold" onClick={handleRandomize}>↻ Remix</Button>
        <Button variant="ghost" className="flex-1 text-[12.5px] font-semibold text-muted-foreground" onClick={handleReset}>↺ Reset</Button>
      </div>

      {/* ─── Layout ──────────────────────────────────────── */}
      <SectionCollapsible title="Layout">
        <div className="studio-layout-grid mb-3.5 grid grid-cols-3 gap-1.5">
          {Object.keys(LAYOUT_PRESETS).map(id => (
            <button
              key={id}
              type="button"
              onClick={() => applyLayoutPreset(formId, id)}
              className={cn(
                "cursor-pointer rounded-md border p-1.5 transition-colors duration-150",
                draft.layoutPreset === id
                  ? "border-foreground bg-card"
                  : "border-border bg-transparent hover:border-muted-foreground/40 hover:bg-card"
              )}
            >
              <MemoLayoutThumbnail kind={id} selected={draft.layoutPreset === id} />
              <div className="mt-1 text-center font-mono text-[9.5px] text-foreground/70 tracking-wide">
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
        <div className="studio-presets-grid grid grid-cols-2 gap-2">
          {Object.entries(STYLE_PRESETS).map(([k, p]) => (
            <MemoPresetCard key={k} k={k} p={p} selected={draft.preset === k}
              onClick={() => applyStylePreset(formId, k)} />
          ))}
        </div>
      </SectionCollapsible>

      {/* ─── Community presets ────────────────────────────── */}
      <SectionCollapsible title="Community" tag="NEW" defaultOpen={false}>
        <div className="studio-presets-grid grid grid-cols-2 gap-2">
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
          <textarea
            value={draft.subhead}
            onChange={e => setSubhead(formId, e.target.value)}
            rows={3}
            className="w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </Row>
        <Row label="Brand name">
          <StudioTextInput value={draft.brandName} onChange={v => setBrandName(formId, v)} />
        </Row>
      </SectionCollapsible>

      {/* ─── Questions & Logic ───────────────────────────── */}
      <SectionCollapsible title="Questions & Logic" tag={String(draft.questions.length)}>
        <div className="mb-3 flex flex-col gap-2">
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

      <div className="h-15" />
    </div>
  );
});
