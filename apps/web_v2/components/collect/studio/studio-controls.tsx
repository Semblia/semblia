"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/lib/collect/studio-store";
import {
  STYLE_PRESETS,
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
  TokenDensity,
  TokenButtonStyle,
  TokenShadow,
  TokenTexture,
} from "@/lib/collect/studio-types";
import { Section, SectionDivider } from "@/components/collect/inspector/primitives/section";
import { ColorInput } from "@/components/collect/inspector/primitives/color-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";

/* ─── Shared small primitives ─────────────────────────────────────────────── */

function Row({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <Label className="shrink-0 text-[11px]">
        {label}
      </Label>
      {children}
    </div>
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
    <ToggleGroup
      type="single"
      variant="default"
      size="sm"
      value={value}
      onValueChange={(v) => { if (v) onChange(v as T); }}
      className="gap-0 rounded-md bg-muted/50 p-0.5"
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="h-auto rounded-[3px] px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:shadow-sm"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function SelectField<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger size="sm" className="text-[11px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-[11px]">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function NumberField({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step ?? 1}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-7 w-16 text-right font-mono text-[11px]"
    />
  );
}

/* ─── Layout thumbnails ───────────────────────────────────────────────────── */

function LayoutThumbnail({
  presetId,
  active,
  onClick,
}: {
  presetId: string;
  active: boolean;
  onClick: () => void;
}) {
  const preset = LAYOUT_PRESETS[presetId];
  if (!preset) return null;

  return (
    <Button
      type="button"
      variant={active ? "outline" : "ghost"}
      onClick={onClick}
      className={cn(
        "flex h-auto flex-col items-center gap-1 rounded-md border p-1.5",
        active
          ? "border-primary ring-1 ring-primary/20"
          : "border-border/60 hover:border-foreground/20 hover:bg-muted/40",
      )}
    >
      {/* Mini SVG thumbnail */}
      <svg
        viewBox="0 0 40 32"
        className="h-8 w-10 opacity-70"
        fill="none"
        stroke="currentColor"
        strokeWidth={0.8}
      >
        {presetId === "classic" && (
          <>
            <rect x="8" y="2" width="24" height="6" rx="1" />
            <rect x="12" y="12" width="16" height="3" rx="0.5" />
            <rect x="12" y="17" width="16" height="3" rx="0.5" />
            <rect x="12" y="22" width="16" height="3" rx="0.5" />
            <rect x="15" y="27" width="10" height="3" rx="0.5" fill="currentColor" />
          </>
        )}
        {presetId === "split" && (
          <>
            <rect x="2" y="2" width="16" height="28" rx="1" fill="currentColor" opacity="0.15" />
            <rect x="22" y="6" width="14" height="3" rx="0.5" />
            <rect x="22" y="11" width="14" height="3" rx="0.5" />
            <rect x="22" y="16" width="14" height="3" rx="0.5" />
            <rect x="24" y="24" width="10" height="3" rx="0.5" fill="currentColor" />
          </>
        )}
        {presetId === "stepped" && (
          <>
            <rect x="4" y="4" width="32" height="1.5" rx="0.5" fill="currentColor" opacity="0.3" />
            <rect x="8" y="12" width="24" height="4" rx="0.5" />
            <rect x="14" y="24" width="12" height="3" rx="0.5" fill="currentColor" />
          </>
        )}
        {presetId === "cards" && (
          <>
            <rect x="6" y="4" width="28" height="20" rx="2" />
            <rect x="8" y="6" width="24" height="16" rx="1.5" opacity="0.4" />
            <rect x="12" y="26" width="16" height="2" rx="0.5" fill="currentColor" opacity="0.3" />
          </>
        )}
        {presetId === "convo" && (
          <>
            <rect x="4" y="4" width="20" height="4" rx="2" fill="currentColor" opacity="0.15" />
            <rect x="16" y="12" width="20" height="4" rx="2" />
            <rect x="4" y="20" width="20" height="4" rx="2" fill="currentColor" opacity="0.15" />
          </>
        )}
        {presetId === "magazine" && (
          <>
            <rect x="6" y="2" width="28" height="8" rx="1" fill="currentColor" opacity="0.1" />
            <rect x="10" y="14" width="20" height="3" rx="0.5" />
            <rect x="10" y="19" width="20" height="3" rx="0.5" />
            <rect x="13" y="27" width="14" height="3" rx="0.5" fill="currentColor" />
          </>
        )}
      </svg>
      <span className="text-[9px] font-medium leading-none">{preset.label}</span>
    </Button>
  );
}

/* ─── Style preset card ───────────────────────────────────────────────────── */

function StylePresetCard({
  id,
  active,
  onClick,
}: {
  id: string;
  active: boolean;
  onClick: () => void;
}) {
  const p = STYLE_PRESETS[id];
  if (!p) return null;
  const t = p.tokens;

  return (
    <Button
      type="button"
      variant={active ? "outline" : "ghost"}
      onClick={onClick}
      className={cn(
        "flex h-auto flex-col gap-1 rounded-md border p-1.5 text-left",
        active
          ? "border-primary ring-1 ring-primary/20"
          : "border-border/60 hover:border-foreground/20 hover:bg-muted/40",
      )}
    >
      {/* Mini swatch */}
      <div
        className="flex h-10 w-full flex-col justify-between overflow-hidden rounded-[3px] p-1.5"
        style={{ backgroundColor: t.bg }}
      >
        <div className="flex items-center gap-1">
          <div
            className="size-2 rounded-sm"
            style={{ backgroundColor: t.accent }}
          />
          <div
            className="h-[3px] rounded-full"
            style={{
              width: 20,
              backgroundColor: t.ink,
              opacity: 0.5,
            }}
          />
        </div>
        <div className="flex gap-1">
          {[16, 12].map((w, i) => (
            <div
              key={i}
              className="h-[4px]"
              style={{
                width: w,
                backgroundColor: t.accent,
                opacity: 0.6,
                borderRadius: t.radius,
              }}
            />
          ))}
        </div>
      </div>
      <span className="text-[9px] font-medium leading-none">{p.label}</span>
    </Button>
  );
}

/* ─── Question row ────────────────────────────────────────────────────────── */

function QuestionRow({
  question,
  index,
  onUpdate,
  onDelete,
}: {
  question: StudioQuestion;
  index: number;
  onUpdate: (q: StudioQuestion) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="group rounded-md border border-border/60 bg-muted/20">
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <span className="flex size-4 shrink-0 items-center justify-center rounded bg-muted text-[8px] font-bold text-muted-foreground">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-foreground">
          {question.label}
        </span>
        <span className="shrink-0 rounded bg-muted px-1 text-[8px] font-medium uppercase text-muted-foreground">
          {question.type}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={expanded ? "Collapse question" : "Expand question"}
        >
          {expanded ? (
            <ChevronUpIcon className="size-3" aria-hidden="true" />
          ) : (
            <ChevronDownIcon className="size-3" aria-hidden="true" />
          )}
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-border/50 px-2.5 py-2 text-[10px]">
          <div className="flex flex-col gap-1.5">
            <Input
              value={question.label}
              onChange={(e) => onUpdate({ ...question, label: e.target.value })}
              className="h-7 text-[11px]"
              placeholder="Question label"
            />
            {question.placeholder !== undefined && (
              <Input
                value={question.placeholder}
                onChange={(e) =>
                  onUpdate({ ...question, placeholder: e.target.value })
                }
                className="h-7 text-[11px]"
                placeholder="Placeholder text"
              />
            )}
            <Label className="flex items-center gap-2 text-[10px]">
              <Checkbox
                checked={question.required}
                onCheckedChange={(checked) =>
                  onUpdate({ ...question, required: checked === true })
                }
              />
              <span className="text-muted-foreground">Required</span>
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onDelete}
              className="mt-1 self-start text-[10px] text-destructive hover:text-destructive"
            >
              <TrashIcon className="size-3" aria-hidden="true" />
              Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main controls panel ─────────────────────────────────────────────────── */

export function StudioControls({ formId }: { formId: string }) {
  const draft = useStudioStore((s) => s.snapshots[formId]?.draft);
  const setToken = useStudioStore((s) => s.setToken);
  const setTokens = useStudioStore((s) => s.setTokens);
  const applyStylePreset = useStudioStore((s) => s.applyStylePreset);
  const applyLayoutPreset = useStudioStore((s) => s.applyLayoutPreset);
  const updateLayout = useStudioStore((s) => s.updateLayout);
  const setQuestions = useStudioStore((s) => s.setQuestions);
  const setHeadline = useStudioStore((s) => s.setHeadline);
  const setSubhead = useStudioStore((s) => s.setSubhead);
  const setBrandName = useStudioStore((s) => s.setBrandName);

  if (!draft) return null;

  const t = draft.tokens;
  const layout = draft.layout;

  /* Helpers */
  const setTok = <K extends keyof DesignTokens>(key: K, value: DesignTokens[K]) =>
    setToken(formId, key, value);

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col pb-8">
        {/* ─── Layout ─────────────────────────────────────── */}
        <Section title="Layout" description="Form flow, container, and hero style">
          <div className="grid grid-cols-3 gap-1.5">
            {Object.keys(LAYOUT_PRESETS).map((id) => (
              <LayoutThumbnail
                key={id}
                presetId={id}
                active={draft.layoutPreset === id}
                onClick={() => applyLayoutPreset(formId, id)}
              />
            ))}
          </div>

          <Row label="Flow">
            <SelectField<FlowMode>
              value={layout.flow}
              onChange={(v) => updateLayout(formId, { flow: v })}
              options={[
                { value: "all", label: "All at once" },
                { value: "stepped", label: "Stepped" },
                { value: "cards", label: "Cards" },
                { value: "conversational", label: "Conversational" },
              ]}
            />
          </Row>
          <Row label="Container">
            <SelectField<ContainerMode>
              value={layout.container}
              onChange={(v) => updateLayout(formId, { container: v })}
              options={[
                { value: "boxed", label: "Boxed" },
                { value: "split", label: "Split" },
                { value: "fullbleed", label: "Fullbleed" },
                { value: "centered", label: "Centered" },
              ]}
            />
          </Row>
          <Row label="Hero">
            <SelectField<HeroMode>
              value={layout.hero}
              onChange={(v) => updateLayout(formId, { hero: v })}
              options={[
                { value: "none", label: "None" },
                { value: "top", label: "Top" },
                { value: "side", label: "Side" },
                { value: "floating", label: "Floating" },
              ]}
            />
          </Row>
        </Section>

        <SectionDivider />

        {/* ─── Style presets ──────────────────────────────── */}
        <Section title="Style" description="Quick-start design themes">
          <div className="grid grid-cols-3 gap-1.5">
            {Object.keys(STYLE_PRESETS).map((id) => (
              <StylePresetCard
                key={id}
                id={id}
                active={draft.preset === id}
                onClick={() => applyStylePreset(formId, id)}
              />
            ))}
          </div>
        </Section>

        <SectionDivider />

        {/* ─── Typography ─────────────────────────────────── */}
        <Section title="Typography">
          <Row label="Heading font">
            <SelectField
              value={t.fontHead}
              onChange={(v) => setTok("fontHead", v)}
              options={FONT_CHOICES.map((f) => ({
                value: f.value,
                label: f.label,
              }))}
            />
          </Row>
          <Row label="Body font">
            <SelectField
              value={t.fontBody}
              onChange={(v) => setTok("fontBody", v)}
              options={FONT_CHOICES.map((f) => ({
                value: f.value,
                label: f.label,
              }))}
            />
          </Row>
          <Row label="Heading size">
            <NumberField
              value={t.sizeHead}
              onChange={(v) => setTok("sizeHead", v)}
              min={20}
              max={80}
            />
          </Row>
          <Row label="Body size">
            <NumberField
              value={t.sizeBase}
              onChange={(v) => setTok("sizeBase", v)}
              min={10}
              max={24}
            />
          </Row>
          <Row label="Heading weight">
            <NumberField
              value={t.weightHead}
              onChange={(v) => setTok("weightHead", v)}
              min={100}
              max={900}
              step={100}
            />
          </Row>
        </Section>

        <SectionDivider />

        {/* ─── Colors ─────────────────────────────────────── */}
        <Section title="Colors">
          <ColorInput
            label="Background"
            value={t.bg}
            onChange={(v) => setTok("bg", v)}
          />
          <ColorInput
            label="Surface"
            value={t.surface}
            onChange={(v) => setTok("surface", v)}
          />
          <ColorInput
            label="Text"
            value={t.ink}
            onChange={(v) => setTok("ink", v)}
          />
          <ColorInput
            label="Soft text"
            value={t.inkSoft}
            onChange={(v) => setTok("inkSoft", v)}
          />
          <ColorInput
            label="Line / border"
            value={t.line}
            onChange={(v) => setTok("line", v)}
          />
          <ColorInput
            label="Accent"
            value={t.accent}
            onChange={(v) => setTok("accent", v)}
          />
          <ColorInput
            label="Accent text"
            value={t.accentInk}
            onChange={(v) => setTok("accentInk", v)}
          />
          <Row label="Dark mode">
            <Pills
              options={[
                { value: "false", label: "Light" },
                { value: "true", label: "Dark" },
              ]}
              value={String(t.dark)}
              onChange={(v) => setTok("dark", v === "true")}
            />
          </Row>
        </Section>

        <SectionDivider />

        {/* ─── Shape & density ────────────────────────────── */}
        <Section title="Shape & Density">
          <Row label="Corner radius">
            <NumberField
              value={t.radius}
              onChange={(v) => setTok("radius", v)}
              min={0}
              max={30}
            />
          </Row>
          <Row label="Field shape">
            <Pills<FieldShape>
              options={[
                { value: "rounded", label: "Rounded" },
                { value: "square", label: "Square" },
                { value: "underline", label: "Under" },
                { value: "pill", label: "Pill" },
              ]}
              value={t.fieldShape}
              onChange={(v) => setTok("fieldShape", v)}
            />
          </Row>
          <Row label="Density">
            <Pills<TokenDensity>
              options={[
                { value: "compact", label: "Compact" },
                { value: "default", label: "Default" },
                { value: "cozy", label: "Cozy" },
                { value: "airy", label: "Airy" },
              ]}
              value={t.density}
              onChange={(v) => setTok("density", v)}
            />
          </Row>
          <Row label="Button style">
            <Pills<TokenButtonStyle>
              options={[
                { value: "solid", label: "Solid" },
                { value: "pill", label: "Pill" },
                { value: "block", label: "Block" },
                { value: "ghost", label: "Ghost" },
              ]}
              value={t.buttonStyle}
              onChange={(v) => setTok("buttonStyle", v)}
            />
          </Row>
          <Row label="Shadow">
            <Pills<TokenShadow>
              options={[
                { value: "none", label: "None" },
                { value: "sm", label: "Sm" },
                { value: "soft", label: "Soft" },
                { value: "hard", label: "Hard" },
              ]}
              value={t.shadow}
              onChange={(v) => setTok("shadow", v)}
            />
          </Row>
          <Row label="Texture">
            <Pills<TokenTexture>
              options={[
                { value: "none", label: "None" },
                { value: "grain", label: "Grain" },
                { value: "dots", label: "Dots" },
                { value: "lines", label: "Lines" },
              ]}
              value={t.texture}
              onChange={(v) => setTok("texture", v)}
            />
          </Row>
        </Section>

        <SectionDivider />

        {/* ─── Headline & brand ───────────────────────────── */}
        <Section title="Content">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] text-muted-foreground">
              Headline
            </Label>
            <Input
              value={draft.headline}
              onChange={(e) => setHeadline(formId, e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] text-muted-foreground">
              Subhead
            </Label>
            <Textarea
              value={draft.subhead}
              onChange={(e) => setSubhead(formId, e.target.value)}
              className="min-h-16 resize-none text-[12px] leading-relaxed"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] text-muted-foreground">
              Brand name
            </Label>
            <Input
              value={draft.brandName}
              onChange={(e) => setBrandName(formId, e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </Section>

        <SectionDivider />

        {/* ─── Questions ──────────────────────────────────── */}
        <Section title="Questions" description="Manage form questions and conditional logic">
          <div className="flex flex-col gap-1.5">
            {draft.questions.map((q, i) => (
              <QuestionRow
                key={q.id}
                question={q}
                index={i}
                onUpdate={(updated) => {
                  const next = [...draft.questions];
                  next[i] = updated;
                  setQuestions(formId, next);
                }}
                onDelete={() => {
                  const next = draft.questions.filter((_, j) => j !== i);
                  setQuestions(formId, next);
                }}
              />
            ))}
          </div>

          {/* Add question */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const newId = `q_${Date.now()}`;
              setQuestions(formId, [
                ...draft.questions,
                {
                  id: newId,
                  type: "shorttext",
                  label: "New question",
                  required: false,
                },
              ]);
            }}
            className="w-full border-dashed text-[11px] font-medium text-muted-foreground"
          >
            <PlusIcon className="size-3.5" aria-hidden="true" />
            Add question
          </Button>
        </Section>
      </div>
    </ScrollArea>
  );
}
