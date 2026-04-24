"use client";

import * as React from "react";
import { useStudioStore } from "@/lib/collect/studio-store";
import { FONT_CHOICES } from "@/lib/collect/studio-presets";
import type { DesignTokens } from "@/lib/collect/studio-types";
import {
  SectionCollapsible,
  Row,
  StudioSelect,
  StudioNumberInput,
  StudioColorInput,
  Pills,
} from "./studio-primitives";

/* ─── Typography section ──────────────────────────────────────────────────── */

export function TypographySection({ formId }: { formId: string }) {
  const t = useStudioStore((s) => s.snapshots[formId]?.draft?.tokens);
  const setToken = useStudioStore((s) => s.setToken);

  if (!t) return null;

  const setTok = <K extends keyof DesignTokens>(k: K, v: DesignTokens[K]) =>
    setToken(formId, k, v);

  return (
    <SectionCollapsible title="Typography">
      <Row label="Heading font">
        <StudioSelect
          value={t.fontHead}
          onChange={(v) => setTok("fontHead", v)}
          options={FONT_CHOICES.map((f) => ({ value: f.value, label: f.label }))}
        />
      </Row>
      <Row label="Body font">
        <StudioSelect
          value={t.fontBody}
          onChange={(v) => setTok("fontBody", v)}
          options={FONT_CHOICES.map((f) => ({ value: f.value, label: f.label }))}
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
  );
}

/* ─── Color section ───────────────────────────────────────────────────────── */

export function ColorSection({ formId }: { formId: string }) {
  const t = useStudioStore((s) => s.snapshots[formId]?.draft?.tokens);
  const setToken = useStudioStore((s) => s.setToken);

  if (!t) return null;

  const setTok = <K extends keyof DesignTokens>(k: K, v: DesignTokens[K]) =>
    setToken(formId, k, v);

  return (
    <SectionCollapsible title="Color">
      <StudioColorInput label="Background" value={t.bg} onChange={(v) => setTok("bg", v)} />
      <StudioColorInput label="Surface" value={t.surface} onChange={(v) => setTok("surface", v)} />
      <StudioColorInput label="Ink" value={t.ink} onChange={(v) => setTok("ink", v)} />
      <StudioColorInput label="Ink soft" value={t.inkSoft} onChange={(v) => setTok("inkSoft", v)} />
      <StudioColorInput label="Line" value={t.line} onChange={(v) => setTok("line", v)} />
      <StudioColorInput label="Accent" value={t.accent} onChange={(v) => setTok("accent", v)} />
      <StudioColorInput label="Accent ink" value={t.accentInk} onChange={(v) => setTok("accentInk", v)} />
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
  );
}
