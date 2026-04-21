"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/lib/collect/studio-store";
import {
  STYLE_PRESETS,
  COMMUNITY_PRESETS,
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
} from "@/lib/collect/studio-types";
import { Button } from "@/components/ui/button";

import {
  Row,
  SectionCollapsible,
  StudioTextInput,
  StudioNumberInput,
  StudioColorInput,
  StudioSelect,
  Pills,
} from "./studio-primitives";
import { MemoPresetCard, MemoLayoutThumbnail } from "./layout-presets";
import { MemoQuestionRow, AddQuestion } from "./question-editor";
import { BrandLogo } from "@/components/brand/brand-logo";

/* ─── Main controls panel ─────────────────────────────────────────────────── */

export const StudioControls = React.memo(function StudioControls({
  formId,
}: {
  formId: string;
}) {
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
  const handleRandomize = React.useCallback(
    () => randomize(formId),
    [randomize, formId],
  );
  const handleReset = React.useCallback(() => reset(formId), [reset, formId]);

  if (!draft) return null;

  const t = draft.tokens;
  const layout = draft.layout;

  const setTok = <K extends keyof DesignTokens>(
    key: K,
    value: DesignTokens[K],
  ) => setToken(formId, key, value);

  const devices: { key: StudioDevice; label: string }[] = [
    { key: "desktop", label: "Desktop" },
    { key: "tablet", label: "Tablet" },
    { key: "mobile", label: "Mobile" },
  ];

  return (
    <div className="h-full overflow-y-auto bg-sidebar font-sans [container-type:inline-size] [container-name:studio-panel]">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-5 pt-4.5 pb-3">
        <div className="flex size-7 items-center justify-center rounded-lg bg-foreground">
          <BrandLogo
            size={16}
            variant="default"
            className="invert dark:invert-0"
            alt=""
          />
        </div>{" "}
        <div>
          <div className="text-sm font-bold text-foreground tracking-tight">
            Tresta Studio
          </div>
          <div className="mt-px font-mono text-[9.5px] text-muted-foreground tracking-wider">
            v0.5 · PREVIEW
          </div>
        </div>
      </div>

      {/* ─── Device toggle ───────────────────────────────── */}
      <div className="px-5 pb-3.5">
        <Pills
          options={devices.map((d) => ({ value: d.key, label: d.label }))}
          value={device}
          onChange={(v) => setDevice(v as StudioDevice)}
        />
      </div>

      {/* ─── Remix / Reset ───────────────────────────────── */}
      <div className="flex gap-2 px-5 pb-1.5">
        <Button
          variant="outline"
          className="flex-1 text-[12.5px] font-semibold"
          onClick={handleRandomize}
        >
          ↻ Remix
        </Button>
        <Button
          variant="ghost"
          className="flex-1 text-[12.5px] font-semibold text-muted-foreground"
          onClick={handleReset}
        >
          ↺ Reset
        </Button>
      </div>

      {/* ─── Layout ──────────────────────────────────────── */}
      <SectionCollapsible title="Layout">
        <div className="studio-layout-grid mb-3.5 grid grid-cols-3 gap-1.5">
          {Object.keys(LAYOUT_PRESETS).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => applyLayoutPreset(formId, id)}
              className={cn(
                "cursor-pointer rounded-md border p-1.5 transition-colors duration-150",
                draft.layoutPreset === id
                  ? "border-foreground bg-card"
                  : "border-border bg-transparent hover:border-muted-foreground/40 hover:bg-card",
              )}
            >
              <MemoLayoutThumbnail
                kind={id}
                selected={draft.layoutPreset === id}
              />
              <div className="mt-1 text-center font-mono text-[9.5px] text-foreground/70 tracking-wide">
                {LAYOUT_PRESETS[id].label}
              </div>
            </button>
          ))}
        </div>
        <Row label="Flow">
          <StudioSelect<FlowMode>
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
          <StudioSelect<ContainerMode>
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
          <StudioSelect<HeroMode>
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
      </SectionCollapsible>

      {/* ─── House styles ────────────────────────────────── */}
      <SectionCollapsible title="House styles">
        <div className="studio-presets-grid grid grid-cols-2 gap-2">
          {Object.entries(STYLE_PRESETS).map(([k, p]) => (
            <MemoPresetCard
              key={k}
              p={p}
              selected={draft.preset === k}
              onClick={() => applyStylePreset(formId, k)}
            />
          ))}
        </div>
      </SectionCollapsible>

      {/* ─── Community presets ────────────────────────────── */}
      <SectionCollapsible title="Community" tag="NEW" defaultOpen={false}>
        <div className="studio-presets-grid grid grid-cols-2 gap-2">
          {Object.entries(COMMUNITY_PRESETS).map(([k, p]) => (
            <MemoPresetCard
              key={k}
              p={p}
              selected={draft.preset === k}
              onClick={() => applyStylePreset(formId, k)}
              showAuthor
            />
          ))}
        </div>
      </SectionCollapsible>

      {/* ─── Typography ──────────────────────────────────── */}
      <SectionCollapsible title="Typography">
        <Row label="Heading font">
          <StudioSelect
            value={t.fontHead}
            onChange={(v) => setTok("fontHead", v)}
            options={FONT_CHOICES.map((f) => ({
              value: f.value,
              label: f.label,
            }))}
          />
        </Row>
        <Row label="Body font">
          <StudioSelect
            value={t.fontBody}
            onChange={(v) => setTok("fontBody", v)}
            options={FONT_CHOICES.map((f) => ({
              value: f.value,
              label: f.label,
            }))}
          />
        </Row>
        <Row label="Heading size" hint={`${t.sizeHead}px`}>
          <StudioNumberInput
            value={t.sizeHead}
            onChange={(v) => setTok("sizeHead", v)}
            min={20}
            max={80}
          />
        </Row>
        <Row label="Body size" hint={`${t.sizeBase}px`}>
          <StudioNumberInput
            value={t.sizeBase}
            onChange={(v) => setTok("sizeBase", v)}
            min={10}
            max={24}
          />
        </Row>
        <Row label="Heading weight" hint={String(t.weightHead)}>
          <StudioNumberInput
            value={t.weightHead}
            onChange={(v) => setTok("weightHead", v)}
            min={100}
            max={900}
            step={100}
          />
        </Row>
        <Row label="Tracking" hint={`${t.trackingHead}em`}>
          <StudioNumberInput
            value={t.trackingHead}
            onChange={(v) => setTok("trackingHead", v)}
            min={-0.06}
            max={0.06}
            step={0.005}
          />
        </Row>
      </SectionCollapsible>

      {/* ─── Color ───────────────────────────────────────── */}
      <SectionCollapsible title="Color">
        <StudioColorInput
          label="Background"
          value={t.bg}
          onChange={(v) => setTok("bg", v)}
        />
        <StudioColorInput
          label="Surface"
          value={t.surface}
          onChange={(v) => setTok("surface", v)}
        />
        <StudioColorInput
          label="Ink"
          value={t.ink}
          onChange={(v) => setTok("ink", v)}
        />
        <StudioColorInput
          label="Ink soft"
          value={t.inkSoft}
          onChange={(v) => setTok("inkSoft", v)}
        />
        <StudioColorInput
          label="Line"
          value={t.line}
          onChange={(v) => setTok("line", v)}
        />
        <StudioColorInput
          label="Accent"
          value={t.accent}
          onChange={(v) => setTok("accent", v)}
        />
        <StudioColorInput
          label="Accent ink"
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
      </SectionCollapsible>

      {/* ─── Shape & density ─────────────────────────────── */}
      <SectionCollapsible title="Shape & density">
        <Row label="Corner radius" hint={`${t.radius}px`}>
          <StudioNumberInput
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
      </SectionCollapsible>

      {/* ─── Content ─────────────────────────────────────── */}
      <SectionCollapsible title="Content">
        <Row label="Headline">
          <StudioTextInput
            value={draft.headline}
            onChange={(v) => setHeadline(formId, v)}
          />
        </Row>
        <Row label="Subhead">
          <textarea
            value={draft.subhead}
            onChange={(e) => setSubhead(formId, e.target.value)}
            rows={3}
            className="w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </Row>
        <Row label="Brand name">
          <StudioTextInput
            value={draft.brandName}
            onChange={(v) => setBrandName(formId, v)}
          />
        </Row>
      </SectionCollapsible>

      {/* ─── Questions & Logic ───────────────────────────── */}
      <SectionCollapsible
        title="Questions & Logic"
        tag={String(draft.questions.length)}
      >
        <div className="mb-3 flex flex-col gap-2">
          {draft.questions.map((q, i) => (
            <MemoQuestionRow
              key={q.id}
              q={q}
              index={i}
              total={draft.questions.length}
              questions={draft.questions}
              onUpdate={(patch) => {
                const next = [...draft.questions];
                next[i] = { ...next[i], ...patch };
                setQuestions(formId, next);
              }}
              onRemove={() =>
                setQuestions(
                  formId,
                  draft.questions.filter((_, j) => j !== i),
                )
              }
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
        <AddQuestion
          onAdd={(type) => {
            setQuestions(formId, [
              ...draft.questions,
              {
                id: `q_${Date.now()}`,
                type: type as StudioQuestion["type"],
                label: "New question",
                required: false,
              },
            ]);
          }}
        />
      </SectionCollapsible>

      <div className="h-15" />
    </div>
  );
});
