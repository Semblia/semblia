import { adminGet } from "@/lib/api";
import type { AdminAuditLog } from "@/lib/admin-types";

function formatDateTime(iso: string): string {
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

function formatMetadata(value: unknown): string {
  if (value == null) return "-";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export default async function AuditLogsPage() {
  const logs = await adminGet<AdminAuditLog[]>("/admin/audit-logs?limit=50");

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          Security
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Audit logs
        </h1>
        <p className="max-w-2xl text-sm text-zinc-600">
          Recent admin mutations. This scaffold shows the latest 50 rows from
          the admin audit table.
        </p>
      </header>

      {logs.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
            Quiet
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            No admin audit rows have been recorded yet.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-[11px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Time</th>
                <th className="px-4 py-2.5 font-medium">Admin</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Target</th>
                <th className="px-4 py-2.5 font-medium">Metadata</th>
                <th className="px-4 py-2.5 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {logs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="px-4 py-3 text-xs text-zinc-600">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">
                      {log.adminEmail}
                    </div>
                    <div className="mt-1 font-mono text-xs text-zinc-500">
                      {log.adminUserId}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-zinc-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-600">
                    {log.targetType ?? "-"}
                    {log.targetId ? (
                      <span className="block text-zinc-400">{log.targetId}</span>
                    ) : null}
                  </td>
                  <td className="max-w-sm px-4 py-3 font-mono text-xs text-zinc-600">
                    <span className="line-clamp-3">
                      {formatMetadata(log.metadata)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-600">
                    {log.ipAddress ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
