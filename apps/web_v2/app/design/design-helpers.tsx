"use client";

import * as React from "react";
import { Separator } from "@/components/ui/separator";

/* ─── Section wrapper ─────────────────────────────────────────────────────── */

export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Separator />
      <div>{children}</div>
    </section>
  );
}

/* ─── Token swatch ────────────────────────────────────────────────────────── */

export function Swatch({
  variable,
  label,
  textClass,
}: {
  variable: string;
  label: string;
  textClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-14 w-full rounded-lg border border-border/60 shadow-sm"
        style={{ background: `var(${variable})` }}
      />
      <div className="space-y-0.5">
        <p className={`text-xs font-medium ${textClass ?? "text-foreground"}`}>
          {label}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {variable}
        </p>
      </div>
    </div>
  );
}

/* ─── Demo card wrapper ───────────────────────────────────────────────────── */

export function Demo({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className={`flex flex-wrap items-start gap-3 ${className ?? ""}`}>
        {children}
      </div>
    </div>
  );
}
