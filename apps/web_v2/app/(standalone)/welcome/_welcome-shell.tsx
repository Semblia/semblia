"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { ArrowLeft } from "@phosphor-icons/react";
import { SembliaWordmark } from "@/components/brand/semblia-mark";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { StepRail } from "./_step-rail";
import { ONBOARD_STEPS, type OnboardStep } from "./steps/constants";

interface WelcomeShellProps {
  current: OnboardStep;
  children: React.ReactNode;
  /** Called when the user clicks the back button. Omit to hide the button. */
  onBack?: () => void;
  /** Called when the user clicks a completed step in the rail. */
  onStepClick?: (step: OnboardStep) => void;
}

/**
 * Two-pane editorial shell for the new-user welcome flow.
 *
 * Desktop: brand/step rail on the left (lg+), focused form on the right.
 * Mobile: stacks the brand row at the top, then the form, then a slim mobile
 * step indicator (the rail itself is desktop-only to keep the form on screen).
 *
 * Sits inside `(standalone)` and intentionally has no app topbar — onboarding
 * is its own surface, not a page within the product chrome.
 */
export function WelcomeShell({
  current,
  children,
  onBack,
  onStepClick,
}: WelcomeShellProps) {
  return (
    <div className="grid h-svh lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)]">
      {/* ── Left rail (desktop only) — always dark for brand contrast ── */}
      <aside className="dark relative hidden border-r border-[oklch(0.22_0.01_60)] bg-[oklch(0.115_0.01_60)] lg:flex">
        <StepRail current={current} onStepClick={onStepClick} />
      </aside>

      {/* ── Right form panel ── */}
      <main className="relative flex flex-col">
        {/* Top bar: back button / brand on mobile, theme + sign-out always */}
        <div className="shrink-0 flex items-center justify-between px-6 pt-6 pb-0 lg:px-10 lg:pt-7">
          <div>
            {onBack ? (
              <BackButton onClick={onBack} />
            ) : (
              <div className="lg:hidden">
                <SembliaWordmark />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            <SignOutButton />
          </div>
        </div>

        {/* Mobile-only step pill */}
        <MobileStepPill
          current={current}
          className="shrink-0 mt-5 px-6 lg:hidden"
        />

        {/* Form viewport — vertically centred, no scroll */}
        <div className="flex flex-1 items-center justify-center px-6 py-8 lg:px-10">
          <div className="w-full max-w-[26rem]">{children}</div>
        </div>
      </main>
    </div>
  );
}

// ── Sign out button (Clerk) ──────────────────────────────────────────────────

function SignOutButton() {
  const { signOut } = useClerk();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => signOut(() => router.push("/sign-in"))}
      className="rounded-md px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/70 uppercase transition-colors duration-150 hover:text-foreground"
    >
      Sign out
    </button>
  );
}

// ── Back button ──────────────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-muted-foreground/60 transition-colors duration-150 hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" />
      Back
    </button>
  );
}

// ── Mobile step pill ─────────────────────────────────────────────────────────

function MobileStepPill({
  current,
  className,
}: {
  current: OnboardStep;
  className?: string;
}) {
  const currentIndex = ONBOARD_STEPS.findIndex((s) => s.id === current);
  const total = ONBOARD_STEPS.length;
  const ordinal = String(currentIndex + 1).padStart(2, "0");
  const totalOrdinal = String(total).padStart(2, "0");

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/70 uppercase">
          Step {ordinal} / {totalOrdinal}
        </span>
        <div
          className="relative h-px flex-1 overflow-hidden bg-border"
          aria-hidden
        >
          <div
            className="absolute inset-y-0 left-0 bg-foreground/40 transition-[width] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{
              width: `${((currentIndex + 1) / total) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
