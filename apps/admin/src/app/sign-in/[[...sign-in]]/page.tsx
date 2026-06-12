import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            Semblia Admin
          </p>
          <h1 className="text-2xl font-semibold text-zinc-900">Sign in</h1>
          <p className="text-sm text-zinc-600">
            Restricted access. Authorized administrators only.
          </p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "w-full shadow-none border border-zinc-200",
            },
          }}
        />
      </div>
    </main>
  );
}
