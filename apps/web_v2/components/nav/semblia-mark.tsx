import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";

// ── Semblia mark ────────────────────────────────────────────────────────────────

export function SembliaMark() {
  return (
    <Link
      href="/projects"
      aria-label="Semblia — back to projects"
      className="group inline-flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {/*
       * bg-foreground flips: near-black in light mode, near-white in dark mode.
       * The default (dark) logo with `invert` becomes white in light mode,
       * and `dark:invert-0` keeps it dark on the light container in dark mode.
       */}
      <span className="relative flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-foreground">
        <BrandLogo
          size={16}
          variant="default"
          className="invert dark:invert-0"
          alt=""
        />
      </span>
      <span className="hidden text-sm font-semibold tracking-tight text-foreground sm:inline">
        Semblia
      </span>
    </Link>
  );
}
