import type { ReactNode } from "react";
import Link from "next/link";
import { SembliaWordmark } from "@/components/brand/semblia-mark";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/**
 * Auth shell — a calm, app-native frame.
 *
 * Deliberately mirrors the product chrome rather than a marketing splash: a thin
 * top bar (wordmark + theme toggle, same as the app topbar), a single structured
 * card on the warm app background, and a quiet footer. No brand glow, hairline
 * grid, manifesto, or display type — the door should look like the house.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* ── Top bar — matches the in-app topbar ── */}
      <header className="flex h-14 shrink-0 items-center justify-between px-5 sm:px-6">
        <SembliaWordmark />
        <ThemeToggle className="text-muted-foreground hover:text-foreground" />
      </header>

      {/* ── Centered card ── */}
      <main className="flex flex-1 items-center justify-center px-5 py-8">
        <div className="w-full max-w-[25rem]">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_oklch(0_0_0/4%)] sm:p-8 dark:shadow-none">
            {children}
          </div>

          <AuthFooter />
        </div>
      </main>
    </div>
  );
}

function AuthFooter() {
  return (
    <p className="mt-6 text-center text-[12px] text-muted-foreground/70">
      <Link
        href="/legal/terms"
        className="transition-colors duration-150 hover:text-foreground"
      >
        Terms
      </Link>
      <span className="mx-2 text-border" aria-hidden>
        ·
      </span>
      <Link
        href="/legal/privacy"
        className="transition-colors duration-150 hover:text-foreground"
      >
        Privacy
      </Link>
      <span className="mx-2 text-border" aria-hidden>
        ·
      </span>
      <span>© {new Date().getFullYear()} Semblia</span>
    </p>
  );
}
