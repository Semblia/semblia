"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
import { FORM_PRESETS, detectActivePreset, type FormPreset } from "@/lib/collect/presets";
import type { FormConfig } from "@/lib/collect/types";

/* ------------------------------------------------------------------ */
/*  Compact swatch — small color bar showing the preset personality   */
/* ------------------------------------------------------------------ */

function PresetSwatch({ preset }: { preset: FormPreset }) {
  const b = preset.branding;
  const radiusMap = { sharp: "0px", subtle: "2px", rounded: "4px", pill: "9999px" };
  const r = radiusMap[b.cornerRadius];

  return (
    <div
      className="flex h-[52px] w-full flex-col justify-between overflow-hidden rounded-md p-1.5"
      style={{ backgroundColor: b.colors.background }}
    >
      {/* Top: logo dot + title bar */}
      <div className="flex items-center gap-1">
        <div
          className="size-2 shrink-0 rounded-sm"
          style={{ backgroundColor: b.colors.primary }}
        />
        <div
          className="h-[3px] rounded-full"
          style={{ width: 24, backgroundColor: b.colors.foreground, opacity: 0.6 }}
        />
      </div>

      {/* Middle: two field bars */}
      <div className="flex flex-col gap-[3px]">
        {[28, 22].map((w, i) => (
          <div
            key={i}
            className="h-[5px]"
            style={{
              width: w,
              backgroundColor: b.colors.accent,
              opacity: 0.6,
              border:
                b.inputStyle === "outlined" ? `0.5px solid ${b.colors.foreground}18` : "none",
              borderRadius: r,
            }}
          />
        ))}
      </div>

      {/* Bottom: button */}
      <div
        className="h-[5px] w-full"
        style={{
          backgroundColor: b.buttonStyle === "solid" ? b.colors.primary : "transparent",
          border: b.buttonStyle !== "solid" ? `0.5px solid ${b.colors.primary}` : "none",
          borderRadius: r,
          opacity: 0.85,
        }}
      />
    </div>
  );
}

export function PresetGallery({
  slug,
  config,
  onSelect,
}: {
  slug: string;
  config: FormConfig;
  onSelect: (presetId: string) => void;
}) {
  const activeId = detectActivePreset(config);

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {FORM_PRESETS.map((preset) => {
        const isActive = activeId === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset.id)}
            className={cn(
              "group relative flex flex-col items-center gap-1 rounded-md border p-1 text-left transition-all",
              isActive
                ? "border-primary ring-1 ring-primary/20"
                : "border-border/60 hover:border-foreground/20 hover:bg-muted/40"
            )}
          >
            <PresetSwatch preset={preset} />
            <div className="flex items-center gap-0.5">
              {isActive && (
                <CheckIcon className="size-2.5 shrink-0 text-primary" />
              )}
              <span className="truncate text-[9px] font-medium leading-none">
                {preset.name}
              </span>
            </div>
          </button>
        );
      })}

      {/* Custom indicator */}
      {activeId === null && (
        <div className="col-span-4 flex items-center gap-1 rounded-md bg-muted/40 px-2 py-1 text-[9px] text-muted-foreground">
          <div className="size-1 rounded-full bg-foreground/25" />
          Custom
        </div>
      )}
    </div>
  );
}
