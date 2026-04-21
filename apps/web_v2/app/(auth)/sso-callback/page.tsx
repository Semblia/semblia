"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function SSOCallbackPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-5 onboard-fade-in">
        {/* Branded mark — bg-foreground flips theme; invert adapts the logo */}
        <div className="flex size-10 items-center justify-center rounded-xl bg-foreground">
          <BrandLogo size={20} variant="default" className="invert dark:invert-0" alt="" />
        </div>

        {/* Spinner */}
        <div className="relative size-5">
          <svg
            className="animate-spin text-brand"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2.5"
              className="opacity-15"
            />
            <path
              className="opacity-80"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>

        <p className="text-sm text-muted-foreground">Completing sign-in…</p>
      </div>

      <AuthenticateWithRedirectCallback />
    </div>
  );
}
