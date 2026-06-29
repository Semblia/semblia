"use client";

/**
 * FormCardPreview — a clean, themed mini-mockup of a form per intent.
 * Not a live render: a static miniature with real form structure (title,
 * the intent's signature field, a submit button) tinted by the intent
 * accent. Each intent has a soft gradient page background so the gallery
 * card immediately communicates intent at a glance.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { V2FormIntent } from "@workspace/types";

const ACCENT: Record<V2FormIntent, string> = {
  TESTIMONIAL: "#f59e0b",
  REVIEW: "#eab308",
  PRODUCT_FEEDBACK: "#0ea5e9",
  CUSTOMER_STORY: "#8b5cf6",
  CUSTOM: "#64748b",
};

const SURFACE = "#ffffff";
const INK = "#1f2937";
const SUB = "#cbd5e1";
const LINE = "#e5e7eb";

const STAR_PATH =
  "M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z";

function Stars({ color }: { color: string }) {
  return (
    <div className="flex gap-[2px]" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill={color}>
          <path d={STAR_PATH} />
        </svg>
      ))}
    </div>
  );
}

function Line({ w, strong = false }: { w: string; strong?: boolean }) {
  return (
    <div
      className="rounded-full"
      style={{
        width: w,
        height: strong ? "4px" : "3px",
        background: strong ? INK : SUB,
        opacity: strong ? 0.82 : 0.65,
      }}
      aria-hidden
    />
  );
}

function FieldBox({ h = 14, accent }: { h?: number; accent?: string }) {
  return (
    <div
      className="rounded-[4px] border"
      style={{
        height: h,
        borderColor: accent ? `${accent}22` : LINE,
        background: accent ? `${accent}06` : "#f9fafb",
      }}
      aria-hidden
    />
  );
}

function IntentBody({
  intent,
  accent,
}: {
  intent: V2FormIntent;
  accent: string;
}) {
  switch (intent) {
    case "TESTIMONIAL":
      return (
        <div className="space-y-2">
          <Stars color={accent} />
          <FieldBox h={28} accent={accent} />
          <FieldBox h={13} />
        </div>
      );
    case "REVIEW":
      return (
        <div className="space-y-2">
          <Stars color={accent} />
          <FieldBox h={20} accent={accent} />
          <FieldBox h={13} />
        </div>
      );
    case "PRODUCT_FEEDBACK":
      return (
        <div className="space-y-2">
          <div className="flex gap-1" aria-hidden>
            {["36%", "28%", "24%"].map((w, i) => (
              <div
                key={i}
                className="h-[11px] rounded-full border"
                style={{
                  width: w,
                  borderColor: i === 0 ? accent : LINE,
                  background: i === 0 ? `${accent}1e` : "#f9fafb",
                }}
              />
            ))}
          </div>
          <FieldBox h={24} accent={accent} />
        </div>
      );
    case "CUSTOMER_STORY":
      return (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1">
              <Line w={["28%", "24%", "30%"][i]} />
              <FieldBox h={12} />
            </div>
          ))}
        </div>
      );
    case "CUSTOM":
    default:
      return (
        <div className="space-y-2">
          <FieldBox h={13} />
          <FieldBox h={24} accent={accent} />
        </div>
      );
  }
}

export const FormCardPreview = React.memo(function FormCardPreview({
  intent,
  inactive = false,
  className,
}: {
  intent: V2FormIntent;
  inactive?: boolean;
  className?: string;
}) {
  const accent = ACCENT[intent] ?? ACCENT.CUSTOM;

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden p-4 transition-opacity",
        inactive && "opacity-45 grayscale",
        className,
      )}
      style={{
        background: `linear-gradient(145deg, ${accent}14 0%, #f0f1f3 60%)`,
      }}
      role="img"
      aria-label={`${intent.toLowerCase()} form preview`}
    >
      {/* Hosted-form card */}
      <div
        className="w-[80%] max-w-[240px] rounded-lg border p-3.5"
        style={{
          background: SURFACE,
          borderColor: `${accent}20`,
          boxShadow: `0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04), 0 0 0 1px ${accent}10`,
        }}
      >
        {/* Header */}
        <div className="mb-3 space-y-1.5">
          <Line w="64%" strong />
          <Line w="84%" />
        </div>
        <IntentBody intent={intent} accent={accent} />
        {/* Submit button */}
        <div
          className="mt-3 h-[12px] w-[46%] rounded-full"
          style={{ background: accent, opacity: 0.88 }}
          aria-hidden
        />
      </div>
    </div>
  );
});
