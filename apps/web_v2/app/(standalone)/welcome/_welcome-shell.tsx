"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { ArrowLeft } from "@phosphor-icons/react";
import { SembliaWordmark } from "@/components/brand/semblia-mark";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { ONBOARD_STEPS, type OnboardStep } from "./steps/constants";

interface WelcomeShellProps {
  current: OnboardStep;
  children: React.ReactNode;
  /** Called when the user clicks the back button. Omit to hide the button. */
  onBack?: () => void;
}

/**
 * Onboarding shell — the same calm, app-native frame as the auth pages.
 *
 * A thin top bar (wordmark + theme + sign out), a slim segmented progress
 * strip, and top-aligned centered content. No dark brand rail, no mono
 * eyebrows — onboarding should feel like the first room of the app, not a
 * separate marketing world.
 */
export function WelcomeShell({ current, children, onBack }: WelcomeShellProps) {
  const currentIndex = Math.max(
    0,
    ONBOARD_STEPS.findIndex((s) => s.id === current),
  );
  const total = ONBOARD_STEPS.length;

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* ── Top bar — matches the in-app topbar ── */}
      <header className="flex h-14 shrink-0 items-center justify-between px-5 sm:px-6">
        <SembliaWordmark />
        <div className="flex items-center gap-1">
          <ThemeToggle className="text-muted-foreground hover:text-foreground" />
          <SignOutButton />
        </div>
      </header>

      {/* ── Content — top-aligned so steps don't jump as height changes ── */}
      <main className="flex flex-1 flex-col items-center px-5 pb-16">
        <div className="w-full max-w-[27rem] pt-4 sm:pt-10">
          {/* Progress */}
          <div className="mb-8">
            <div className="mb-2.5 flex h-5 items-center justify-between">
              {onBack ? <BackButton onClick={onBack} /> : <span />}
              <span className="text-[12px] font-medium tabular-nums text-muted-foreground">
                Step {currentIndex + 1} of {total}
              </span>
            </div>
            <ProgressTrack currentIndex={currentIndex} total={total} />
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}

// ── Segmented progress ───────────────────────────────────────────────────────

function ProgressTrack({
  currentIndex,
  total,
}: {
  currentIndex: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-[3px] flex-1 rounded-full transition-colors duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
            i < currentIndex
              ? "bg-foreground/30"
              : i === currentIndex
                ? "bg-brand"
                : "bg-border",
          )}
        />
      ))}
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
      className="rounded-md px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
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
      className="-ml-1.5 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" />
      Back
    </button>
  );
}
