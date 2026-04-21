import Link from "next/link";

// ── Tresta mark ────────────────────────────────────────────────────────────────

export function TrestaMark() {
  return (
    <Link
      href="/projects"
      aria-label="Tresta — back to projects"
      className="group inline-flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span className="relative flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-foreground text-background">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M7 1L13 4V10L7 13L1 10V4L7 1Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.5"
          />
        </svg>
      </span>
      <span className="hidden text-sm font-semibold tracking-tight text-foreground sm:inline">
        Tresta
      </span>
    </Link>
  );
}
