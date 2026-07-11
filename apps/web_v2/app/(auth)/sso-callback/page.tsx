"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { useState } from "react";
import Link from "next/link";
import { AuthNotice } from "@/components/auth/auth-notice";
import { Spinner } from "@/components/ui/spinner";

export default function SSOCallbackPage() {
  // Error state reserved for AuthenticateWithRedirectCallback error handling
  const [error] = useState<string | null>(null);

  return (
    <div className="auth-form-enter">
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        {!error ? (
          <>
            <Spinner className="size-5 text-brand" aria-hidden />

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
