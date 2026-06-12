"use client";

/**
 * StudioMark — shared identity block for the Semblia full-screen studios
 * (Widget Studio + Collect / Form Studio). Each studio keeps its own name
 * and icon, but the typography, sizing, spacing, and version-tag style are
 * unified here so they read as one product family.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface StudioMarkProps {
  /** Studio display name, e.g. "Widget Studio". */
  name: string;
  /** Version label, e.g. "0.1". Renders as "v0.1 · preview" in mono caps. */
  version?: string;
  /** Status caption next to the version. Defaults to "preview". */
  status?: string;
  /** The icon to render in the leading 28px square. */
  icon: React.ReactNode;
  /** Optional className for the outer container. */
  className?: string;
}

export function StudioMark({
  name,
  version,
  status = "preview",
  icon,
  className,
}: StudioMarkProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex size-7 items-center justify-center rounded-lg bg-foreground/95 text-background">
        {icon}
      </div>
      <div className="leading-tight">
        <div className="text-[13px] font-bold tracking-tight text-foreground">
          {name}
        </div>
        {(version || status) && (
          <div className="mt-px font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            {version ? `v${version}` : null}
            {version && status ? " · " : null}
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
