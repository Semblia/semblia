import Link from "next/link";
import { adminGet } from "@/lib/api";
import type { AdminMe, AdminUser } from "@/lib/admin-types";
import { deactivateAdminAction, grantAdminAction } from "./actions";

type StatusFilter = "all" | "active" | "inactive";

function parseStatusFilter(value: string | string[] | undefined): StatusFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "active" || raw === "inactive" || raw === "all") return raw;
  return "active";
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default async function AdminsPage(props: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const { status } = await props.searchParams;
  const filter = parseStatusFilter(status);
  const [all, me] = await Promise.all([
    adminGet<AdminUser[]>("/admin/users"),
    adminGet<AdminMe>("/admin/me"),
  ]);
  const admins = all.filter((admin) => {
    if (filter === "active") return admin.isActive;
    if (filter === "inactive") return !admin.isActive;
    return true;
  });
  const counts = {
    all: all.length,
    active: all.filter((admin) => admin.isActive).length,
    inactive: all.filter((admin) => !admin.isActive).length,
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
            Access control
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Admins
          </h1>
          <p className="max-w-2xl text-sm text-zinc-600">
            DB-backed admin access for the separate Tresta Admin Clerk app.
            Changes are audit-logged and self-deactivation is rejected by the
            API.
          </p>
        </div>
        <Link
          href="/audit-logs"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Audit logs
        </Link>
      </header>

      <GrantAdminForm />

      <FilterTabs current={filter} counts={counts} />

      {admins.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
            No matches
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            No admin users match the current filter.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-[11px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Admin</th>
                <th className="px-4 py-2.5 font-medium">Granted</th>
                <th className="px-4 py-2.5 font-medium">Last login</th>
                <th className="px-4 py-2.5 font-medium">Notes</th>
                <th className="px-4 py-2.5 font-medium text-right">Status</th>
                <th className="w-px px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {admins.map((admin) => (
                <AdminRow key={admin.id} admin={admin} currentAdminId={me.id} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GrantAdminForm() {
  return (
    <form
      action={grantAdminAction}
      className="grid gap-4 rounded-md border border-zinc-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_1fr_auto]"
    >
      <Field label="Email" htmlFor="admin-email">
        <input
          id="admin-email"
          name="email"
          type="email"
          required
          maxLength={320}
          placeholder="admin@tresta.app"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </Field>
      <Field label="Clerk user ID" htmlFor="admin-clerk-id">
        <input
          id="admin-clerk-id"
          name="clerkUserId"
          type="text"
          required
          maxLength={255}
          placeholder="user_..."
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </Field>
      <Field label="Notes" htmlFor="admin-notes">
        <input
          id="admin-notes"
          name="notes"
          type="text"
          maxLength={1000}
          placeholder="Optional"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </Field>
      <div className="flex items-end">
        <button
          type="submit"
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800"
        >
          Grant
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium uppercase tracking-wider text-zinc-700"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function FilterTabs({
  current,
  counts,
}: {
  current: StatusFilter;
  counts: { all: number; active: number; inactive: number };
}) {
  const tabs: Array<{ value: StatusFilter; label: string; count: number }> = [
    { value: "active", label: "Active", count: counts.active },
    { value: "inactive", label: "Inactive", count: counts.inactive },
    { value: "all", label: "All", count: counts.all },
  ];

  return (
    <nav className="flex items-center gap-1 border-b border-zinc-200 text-sm">
      {tabs.map((tab) => {
        const isActive = tab.value === current;
        return (
          <Link
            key={tab.value}
            href={`/admins?status=${tab.value}`}
            className={
              isActive
                ? "-mb-px border-b-2 border-zinc-900 px-3 py-2 font-medium text-zinc-900"
                : "-mb-px border-b-2 border-transparent px-3 py-2 text-zinc-500 hover:text-zinc-900"
            }
          >
            {tab.label}
            <span
              className={
                isActive
                  ? "ml-2 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white"
                  : "ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-zinc-600"
              }
            >
              {tab.count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function AdminRow({
  admin,
  currentAdminId,
}: {
  admin: AdminUser;
  currentAdminId: string;
}) {
  const isCurrent = admin.id === currentAdminId;
  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <div className="font-medium text-zinc-900">
          {admin.email}
          {isCurrent ? (
            <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700">
              You
            </span>
          ) : null}
        </div>
        <div className="mt-1 font-mono text-xs text-zinc-500">
          {admin.clerkUserId}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-zinc-600">
        <div>{formatDateTime(admin.grantedAt)}</div>
        {admin.grantedByEmail ? (
          <div className="mt-1 text-zinc-400">by {admin.grantedByEmail}</div>
        ) : null}
      </td>
      <td className="px-4 py-3 text-xs text-zinc-600">
        {formatDateTime(admin.lastLoginAt)}
      </td>
      <td className="max-w-xs px-4 py-3 text-xs text-zinc-600">
        {admin.notes ?? <span className="text-zinc-400">-</span>}
      </td>
      <td className="px-4 py-3 text-right">
        <StatusPill active={admin.isActive} />
      </td>
      <td className="px-4 py-3 text-right">
        {admin.isActive && !isCurrent ? (
          <form action={deactivateAdminAction}>
            <input type="hidden" name="id" value={admin.id} />
            <button
              type="submit"
              className="rounded border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
            >
              Deactivate
            </button>
          </form>
        ) : null}
      </td>
    </tr>
  );
}

function StatusPill({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
      <span className="size-1.5 rounded-full bg-zinc-400" />
      Inactive
    </span>
  );
}
