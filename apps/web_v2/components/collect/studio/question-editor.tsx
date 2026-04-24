"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { StudioQuestion } from "@/lib/collect/studio-types";
import { Textarea } from "@/components/ui/textarea";
import { Row, StudioTextInput } from "./studio-primitives";
import { ConditionalLogicEditor } from "./conditional-logic-editor";

/* ─── Type labels ────────────────────────────────────────────────────────── */

const TYPE_LABELS: Record<string, string> = {
  shorttext: "Short text",
  longtext: "Paragraph",
  stars: "★ Stars",
  nps: "NPS 0–10",
  emoji: "Emoji scale",
  radio: "Radio",
  checkbox: "Checkboxes",
  dropdown: "Dropdown",
  file: "File upload",
};

/* ─── Question row ────────────────────────────────────────────────────────── */

export function QuestionRow({
  q,
  index,
  total,
  questions,
  onUpdate,
  onRemove,
  onMove,
}: {
  q: StudioQuestion;
  index: number;
  total: number;
  questions: StudioQuestion[];
  onUpdate: (patch: Partial<StudioQuestion>) => void;
  onRemove: () => void;
  onMove: (dir: number) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const hasLogic = !!q.showIf;
  const otherQs = questions.filter((x) => x.id !== q.id);

  return (
    <div
      className={cn(
        "rounded-lg border bg-card transition-[border-color,box-shadow] duration-150",
        open ? "border-border shadow-sm" : "border-border",
      )}
    >
      <div className="flex items-center gap-2 px-2.5 py-2">
        <div className="min-w-[18px] font-mono text-[10.5px] text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-foreground">
          {q.label}
          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            {TYPE_LABELS[q.type] || q.type}
            {hasLogic && (
              <Badge
                variant="destructive"
                className="rounded-sm px-1 py-px text-[9px] font-semibold tracking-wide"
              >
                IF
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="icon-xs"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="font-mono text-[11px]"
        >
          ↑
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          className="font-mono text-[11px]"
        >
          ↓
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          onClick={() => setOpen(!open)}
          className="font-mono text-[11px]"
        >
          {open ? "✕" : "✎"}
        </Button>
      </div>
      <div className="studio-collapse" {...(open ? {} : { "data-closed": "" })}>
        <div className="studio-collapse-inner">
          <div className="border-t border-border/60 bg-background px-2.5 py-2.5 pb-3">
            <Row label="Label">
              <StudioTextInput
                value={q.label}
                onChange={(v) => onUpdate({ label: v })}
              />
            </Row>
            {(q.type === "shorttext" ||
              q.type === "longtext" ||
              q.type === "file") && (
              <Row label="Placeholder">
                <StudioTextInput
                  value={q.placeholder || ""}
                  onChange={(v) => onUpdate({ placeholder: v })}
                />
              </Row>
            )}
            {(q.type === "radio" ||
              q.type === "checkbox" ||
              q.type === "dropdown") && (
              <Row label="Options (one per line)">
                <Textarea
                  value={(q.options || []).join("\n")}
                  onChange={(e) =>
                    onUpdate({
                      options: e.target.value
                        .split("\n")
                        .filter((x) => x.trim()),
                    })
                  }
                  rows={4}
                  className="resize-y font-mono text-xs"
                />
              </Row>
            )}
            <ConditionalLogicEditor
              q={q}
              otherQs={otherQs}
              onUpdate={onUpdate}
            />
            <div className="mt-2 flex items-center gap-2">
              <Label className="flex items-center gap-1.5 text-[11.5px] cursor-pointer">
                <Checkbox
                  checked={!!q.required}
                  onCheckedChange={(v) => onUpdate({ required: !!v })}
                />
                Required
              </Label>
              <div className="flex-1" />
              <Button variant="destructive" size="xs" onClick={onRemove}>
                Delete
              </Button>
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
    ["shorttext", "Short text"],
    ["longtext", "Paragraph"],
    ["stars", "★ Stars"],
    ["nps", "NPS 0–10"],
    ["emoji", "Emoji scale"],
    ["radio", "Radio"],
    ["checkbox", "Checkboxes"],
    ["dropdown", "Dropdown"],
    ["file", "File upload"],
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
              onClick={() => {
                onAdd(v);
                setOpen(false);
              }}
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
