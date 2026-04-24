"use client";

import * as React from "react";
import { useStudioStore } from "@/lib/collect/studio-store";
import type { StudioDevice } from "@/lib/collect/studio-types";
import { Button } from "@/components/ui/button";
import { Pills } from "./studio-primitives";
import { BrandLogo } from "@/components/brand/brand-logo";
import { HouseStylesSection } from "./controls-style-presets";
import { TypographySection, ColorSection } from "./controls-design";
import { ShapeSection } from "./controls-shape";

/* ─── Main controls panel ─────────────────────────────────────────────────── */

export const StudioControls = React.memo(function StudioControls({
  formId,
}: {
  formId: string;
}) {
  const draft = useStudioStore((s) => s.snapshots[formId]?.draft);
  const randomize = useStudioStore((s) => s.randomize);
  const reset = useStudioStore((s) => s.reset);
  const device = useStudioStore((s) => s.device);
  const setDevice = useStudioStore((s) => s.setDevice);

  const handleRandomize = React.useCallback(
    () => randomize(formId),
    [randomize, formId],
  );
  const handleReset = React.useCallback(() => reset(formId), [reset, formId]);

  const devices: { key: StudioDevice; label: string }[] = [
    { key: "desktop", label: "Desktop" },
    { key: "tablet", label: "Tablet" },
    { key: "mobile", label: "Mobile" },
  ];

  if (!draft) return null;

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

      <div className="px-5 pb-3 pt-2">
        <div className="rounded-xl border border-border/70 bg-card/70 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Static shell mode. Styling controls only.
        </div>
      </div>

      <HouseStylesSection formId={formId} />
      <TypographySection formId={formId} />
      <ColorSection formId={formId} />
      <ShapeSection formId={formId} />

      <div className="h-15" />
    </div>
  );
});
