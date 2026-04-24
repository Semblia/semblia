"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/lib/collect/studio-store";
import { STYLE_PRESETS, LAYOUT_PRESETS } from "@/lib/collect/studio-presets";
import type { FlowMode, ContainerMode, HeroMode } from "@/lib/collect/studio-types";
import { SectionCollapsible, Row, StudioSelect } from "./studio-primitives";
import { MemoPresetCard, MemoLayoutThumbnail } from "./layout-presets";

/* ─── Layout section ──────────────────────────────────────────────────────── */

export function LayoutSection({ formId }: { formId: string }) {
  const draft = useStudioStore((s) => s.snapshots[formId]?.draft);
  const applyLayoutPreset = useStudioStore((s) => s.applyLayoutPreset);
  const updateLayout = useStudioStore((s) => s.updateLayout);

  if (!draft) return null;
  const layout = draft.layout;

  return (
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
  );
}

/* ─── House styles section ────────────────────────────────────────────────── */

export function HouseStylesSection({ formId }: { formId: string }) {
  const draft = useStudioStore((s) => s.snapshots[formId]?.draft);
  const applyStylePreset = useStudioStore((s) => s.applyStylePreset);

  if (!draft) return null;

  return (
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
  );
}
