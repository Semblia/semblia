"use client";

import * as React from "react";
import { PanelSection, Row, Segmented } from "./controls";

/**
 * FinishSection — owner token control over the template recipe (2026-07-17).
 * Non-structural only: shape, density, surface treatment. `null` = follow the
 * template. Structurally identical to forms-core `FormTuning` and
 * widgets-core `WidgetTuning`, so one section serves both studios.
 */
export interface FinishTuning {
  radius: 0 | 1 | 2 | 3 | 4 | null;
  density: "compact" | "cozy" | "spacious" | null;
  surfaceStyle: "flat" | "bordered" | "elevated" | null;
}

type RadiusChoice = "auto" | "0" | "1" | "2" | "3" | "4";
type DensityChoice = "auto" | "compact" | "cozy" | "spacious";
type SurfaceChoice = "auto" | "flat" | "bordered" | "elevated";

const RADIUS_OPTIONS: ReadonlyArray<{ value: RadiusChoice; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "0", label: "0" },
  { value: "1", label: "8" },
  { value: "2", label: "14" },
  { value: "3", label: "20" },
  { value: "4", label: "28" },
];

const UNSET: FinishTuning = { radius: null, density: null, surfaceStyle: null };

export function FinishSection({
  value: valueProp,
  onChange,
}: {
  /** Optional so pre-tuning persisted drafts can't crash the panel. */
  value: FinishTuning | undefined;
  onChange: (next: FinishTuning) => void;
}) {
  const value = valueProp ?? UNSET;
  return (
    <PanelSection title="Finish">
      <Row label="Corners">
        <Segmented<RadiusChoice>
          ariaLabel="Corner radius"
          value={
            value.radius === null ? "auto" : (`${value.radius}` as RadiusChoice)
          }
          onChange={(v) =>
            onChange({
              ...value,
              radius:
                v === "auto" ? null : (Number(v) as FinishTuning["radius"]),
            })
          }
          options={RADIUS_OPTIONS}
        />
      </Row>
      <Row label="Density">
        <Segmented<DensityChoice>
          ariaLabel="Density"
          value={value.density ?? "auto"}
          onChange={(v) =>
            onChange({ ...value, density: v === "auto" ? null : v })
          }
          options={[
            { value: "auto", label: "Auto" },
            { value: "compact", label: "Compact" },
            { value: "cozy", label: "Cozy" },
            { value: "spacious", label: "Airy" },
          ]}
        />
      </Row>
      <Row label="Surface">
        <Segmented<SurfaceChoice>
          ariaLabel="Surface style"
          value={value.surfaceStyle ?? "auto"}
          onChange={(v) =>
            onChange({ ...value, surfaceStyle: v === "auto" ? null : v })
          }
          options={[
            { value: "auto", label: "Auto" },
            { value: "flat", label: "Flat" },
            { value: "bordered", label: "Border" },
            { value: "elevated", label: "Shadow" },
          ]}
        />
      </Row>
      <p className="text-[11px] leading-relaxed text-muted-foreground/80">
        Auto follows the template. Overrides retune the finish — corners in px,
        spacing, surface — never the structure.
      </p>
    </PanelSection>
  );
}
