"use client";

/**
 * FormCardPreview — static SVG thumbnail keyed off the saved form layout.
 * The gallery stays fast and non-dynamic, while each form card still hints
 * at its actual flow, container, and hero treatment.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { LayoutConfig } from "@/lib/collect/studio-types";

interface FormCardPreviewProps {
  layout?: LayoutConfig | null;
  inactive?: boolean;
  className?: string;
}

const FALLBACK_LAYOUT: LayoutConfig = {
  flow: "all",
  container: "boxed",
  hero: "top",
  mobileFlow: "auto",
  mobileContainer: "auto",
  stickyProgress: false,
  showBrandPill: true,
};

function Field({
  x,
  y,
  w,
  h = 9,
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
}) {
  return (
    <>
      <rect
        x={x}
        y={y - 6}
        width={Math.max(28, w * 0.32)}
        height={3}
        rx={1.5}
        fill="var(--muted-foreground)"
        opacity="0.35"
      />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={Math.min(4, h / 2)}
        fill="var(--background)"
        stroke="var(--border)"
        strokeWidth="0.8"
      />
    </>
  );
}

function ButtonBar({ x, y, w = 54 }: { x: number; y: number; w?: number }) {
  return (
    <>
      <rect
        x={x}
        y={y}
        width={w}
        height={11}
        rx={5.5}
        fill="var(--primary)"
        opacity="0.88"
      />
      <rect
        x={x + 8}
        y={y + 3.5}
        width={Math.max(20, w - 16)}
        height={4}
        rx={2}
        fill="var(--primary-foreground)"
        opacity="0.7"
      />
    </>
  );
}

function LayoutFrame({
  layout,
  children,
}: {
  layout: LayoutConfig;
  children: React.ReactNode;
}) {
  const surface =
    layout.container === "fullbleed"
      ? { x: 8, y: 8, w: 184, h: 104, r: 18 }
      : layout.container === "centered"
        ? { x: 28, y: 10, w: 144, h: 100, r: 20 }
        : { x: 16, y: 12, w: 168, h: 96, r: 18 };

  return (
    <>
      <rect
        x={surface.x}
        y={surface.y}
        width={surface.w}
        height={surface.h}
        rx={surface.r}
        fill="var(--card)"
        stroke="var(--border)"
        strokeWidth="0.9"
      />

      {layout.container === "split" && (
        <>
          <rect
            x={surface.x}
            y={surface.y}
            width={54}
            height={surface.h}
            rx={surface.r}
            fill="var(--muted)"
            opacity="0.55"
          />
          <rect
            x={surface.x + 53}
            y={surface.y + 10}
            width={1}
            height={surface.h - 20}
            fill="var(--border)"
            opacity="0.8"
          />
        </>
      )}

      {layout.hero === "top" && (
        <rect
          x={surface.x + 12}
          y={surface.y + 12}
          width={surface.w - 24}
          height={18}
          rx={8}
          fill="var(--muted)"
          opacity="0.5"
        />
      )}

      {layout.hero === "side" && layout.container !== "split" && (
        <rect
          x={surface.x + 12}
          y={surface.y + 12}
          width={44}
          height={surface.h - 24}
          rx={14}
          fill="var(--muted)"
          opacity="0.45"
        />
      )}

      {layout.hero === "floating" && (
        <rect
          x={surface.x + 18}
          y={surface.y - 6}
          width={70}
          height={16}
          rx={8}
          fill="var(--background)"
          stroke="var(--border)"
          strokeWidth="0.8"
        />
      )}

      {children}
    </>
  );
}

function AllFlowPreview({ layout }: { layout: LayoutConfig }) {
  const x =
    layout.container === "split" ? 80 : layout.hero === "side" ? 68 : 32;
  const w =
    layout.container === "fullbleed"
      ? 136
      : layout.container === "centered"
        ? 108
        : 120;
  const y = layout.hero === "top" ? 44 : 28;

  return (
    <>
      <Field x={x} y={y} w={w} />
      <Field x={x} y={y + 21} w={w} />
      <Field x={x} y={y + 42} w={w} h={18} />
      <ButtonBar x={x + w - 54} y={y + 67} />
    </>
  );
}

function SteppedFlowPreview({ layout }: { layout: LayoutConfig }) {
  const x = layout.container === "split" ? 80 : 34;
  const w =
    layout.container === "fullbleed"
      ? 132
      : layout.container === "centered"
        ? 104
        : 118;
  const y = layout.hero === "top" ? 46 : 26;

  return (
    <>
      <rect
        x={x}
        y={y - 18}
        width={w}
        height={5}
        rx={2.5}
        fill="var(--muted)"
      />
      <rect
        x={x}
        y={y - 18}
        width={Math.max(36, w * 0.42)}
        height={5}
        rx={2.5}
        fill="var(--primary)"
        opacity="0.82"
      />
      <Field x={x} y={y} w={w} h={15} />
      <Field x={x} y={y + 27} w={w * 0.72} />
      <ButtonBar x={x + w - 54} y={y + 49} />
    </>
  );
}

function CardsFlowPreview({ layout }: { layout: LayoutConfig }) {
  const centerX = layout.container === "split" ? 116 : 100;
  const centerY = layout.hero === "top" ? 56 : 52;

  return (
    <>
      <rect
        x={centerX - 54}
        y={centerY - 22}
        width={72}
        height={48}
        rx={14}
        fill="var(--background)"
        stroke="var(--border)"
        strokeWidth="0.8"
        opacity="0.48"
      />
      <rect
        x={centerX - 42}
        y={centerY - 28}
        width={86}
        height={56}
        rx={16}
        fill="var(--card)"
        stroke="var(--border)"
        strokeWidth="0.9"
      />
      <Field x={centerX - 28} y={centerY - 6} w={58} />
      <Field x={centerX - 28} y={centerY + 16} w={58} />
      <ButtonBar x={centerX - 4} y={centerY + 38} w={34} />
    </>
  );
}

function ConversationalFlowPreview({ layout }: { layout: LayoutConfig }) {
  const x = layout.container === "split" ? 80 : 34;
  const w =
    layout.container === "fullbleed"
      ? 132
      : layout.container === "centered"
        ? 104
        : 118;
  const y = layout.hero === "top" ? 44 : 28;

  return (
    <>
      <rect
        x={x}
        y={y}
        width={w * 0.58}
        height={14}
        rx={7}
        fill="var(--muted)"
        opacity="0.55"
      />
      <rect
        x={x + w * 0.24}
        y={y + 20}
        width={w * 0.52}
        height={14}
        rx={7}
        fill="var(--background)"
        stroke="var(--border)"
        strokeWidth="0.8"
      />
      <rect
        x={x}
        y={y + 44}
        width={w}
        height={16}
        rx={8}
        fill="var(--background)"
        stroke="var(--border)"
        strokeWidth="0.8"
      />
      <rect
        x={x + w - 24}
        y={y + 47}
        width={18}
        height={10}
        rx={5}
        fill="var(--primary)"
        opacity="0.82"
      />
    </>
  );
}

function FlowPreview({ layout }: { layout: LayoutConfig }) {
  switch (layout.flow) {
    case "stepped":
      return <SteppedFlowPreview layout={layout} />;
    case "cards":
      return <CardsFlowPreview layout={layout} />;
    case "conversational":
      return <ConversationalFlowPreview layout={layout} />;
    default:
      return <AllFlowPreview layout={layout} />;
  }
}

export function FormCardPreview({
  layout,
  inactive = false,
  className,
}: FormCardPreviewProps) {
  const previewLayout = layout ?? FALLBACK_LAYOUT;

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden bg-muted/30",
        inactive && "opacity-50",
        className,
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 200 120"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
      >
        <LayoutFrame layout={previewLayout}>
          <FlowPreview layout={previewLayout} />
        </LayoutFrame>
      </svg>
    </div>
  );
}
