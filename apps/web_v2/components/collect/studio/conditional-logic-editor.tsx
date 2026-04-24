"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StudioQuestion, ShowIfOp } from "@/lib/collect/studio-types";
import { StudioTextInput, StudioSelect } from "./studio-primitives";

/* ─── Conditional logic editor ───────────────────────────────────────────── */

const OP_BY_TYPE: Record<string, [string, string][]> = {
  stars: [
    ["eq", "= exactly"],
    ["gte", "≥ at least"],
    ["lte", "≤ at most"],
    ["gt", "> more than"],
    ["lt", "< less than"],
  ],
  nps: [
    ["eq", "= exactly"],
    ["gte", "≥ at least"],
    ["lte", "≤ at most"],
  ],
  emoji: [
    ["eq", "= exactly"],
    ["gte", "≥ at least"],
    ["lte", "≤ at most"],
  ],
  radio: [
    ["eq", "is"],
    ["neq", "is not"],
  ],
  dropdown: [
    ["eq", "is"],
    ["neq", "is not"],
  ],
  checkbox: [["includes", "includes"]],
  shorttext: [
    ["eq", "is"],
    ["neq", "is not"],
    ["includes", "contains"],
  ],
  longtext: [["includes", "contains"]],
  file: [["eq", "is set"]],
};

export function ConditionalLogicEditor({
  q,
  otherQs,
  onUpdate,
}: {
  q: StudioQuestion;
  otherQs: StudioQuestion[];
  onUpdate: (patch: Partial<StudioQuestion>) => void;
}) {
  const has = !!q.showIf;
  const [enabled, setEnabled] = React.useState(has);
  const s = q.showIf || {
    questionId: otherQs[0]?.id ?? "",
    op: "eq" as ShowIfOp,
    value: "",
  };

  const refQ = otherQs.find((x) => x.id === s.questionId);
  const ops = refQ ? OP_BY_TYPE[refQ.type] || [["eq", "is"]] : [["eq", "is"]];

  const toggle = () => {
    if (enabled) {
      setEnabled(false);
      onUpdate({ showIf: undefined });
    } else if (otherQs.length) {
      setEnabled(true);
      onUpdate({
        showIf: {
          questionId: otherQs[0].id,
          op: (OP_BY_TYPE[otherQs[0].type]?.[0]?.[0] || "eq") as ShowIfOp,
          value: "",
        },
      });
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-card p-2.5">
      <div
        className={cn("flex items-center justify-between", enabled && "mb-2.5")}
      >
        <div className="flex items-center gap-2">
          <span className="label-quiet">Conditional logic</span>
          {enabled && (
            <Badge
              variant="destructive"
              className="rounded-sm px-1 py-px text-[9px] font-semibold tracking-wide"
            >
              ON
            </Badge>
          )}
        </div>
        {enabled ? (
          <Button variant="destructive" size="xs" onClick={toggle}>
            Remove
          </Button>
        ) : (
          <Button
            variant="outline"
            size="xs"
            onClick={toggle}
            disabled={!otherQs.length}
          >
            + Add rule
          </Button>
        )}
      </div>
      {enabled && (
        <>
          <div className="mb-2 text-[11px] text-foreground/80">
            Show this only when…
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            <StudioSelect
              value={s.questionId}
              onChange={(v) => {
                const nq = otherQs.find((x) => x.id === v);
                const nop = (OP_BY_TYPE[nq?.type ?? ""]?.[0]?.[0] ||
                  "eq") as ShowIfOp;
                onUpdate({
                  showIf: { ...s, questionId: v, op: nop, value: "" },
                });
              }}
              options={otherQs.map((x) => ({
                value: x.id,
                label: x.label.slice(0, 30),
              }))}
            />
            <StudioSelect
              value={s.op}
              onChange={(v) =>
                onUpdate({ showIf: { ...s, op: v as ShowIfOp } })
              }
              options={ops.map(([v, l]) => ({ value: v, label: l }))}
            />
            {refQ &&
            (refQ.type === "radio" ||
              refQ.type === "dropdown" ||
              refQ.type === "checkbox") ? (
              <StudioSelect
                value={String(s.value)}
                onChange={(v) => onUpdate({ showIf: { ...s, value: v } })}
                options={[
                  { value: "", label: "— pick a value —" },
                  ...(refQ.options || []).map((o) => ({ value: o, label: o })),
                ]}
              />
            ) : (
              <StudioTextInput
                value={String(s.value)}
                onChange={(v) => {
                  const isNum =
                    refQ &&
                    (refQ.type === "stars" ||
                      refQ.type === "nps" ||
                      refQ.type === "emoji");
                  onUpdate({ showIf: { ...s, value: isNum ? Number(v) : v } });
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
