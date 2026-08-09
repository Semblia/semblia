"use client";

import { useState, useCallback, useRef } from "react";

type Direction = "forward" | "back";

/**
 * Manages animated step transitions with enter + exit animations.
 *
 * Usage:
 *   const { activeStep, isLeaving, direction, go, isFirstRender } = useAnimatedStep("details");
 *
 *   // Navigate forward: go("verify", "forward")
 *   // Navigate back:    go("details", "back")
 *
 *   // In render:
 *   <div key={activeStep} className={isFirstRender ? "auth-form-enter" : isLeaving ? exitCls : enterCls}>
 *     {activeStep === "details" && <DetailsStep />}
 *     {activeStep === "verify"  && <VerifyStep />}
 *   </div>
 *
 * The `key` prop on the container causes React to remount it when `activeStep`
 * changes, which re-fires the enter animation on the new step.
 */
export function useAnimatedStep<T>(initial: T, exitDuration = 180) {
  const [activeStep, setActiveStep] = useState<T>(initial);
  const [isLeaving, setIsLeaving] = useState(false);
  const [direction, setDirection] = useState<Direction>("forward");
  const [hasTransitioned, setHasTransitioned] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback(
    (next: T, dir: Direction = "forward") => {
      if (isLeaving) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      setHasTransitioned(true);
      setDirection(dir);
      setIsLeaving(true);
      timerRef.current = setTimeout(() => {
        setActiveStep(next);
        setIsLeaving(false);
      }, exitDuration);
    },
    [isLeaving, exitDuration],
  );

  return {
    activeStep,
    isLeaving,
    direction,
    go,
    /** True only before the first `go()` call — use for initial mount animation. */
    isFirstRender: !hasTransitioned,
  };
}
