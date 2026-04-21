"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { StudioQuestion, ShowIfOp } from "@/lib/collect/studio-types";
import { Row, StudioTextInput, StudioSelect } from "./studio-primitives";

/* ─── Type labels ────────────────────────────────────────────────────────── */

const TYPE_LABELS: Record<string, string> = {
  shorttext: "Short text", longtext: "Paragraph", stars: "★ Stars",
  nps: "NPS 0–10", emoji: "Emoji scale", radio: "Radio",
  checkbox: "Checkboxes", dropdown: "Dropdown", file: "File upload",
};

/* ─── Conditional logic editor ───────────────────────────────────────────── */

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

/* ─── Question row ────────────────────────────────────────────────────────── */

export function QuestionRow({ q, index, total, questions, onUpdate, onRemove, onMove }: {
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

/* ─── Add question ────────────────────────────────────────────────────────── */

export function AddQuestion({ onAdd }: { onAdd: (type: string) => void }) {
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

export const MemoQuestionRow = React.memo(QuestionRow);
