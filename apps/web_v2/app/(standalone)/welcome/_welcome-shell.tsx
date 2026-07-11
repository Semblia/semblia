"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { ArrowLeft, Check } from "@phosphor-icons/react";
import { AuthShell } from "@/components/auth/auth-shell";
import { cn } from "@/lib/utils";
import { ONBOARD_STEPS, type OnboardStep } from "./steps/constants";

interface WelcomeShellProps {
  current: OnboardStep;
  children: React.ReactNode;
  /** Called when the user clicks the back button. Omit to hide the button. */
  onBack?: () => void;
}

/**
 * Onboarding frame — the auth shell with a progress rail in place of the
 * Collect/Curate/Embed timeline. Reusing the auth frame is deliberate: the user
 * crosses from sign-up into setup without the room changing around them.
 *
 * The form pane top-anchors (`align="top"`) so a tall step (goals) and a short
 * one (profile) don't recenter and jump; the pane scrolls, the page never does.
 */
export function WelcomeShell({ current, children, onBack }: WelcomeShellProps) {
  const currentIndex = Math.max(
    0,
    ONBOARD_STEPS.findIndex((s) => s.id === current),
  );
  const total = ONBOARD_STEPS.length;

  return (
    <AuthShell
      align="top"
      width="onboard"
      rail={<WelcomeRail currentIndex={currentIndex} />}
      mobileRail={
        <WelcomeMobileProgress currentIndex={currentIndex} total={total} />
      }
    >
      {/* Contextual controls — inline, scroll with content (not a header bar). */}
      <div className="mb-6 flex h-6 items-center justify-between">
        {onBack ? <BackButton onClick={onBack} /> : <span />}
        <SignOutButton />
      </div>
      {children}
    </AuthShell>
  );
}

// ── Progress rail (desktop) ──────────────────────────────────────────────────

function WelcomeRail({ currentIndex }: { currentIndex: number }) {
  return (
    <div>
      <p className="auth-stagger-1 text-[12px] font-medium tabular-nums text-muted-foreground">
        Step {currentIndex + 1} of {ONBOARD_STEPS.length}
      </p>

      <ol className="mt-6">
        {ONBOARD_STEPS.map((step, i) => {
          const state =
            i < currentIndex ? "done" : i === currentIndex ? "current" : "todo";
          const isLast = i === ONBOARD_STEPS.length - 1;
          return (
            <li
              key={step.id}
              className={cn(
                "relative flex gap-4 pb-6 last:pb-0",
                `auth-stagger-${Math.min(i + 2, 4)}`,
              )}
            >
              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute bottom-0 left-[15.5px] top-9 w-px",
                    i < currentIndex ? "bg-foreground/25" : "bg-border",
                  )}
                />
              )}
              <span
                aria-hidden
                className={cn(
                  "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-lg border font-mono text-[11px] font-medium transition-colors duration-300",
                  state === "done" &&
                    "border-transparent bg-foreground/80 text-background",
                  state === "current" && "border-brand bg-brand/10 text-brand",
                  state === "todo" &&
                    "border-border bg-card text-muted-foreground/60",
                )}
              >
                {state === "done" ? (
                  <Check className="size-3.5" weight="bold" />
                ) : (
                  step.ordinal
                )}
              </span>
              <div className="pt-1">
                <p
                  className={cn(
                    "text-[13.5px] font-semibold transition-colors duration-300",
                    state === "current"
                      ? "text-foreground"
                      : state === "done"
                        ? "text-muted-foreground"
                        : "text-muted-foreground/60",
                  )}
                >
                  {step.title}
                </p>
                {state === "current" && (
                  <p className="mt-1 max-w-[30ch] text-[12.5px] leading-relaxed text-muted-foreground">
                    {step.caption}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── Progress (mobile) ────────────────────────────────────────────────────────

function WelcomeMobileProgress({
  currentIndex,
  total,
}: {
  currentIndex: number;
  total: number;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-foreground">
          {ONBOARD_STEPS[currentIndex]?.title}
        </span>
        <span className="text-[12px] font-medium tabular-nums text-muted-foreground">
          Step {currentIndex + 1} of {total}
        </span>
      </div>
      <div className="flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-[3px] flex-1 rounded-full transition-colors duration-(--duration-slow) ease-standard",
              i < currentIndex
                ? "bg-foreground/30"
                : i === currentIndex
                  ? "bg-brand"
                  : "bg-border",
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ── Controls ─────────────────────────────────────────────────────────────────

function SignOutButton() {
  const { signOut } = useClerk();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => signOut(() => router.push("/sign-in"))}
      className="rounded-md px-2 py-1 text-[12px] font-medium text-muted-foreground/80 transition-colors duration-150 hover:text-foreground"
    >
      Sign out
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-1.5 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" />
      Back
    </button>
  );
}
