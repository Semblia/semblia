"use client";

import * as React from "react";
import { useStudioDraft } from "@/lib/collect/studio-draft-context";
import type { StudioDevice } from "@/lib/collect/studio-types";
import { Button } from "@/components/ui/button";
import { StudioMark } from "@/components/shared";
import { Pills } from "./studio-primitives";
import { BrandLogo } from "@/components/brand/brand-logo";
import { HouseStylesSection } from "./controls-style-presets";
import { TypographySection, ColorSection } from "./controls-design";
import { ShapeSection } from "./controls-shape";

/* ─── Main controls panel ─────────────────────────────────────────────────── */

export const StudioControls = React.memo(function StudioControls() {
  const { draft, randomize, reset, device, setDevice } = useStudioDraft();

  const devices: { key: StudioDevice; label: string }[] = [
    { key: "desktop", label: "Desktop" },
    { key: "tablet", label: "Tablet" },
    { key: "mobile", label: "Mobile" },
  ];

  if (!draft) return null;

  return (
    <div className="h-full overflow-y-auto bg-sidebar font-sans [container-type:inline-size] [container-name:studio-panel]">
      {/* ─── Header ──────────────────────────────────────── */}
      <StudioMark
        className="px-5 pt-4.5 pb-3"
        name="Form Studio"
        status="Brand & style"
        icon={
          <BrandLogo
            size={16}
            variant="default"
            className="invert dark:invert-0"
            alt=""
          />
        }
      />

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
          onClick={randomize}
        >
          ↻ Remix
        </Button>
        <Button
          variant="ghost"
          className="flex-1 text-[12.5px] font-semibold text-muted-foreground"
          onClick={reset}
        >
          ↺ Reset
        </Button>
      </div>

      <div className="pb-1.5" />

      <HouseStylesSection />
      <TypographySection />
      <ColorSection />
      <ShapeSection />

      <div className="h-15" />
    </div>
  );
});
