import type { ReactNode } from "react";
import Link from "next/link";
import { SembliaWordmark } from "@/components/brand/semblia-mark";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  /**
   * Desktop context rail — the quiet pane left of the form. Sits between the
   * wordmark (top) and the footer (bottom). Auth shows what the product does;
   * onboarding shows where you are. Sharing this frame is what makes sign-in →
   * onboarding feel like one continuous room.
   */
  rail: ReactNode;
  /** Compact rail shown above the form on mobile only (e.g. onboarding progress). */
  mobileRail?: ReactNode;
  /**
   * Form column alignment. Auth centers (short, stable). Onboarding top-anchors
   * so the form doesn't jump as step height changes.
   */
  align?: "center" | "top";
  /** Form column max width. */
  width?: "auth" | "onboard";
  children: ReactNode;
}

/**
 * The single frame behind every signed-out / first-run screen.
 *
 * - `h-svh` + `overflow-hidden` at the root means the *page* never scrolls; if a
 *   step is taller than the viewport, only the form pane scrolls. This is the
 *   cure for the onboarding scroll-jank.
 * - No top header bar. The wordmark lives in the rail (desktop) or inline above
 *   the form (mobile), so nothing chrome-like floats over the content.
 * - Works in both server (auth layout) and client (welcome shell) trees — it
 *   holds no server-only code.
 */
export function AuthShell({
  rail,
  mobileRail,
  align = "center",
  width = "auth",
  children,
}: AuthShellProps) {
  const maxW = width === "auth" ? "max-w-[25rem]" : "max-w-[27.5rem]";

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      {/* ── Context rail (desktop) ── */}
      <aside className="relative hidden w-[42%] max-w-[34rem] shrink-0 flex-col border-r border-border bg-surface px-10 py-9 xl:px-12 lg:flex">
        <SembliaWordmark />
        <div className="flex flex-1 flex-col justify-center py-12">{rail}</div>
        <AuthFooter withTheme />
      </aside>

      {/* ── Form pane — the only scroll container ── */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        <div
          className={cn(
            "mx-auto flex min-h-full w-full flex-col px-5 sm:px-8",
            maxW,
          )}
        >
          {/* Brand lockup (mobile) — scrolls with content, not a header. */}
          <div className="flex justify-center pt-8 lg:hidden">
            <SembliaWordmark />
          </div>

          <div
            className={cn(
              "flex flex-1 flex-col",
              align === "center"
                ? "justify-center py-10"
                : "justify-start pt-10 pb-14 lg:pt-[13vh]",
            )}
          >
            {mobileRail && <div className="mb-9 lg:hidden">{mobileRail}</div>}
            {children}
          </div>

          {/* Footer (mobile) — the desktop copy lives in the rail. */}
          <div className="pb-6 lg:hidden">
            <AuthFooter withTheme />
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────────

function AuthFooter({ withTheme }: { withTheme?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-[11.5px] text-muted-foreground/70">
        <FooterLink href="/legal/terms">Terms</FooterLink>
        <Dot />
        <FooterLink href="/legal/privacy">Privacy</FooterLink>
        <Dot />
        <span>© {new Date().getFullYear()} Semblia</span>
      </p>
      {withTheme && (
        <ThemeToggle className="-mr-1.5 shrink-0 text-muted-foreground hover:text-foreground" />
      )}
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="transition-colors duration-150 hover:text-foreground"
    >
      {children}
    </Link>
  );
}

function Dot() {
  return (
    <span className="mx-2 text-border" aria-hidden>
      ·
    </span>
  );
}
