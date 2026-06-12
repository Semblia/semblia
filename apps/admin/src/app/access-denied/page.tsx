import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";

export const metadata = {
  title: "Access denied — Semblia Admin",
};

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md space-y-6 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          403 — Forbidden
        </p>
        <h1 className="text-2xl font-semibold text-zinc-900">Access denied</h1>
        <p className="text-sm leading-relaxed text-zinc-600">
          Your account is authenticated but not authorized to use the admin
          panel. If you believe this is a mistake, ask an existing admin to
          grant you access.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <SignOutButton />

          <Link
            href="/sign-in"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Try another account
          </Link>
        </div>
      </div>
    </main>
  );
}
