"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/lib/collect/studio-store";
import { STYLE_PRESETS } from "@/lib/collect/studio-presets";
import type { DesignTokens } from "@/lib/collect/studio-types";
import { SectionCollapsible } from "./studio-primitives";

function PresetCard({
  p,
  selected,
  onClick,
}: {
  p: {
    label: string;
    sub: string;
    tokens: DesignTokens;
  };
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative cursor-pointer rounded-lg border p-2.5 text-left transition-colors duration-150",
        selected
          ? "border-foreground bg-card"
          : "border-border bg-transparent hover:border-muted-foreground/40 hover:bg-card",
      )}
    >
      <div className="mb-2 flex gap-1">
        <span
          className="size-4 rounded-sm border border-black/8"
          style={{ background: p.tokens.bg }}
        />
        <span
          className="size-4 rounded-sm border border-black/8"
          style={{ background: p.tokens.surface }}
        />
        <span
          className="size-4 rounded-sm"
          style={{ background: p.tokens.ink }}
        />
        <span
          className="size-4 rounded-sm"
          style={{ background: p.tokens.accent }}
        />
      </div>
      <div className="text-[12.5px] font-semibold text-foreground tracking-tight">
        {p.label}
      </div>
      <div className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">
        {p.sub}
      </div>
    </button>
  );
}

const MemoPresetCard = React.memo(PresetCard);

export function HouseStylesSection({ formId }: { formId: string }) {
  const draft = useStudioStore((s) => s.snapshots[formId]?.draft);
  const applyStylePreset = useStudioStore((s) => s.applyStylePreset);

  if (!draft) return null;

  return (
    <SectionCollapsible title="House styles">
      <div className="studio-presets-grid grid grid-cols-2 gap-2">
        {Object.entries(STYLE_PRESETS).map(([key, preset]) => (
          <MemoPresetCard
            key={key}
            p={preset}
            selected={draft.preset === key}
            onClick={() => applyStylePreset(formId, key)}
          />
        ))}
      </div>
    </SectionCollapsible>
  );
}
