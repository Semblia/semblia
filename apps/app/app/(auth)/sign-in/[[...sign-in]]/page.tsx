import { Suspense } from "react";
import type { Metadata } from "next";
import { SignInForm } from "./_form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    // `SignInForm` reads `?redirect_url=` via useSearchParams, which needs a
    // Suspense boundary above it.
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
