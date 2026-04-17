"use client";

import * as React from "react";
import { DeviceFrame } from "@/components/collect/device-frame";
import { FormPreview } from "@/components/collect/form-preview";
import type { FormConfig } from "@/lib/collect/types";

export function EditorPreview({ config }: { config: FormConfig }) {
  return (
    <div
      data-slot="editor-preview"
      className="flex size-full items-center justify-center overflow-hidden bg-[color:var(--preview-canvas,theme(colors.muted.DEFAULT)/0.3)] p-6"
      style={{
        backgroundImage:
          "radial-gradient(color-mix(in srgb, currentColor 8%, transparent) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
        color: "hsl(var(--muted-foreground) / 0.4)",
      }}
    >
      <DeviceFrame device="mobile">
        <FormPreview config={config} density="cozy" showPreviewToggle />
      </DeviceFrame>
    </div>
  );
}
