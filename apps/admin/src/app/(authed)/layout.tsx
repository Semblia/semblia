import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { adminGet, AdminApiError } from "@/lib/api";
import type { AdminMe } from "@/lib/admin-types";

async function loadCurrentAdmin(): Promise<AdminMe | null> {
  try {
    return await adminGet<AdminMe>("/admin/me");
  } catch (err) {
    if (
      err instanceof AdminApiError &&
      (err.status === 401 || err.status === 403)
    ) {
      return null;
    }
    throw err;
  }
}

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await loadCurrentAdmin();
  if (!me) {
    redirect("/access-denied");
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link
              href="/plans"
              className="font-mono text-xs font-medium uppercase tracking-widest text-zinc-900"
            >
              Semblia Admin
            </Link>
            <nav className="flex items-center gap-4 text-sm text-zinc-600">
              <Link href="/plans" className="hover:text-zinc-900">
                Plans
              </Link>
              <Link href="/admins" className="hover:text-zinc-900">
                Admins
              </Link>
              <Link href="/audit-logs" className="hover:text-zinc-900">
                Audit
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-[11px] text-zinc-500 sm:inline">
              {me.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
