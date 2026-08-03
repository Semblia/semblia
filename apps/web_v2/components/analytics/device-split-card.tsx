"use client";

/**
 * DeviceSplit — which devices widgets load on.
 *
 * The old card computed a count for every segment and then rendered only the
 * percentage, so one desktop visit read "Desktop 100%", indistinguishable from
 * a million. It also assigned Tablet `--color-muted-foreground`, the token used
 * for secondary *text* throughout the app, producing a swatch the same colour
 * as the labels beside it.
 *
 * Kept from the original, because it was right: `unknown` stays in the
 * denominator so known-device shares aren't inflated, and every row carries a
 * distinguishing icon as well as a colour.
 */

import {
  DeviceMobile,
  DeviceTablet,
  Monitor,
  Question,
} from "@phosphor-icons/react";
import type { DeviceSplit as DeviceSplitData } from "@/lib/analytics/types";
import {
  BreakdownList,
  ProportionBar,
  type BreakdownSegment,
} from "./breakdown";
import { fmtCount } from "@/lib/format";

export function DeviceSplitBreakdown({ data }: { data: DeviceSplitData }) {
  const total = data.mobile + data.tablet + data.desktop + data.unknown;

  const segments: BreakdownSegment[] = [
    {
      key: "mobile",
      label: "Mobile",
      value: data.mobile,
      color: "var(--color-brand)",
      icon: DeviceMobile,
    },
    {
      key: "desktop",
      label: "Desktop",
      value: data.desktop,
      color: "var(--color-chart-3)",
      icon: Monitor,
    },
    {
      key: "tablet",
      label: "Tablet",
      value: data.tablet,
      color: "var(--color-chart-2)",
      icon: DeviceTablet,
    },
    {
      key: "unknown",
      label: "Unreported",
      value: data.unknown,
      color: "var(--color-chart-5)",
      icon: Question,
    },
  ];

  return (
    <div className="space-y-4">
      <ProportionBar
        segments={segments}
        total={total}
        label={`Device split across ${fmtCount(total)} loads`}
      />
      <BreakdownList segments={segments} total={total} />
    </div>
  );
}
