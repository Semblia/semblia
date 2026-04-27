"use client";

import * as React from "react";
import { useUser, useSession } from "@clerk/nextjs";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  MonitorIcon,
  DeviceMobileIcon,
  GlobeIcon,
} from "@phosphor-icons/react";

// ── Types ──────────────────────────────────────────────────────────────────────

type SessionWithActivities = NonNullable<
  ReturnType<typeof useUser>["user"]
> extends { getSessions: () => Promise<(infer T)[]> }
  ? T
  : never;

// ── Session row ────────────────────────────────────────────────────────────────

function SessionRow({
  session,
  isCurrent,
  onRevoke,
}: {
  session: SessionWithActivities;
  isCurrent: boolean;
  onRevoke: () => void;
}) {
  const activity = session.latestActivity;
  const isMobile = activity?.deviceType === "mobile";
  const DeviceIcon = isMobile ? DeviceMobileIcon : MonitorIcon;

  const deviceLabel =
    [activity?.browserName, activity?.browserVersion]
      .filter(Boolean)
      .join(" ") || "Unknown browser";

  const location =
    [activity?.city, activity?.country].filter(Boolean).join(", ") ||
    activity?.ipAddress ||
    "Unknown location";

  const lastActive = session.lastActiveAt
    ? formatDistanceToNow(new Date(session.lastActiveAt), { addSuffix: true })
    : "—";

  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3.5">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <DeviceIcon className="size-4" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">
              {deviceLabel}
            </span>
            {isCurrent && (
              <Badge variant="secondary" className="shrink-0 text-[10px] bg-brand/10 text-brand border-brand/20">
                This device
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <GlobeIcon className="size-3 shrink-0" />
            <span className="truncate">{location}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="shrink-0">{lastActive}</span>
          </div>
        </div>
      </div>

      {!isCurrent && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/8"
          onClick={onRevoke}
        >
          Revoke
        </Button>
      )}
    </div>
  );
}

// ── Sessions list ──────────────────────────────────────────────────────────────

export function SessionsList() {
  const { user, isLoaded } = useUser();
  const { session: currentSession } = useSession();

  const [sessions, setSessions] = React.useState<SessionWithActivities[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [revokeTarget, setRevokeTarget] =
    React.useState<SessionWithActivities | null>(null);
  const [revokeAllOpen, setRevokeAllOpen] = React.useState(false);
  const [revoking, setRevoking] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    setLoading(true);
    user
      .getSessions()
      .then((s) => {
        // Current session first
        const sorted = [...s].sort((a) =>
          a.id === currentSession?.id ? -1 : 1,
        );
        setSessions(sorted);
      })
      .catch(() => toast.error("Failed to load sessions."))
      .finally(() => setLoading(false));
  }, [user?.id, currentSession?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function revokeOne() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await revokeTarget.revoke();
      setSessions((prev) => prev.filter((s) => s.id !== revokeTarget.id));
      toast.success("Session revoked.");
    } catch {
      toast.error("Failed to revoke session.");
    } finally {
      setRevoking(false);
      setRevokeTarget(null);
    }
  }

  async function revokeAll() {
    setRevoking(true);
    try {
      const others = sessions.filter((s) => s.id !== currentSession?.id);
      await Promise.all(others.map((s) => s.revoke()));
      setSessions((prev) =>
        prev.filter((s) => s.id === currentSession?.id),
      );
      toast.success("All other sessions revoked.");
    } catch {
      toast.error("Failed to revoke sessions.");
    } finally {
      setRevoking(false);
      setRevokeAllOpen(false);
    }
  }

  const otherCount = sessions.filter(
    (s) => s.id !== currentSession?.id,
  ).length;

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">
          {isLoaded && !loading
            ? `${sessions.length} active session${sessions.length === 1 ? "" : "s"}`
            : ""}
        </p>
        {otherCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/8 h-7 px-2 text-xs"
            onClick={() => setRevokeAllOpen(true)}
          >
            Revoke all others
          </Button>
        )}
      </div>

      <Card>
        <div className="divide-y divide-border">
          {loading || !isLoaded
            ? Array.from({ length: 2 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                  <Skeleton className="size-8 rounded-lg" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              ))
            : sessions.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  isCurrent={s.id === currentSession?.id}
                  onRevoke={() => setRevokeTarget(s)}
                />
              ))}
        </div>
      </Card>

      <ConfirmationDialog
        open={!!revokeTarget}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
        intent="warning"
        title="Revoke session?"
        description="This will sign out the device associated with this session."
        confirmLabel={revoking ? "Revoking…" : "Revoke"}
        onConfirm={revokeOne}
      />

      <ConfirmationDialog
        open={revokeAllOpen}
        onOpenChange={setRevokeAllOpen}
        intent="warning"
        title={`Revoke ${otherCount} other session${otherCount === 1 ? "" : "s"}?`}
        description="All devices except this one will be signed out."
        confirmLabel={revoking ? "Revoking…" : "Revoke all"}
        onConfirm={revokeAll}
      />
    </>
  );
}
