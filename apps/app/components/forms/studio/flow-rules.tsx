"use client";

/**
 * Per-field conditional logic (forms-core conditional rules). Conditionals
 * are content: each field's editor carries a Logic section scoped to the
 * rules that show/hide that field (2026-07-17 — the global Setup list died).
 *
 * Value editors adapt to the source field: options for selects, steps for
 * ratings, free text otherwise — so authors compose rules by picking, not by
 * remembering stored values.
 */

import * as React from "react";
import { PlusIcon, XIcon } from "@phosphor-icons/react";
import type {
  Condition,
  ConditionOperator,
  ConditionalRule,
  FormDefinitionDoc,
  FormField,
} from "@workspace/forms-core";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  PanelSection,
  Segmented,
  SelectField,
} from "@/components/studio/controls";

const OPERATOR_LABEL: Record<ConditionOperator, string> = {
  equals: "is",
  notEquals: "is not",
  greaterThanOrEqual: "is at least",
  lessThanOrEqual: "is at most",
  greaterThan: "is more than",
  lessThan: "is less than",
  contains: "contains",
  notContains: "doesn't contain",
};

const NUMERIC_OPERATORS: ReadonlyArray<ConditionOperator> = [
  "equals",
  "notEquals",
  "greaterThanOrEqual",
  "lessThanOrEqual",
  "greaterThan",
  "lessThan",
];
const CHOICE_OPERATORS: ReadonlyArray<ConditionOperator> = [
  "equals",
  "notEquals",
  "contains",
  "notContains",
];
const TEXT_OPERATORS: ReadonlyArray<ConditionOperator> = [
  "contains",
  "notContains",
  "equals",
  "notEquals",
];

function operatorsFor(
  source: FormField | undefined,
): ReadonlyArray<ConditionOperator> {
  if (!source) return TEXT_OPERATORS;
  if (source.type === "rating") return NUMERIC_OPERATORS;
  if (source.type === "singleSelect" || source.type === "multiSelect")
    return CHOICE_OPERATORS;
  return TEXT_OPERATORS;
}

function defaultConditionFor(source: FormField): Condition {
  if (source.type === "rating")
    return { fieldId: source.id, operator: "lessThanOrEqual", value: 3 };
  if (source.type === "singleSelect" || source.type === "multiSelect")
    return {
      fieldId: source.id,
      operator: "equals",
      value: source.options?.[0]?.value ?? "",
    };
  return { fieldId: source.id, operator: "contains", value: "" };
}

/**
 * FieldLogicSection — the selected field's conditional logic, scoped to rules
 * that show/hide THIS field (conditionals are content, so they live with the
 * field in the left rail, not in a global Setup list).
 */
export function FieldLogicSection({
  doc,
  fieldId,
  onChange,
}: {
  doc: FormDefinitionDoc;
  fieldId: string;
  onChange: (next: FormDefinitionDoc) => void;
}) {
  const rules = doc.flow.conditionalRules;
  const sourceFields = doc.fields.filter(
    (f) => f.type !== "hidden" && f.type !== "consent" && f.id !== fieldId,
  );
  const ownRuleIndexes = rules
    .map((rule, index) => ({ rule, index }))
    .filter(({ rule }) => rule.targetFieldId === fieldId);

  const setRules = (next: ConditionalRule[]) =>
    onChange({ ...doc, flow: { ...doc.flow, conditionalRules: next } });

  const addRule = () => {
    const source = sourceFields[0];
    if (!source) return;
    setRules([
      ...rules,
      {
        targetFieldId: fieldId,
        action: "show",
        match: "all",
        conditions: [defaultConditionFor(source)],
      },
    ]);
  };

  return (
    <PanelSection
      title="Logic"
      action={
        <button
          type="button"
          onClick={addRule}
          disabled={sourceFields.length === 0}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-foreground",
            "transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          <PlusIcon className="size-3" weight="bold" aria-hidden />
          Add rule
        </button>
      }
    >
      {ownRuleIndexes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          Always shown. Add a rule to show or hide this question based on an
          earlier answer.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {ownRuleIndexes.map(({ rule, index }) => (
            <RuleCard
              key={index}
              rule={rule}
              fields={doc.fields.filter((f) => f.type !== "hidden")}
              sourceFields={sourceFields}
              lockedTargetLabel="this question"
              onUpdate={(patch) =>
                setRules(
                  rules.map((r, i) => (i === index ? { ...r, ...patch } : r)),
                )
              }
              onRemove={() => setRules(rules.filter((_, i) => i !== index))}
            />
          ))}
        </div>
      )}
    </PanelSection>
  );
}

function RuleCard({
  rule,
  fields,
  sourceFields,
  lockedTargetLabel,
  onUpdate,
  onRemove,
}: {
  rule: ConditionalRule;
  fields: FormField[];
  sourceFields: FormField[];
  /** Per-field context: the target is fixed; show a label, not a picker. */
  lockedTargetLabel?: string;
  onUpdate: (patch: Partial<ConditionalRule>) => void;
  onRemove: () => void;
}) {
  const fieldName = (f: FormField) => f.label || f.id;
  const fieldOptions = fields.map((f) => ({
    value: f.id,
    label: fieldName(f),
  }));

  const setCondition = (index: number, next: Condition) =>
    onUpdate({
      conditions: rule.conditions.map((c, i) => (i === index ? next : c)),
    });

  const addCondition = () => {
    const source = sourceFields[0];
    if (!source) return;
    onUpdate({ conditions: [...rule.conditions, defaultConditionFor(source)] });
  };

  const removeCondition = (index: number) => {
    if (rule.conditions.length <= 1) return;
    onUpdate({ conditions: rule.conditions.filter((_, i) => i !== index) });
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <Segmented<"show" | "hide">
          ariaLabel="Rule action"
          className="w-auto shrink-0"
          value={rule.action}
          onChange={(action) => onUpdate({ action })}
          options={[
            { value: "show", label: "Show" },
            { value: "hide", label: "Hide" },
          ]}
        />
        <div className="min-w-0 flex-1">
          {lockedTargetLabel ? (
            <span className="block truncate px-1 text-xs text-muted-foreground">
              {lockedTargetLabel}
            </span>
          ) : (
            <SelectField
              ariaLabel="Target field"
              value={rule.targetFieldId}
              onChange={(targetFieldId) => onUpdate({ targetFieldId })}
              options={fieldOptions}
              className="h-8 text-xs"
            />
          )}
        </div>
        <button
          type="button"
          aria-label="Remove rule"
          title="Remove rule"
          onClick={onRemove}
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
            "hover:bg-destructive/10 hover:text-destructive",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          <XIcon className="size-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>when</span>
        <Segmented<"all" | "any">
          ariaLabel="Match mode"
          className="w-auto"
          value={rule.match}
          onChange={(match) => onUpdate({ match })}
          options={[
            { value: "all", label: "all" },
            { value: "any", label: "any" },
          ]}
        />
        <span>of these match</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {rule.conditions.map((condition, i) => (
          <ConditionRow
            key={i}
            condition={condition}
            sourceFields={sourceFields}
            onChange={(next) => setCondition(i, next)}
            onRemove={
              rule.conditions.length > 1 ? () => removeCondition(i) : undefined
            }
          />
        ))}
        <button
          type="button"
          onClick={addCondition}
          className={cn(
            "inline-flex items-center gap-1.5 self-start rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground",
            "transition-colors hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          <PlusIcon className="size-3" weight="bold" aria-hidden />
          Add condition
        </button>
      </div>
    </div>
  );
}

function ConditionRow({
  condition,
  sourceFields,
  onChange,
  onRemove,
}: {
  condition: Condition;
  sourceFields: FormField[];
  onChange: (next: Condition) => void;
  onRemove?: () => void;
}) {
  const source = sourceFields.find((f) => f.id === condition.fieldId);
  const operators = operatorsFor(source);

  const handleSourceChange = (fieldId: string) => {
    const nextSource = sourceFields.find((f) => f.id === fieldId);
    onChange(nextSource ? defaultConditionFor(nextSource) : condition);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="min-w-[7rem] flex-1">
        <SelectField
          ariaLabel="Source field"
          value={condition.fieldId}
          onChange={handleSourceChange}
          options={sourceFields.map((f) => ({
            value: f.id,
            label: f.label || f.id,
          }))}
          className="h-8 text-xs"
        />
      </div>
      <div className="w-[7.5rem] shrink-0">
        <SelectField
          ariaLabel="Operator"
          value={condition.operator}
          onChange={(operator) => onChange({ ...condition, operator })}
          options={operators.map((op) => ({
            value: op,
            label: OPERATOR_LABEL[op],
          }))}
          className="h-8 text-xs"
        />
      </div>
      <div className="min-w-[5.5rem] flex-1">
        <ConditionValueEditor
          condition={condition}
          source={source}
          onChange={onChange}
        />
      </div>
      {onRemove && (
        <button
          type="button"
          aria-label="Remove condition"
          onClick={onRemove}
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
            "hover:bg-muted hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          <XIcon className="size-3" />
        </button>
      )}
    </div>
  );
}

function ConditionValueEditor({
  condition,
  source,
  onChange,
}: {
  condition: Condition;
  source: FormField | undefined;
  onChange: (next: Condition) => void;
}) {
  if (source?.type === "rating") {
    const scale = source.ratingScale ?? 5;
    return (
      <SelectField
        ariaLabel="Condition value"
        value={String(condition.value)}
        onChange={(v) => onChange({ ...condition, value: Number(v) })}
        options={Array.from({ length: scale }, (_, i) => ({
          value: String(i + 1),
          label: String(i + 1),
        }))}
        className="h-8 text-xs"
      />
    );
  }

  if (
    (source?.type === "singleSelect" || source?.type === "multiSelect") &&
    (source.options?.length ?? 0) > 0
  ) {
    return (
      <SelectField
        ariaLabel="Condition value"
        value={String(condition.value)}
        onChange={(v) => onChange({ ...condition, value: v })}
        options={(source.options ?? []).map((o) => ({
          value: o.value,
          label: o.label,
        }))}
        className="h-8 text-xs"
      />
    );
  }

  return (
    <Input
      aria-label="Condition value"
      value={String(condition.value)}
      onChange={(e) => onChange({ ...condition, value: e.target.value })}
      placeholder="value"
      className="h-8 text-xs"
    />
  );
}
