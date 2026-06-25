"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { useState } from "react";
import Link from "next/link";
import { AuthNotice } from "@/components/auth/auth-notice";

export default function SSOCallbackPage() {
  // Error state reserved for AuthenticateWithRedirectCallback error handling
  const [error] = useState<string | null>(null);

  return (
    <div className="auth-form-enter">
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        {!error ? (
          <>
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
          </>
        ) : (
          <div className="w-full space-y-4">
            <AuthNotice error={error} />
            <Link
              href="/sign-in"
              className="block w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium items-center justify-center hover:opacity-90 transition-opacity auth-btn"
            >
              Back to sign in
            </Link>
          </div>
        )}
      </div>

      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/projects"
        signUpFallbackRedirectUrl="/welcome"
      />
    </div>
  );
}
