"use client";

/**
 * The "Active sessions" settings section.
 *
 * The old build loaded sessions into local state from a bare promise and only
 * reported a failure as a toast — so a failed load left a bordered, empty box
 * on screen forever, which reads as "you are signed in nowhere". Sessions are
 * now a real query, so the section gets the whole designed ladder: skeleton
 * rows on cold load, a named error with a retry, and rows otherwise.
 *
 * Two other corrections:
 *   • the box is gone — rows are `ItemRow`s in a `DataList` inside the fieldset
 *   • "Revoke all others" used `Promise.all`, so one failure reported total
 *     failure while some devices had in fact been signed out. It settles every
 *     revoke and reports the real outcome.
 */

import * as React from "react";
import { useUser, useSession } from "@clerk/nextjs";
import { useMutation } from "@tanstack/react-query";
import {
  useClerkSessions,
  useRefreshClerkSessions,
} from "@/hooks/use-clerk-sessions";
import { toast } from "sonner";
import {
  MonitorIcon,
  DeviceMobileIcon,
  GlobeIcon,
} from "@phosphor-icons/react";

import {
  DataList,
  DataState,
  EmptyState,
  ItemRow,
  ListSkeleton,
  SettingsSection,
  StatusBadge,
  useDataState,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useClerkDataState } from "@/components/account/use-clerk-data-state";
import { fmtDateTime, orDash, timeAgo } from "@/lib/format";

// ── Types ──────────────────────────────────────────────────────────────────────

type SessionWithActivities =
  NonNullable<ReturnType<typeof useUser>["user"]> extends {
    getSessions: () => Promise<(infer T)[]>;
  }
    ? T
    : never;

// ── Sessions section ───────────────────────────────────────────────────────────

export function SessionsList() {
  const { user, isLoaded } = useUser();
  const { session: currentSession } = useSession();

  const [revokeTarget, setRevokeTarget] =
    React.useState<SessionWithActivities | null>(null);
  const [revokeAllOpen, setRevokeAllOpen] = React.useState(false);

  const sessionsQuery = useClerkSessions(user, isLoaded);

  // Current device first. Sorting lives outside the query because it depends on
  // the active session, which is not part of the cache key.
  const sessions = React.useMemo(() => {
    const list = sessionsQuery.data ?? [];
    return [...list].sort((a, b) =>
      a.id === currentSession?.id ? -1 : b.id === currentSession?.id ? 1 : 0,
    );
  }, [sessionsQuery.data, currentSession?.id]);

  // The query is gated on Clerk resolving a user, so a session that resolves to
  // none leaves it `enabled: false` forever — `loading-initial` with no end, a
  // skeleton that never becomes anything. Clerk's own state names that failure,
  // exactly as Password and Two-factor do on this same page.
  const clerkState = useClerkDataState(user, isLoaded);
  const queryState = useDataState(sessionsQuery, { count: sessions.length });
  const state = clerkState.kind === "ready" ? queryState : clerkState;
  const others = sessions.filter((s) => s.id !== currentSession?.id);

  const refresh = useRefreshClerkSessions(user);

  const revokeOne = useMutation({
    mutationFn: (session: SessionWithActivities) => session.revoke(),
    onSuccess: () => {
      toast.success("Session revoked.");
      void refresh();
    },
    onError: () => toast.error("Failed to revoke session."),
    onSettled: () => setRevokeTarget(null),
  });

  const revokeOthers = useMutation({
    mutationFn: async (targets: SessionWithActivities[]) => {
      const results = await Promise.allSettled(targets.map((s) => s.revoke()));
      return results.filter((r) => r.status === "rejected").length;
    },
    onSuccess: (failed, targets) => {
      // A partial outcome is reported as a partial outcome — "all revoked" when
      // two of five failed would leave the owner believing the wrong thing.
      if (failed === 0) toast.success("All other sessions revoked.");
      else if (failed === targets.length)
        toast.error("Failed to revoke the other sessions.");
      else
        toast.warning(
          `Revoked ${targets.length - failed} of ${targets.length}. ${failed} still active.`,
        );
      void refresh();
    },
    onError: () => toast.error("Failed to revoke sessions."),
    onSettled: () => setRevokeAllOpen(false),
  });

  const busy = revokeOne.isPending || revokeOthers.isPending;

  return (
    <SettingsSection
      id="sessions"
      title="Active sessions"
      description="Every device currently signed in to your account. Revoking one signs that device out immediately."
      staggerIndex={2}
      flush
      actions={
        others.length > 0 && state.kind === "ready" ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={busy}
            onClick={() => setRevokeAllOpen(true)}
          >
            Revoke other sessions
          </Button>
        ) : undefined
      }
    >
      <DataState
        state={state}
        resource="your active sessions"
        align="start"
        compactError
        skeleton={
          <ListSkeleton rows={2} leading="square" trailing density="dense" />
        }
        empty={
          <EmptyState
            icon={MonitorIcon}
            align="start"
            className="px-4"
            title="No active sessions"
            description="Nothing is signed in to this account right now."
          />
        }
      >
        <DataList aria-label="Active sessions">
          {sessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              isCurrent={session.id === currentSession?.id}
              busy={busy}
              onRevoke={() => setRevokeTarget(session)}
            />
          ))}
        </DataList>
      </DataState>

      <ConfirmationDialog
        open={!!revokeTarget}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
        intent="warning"
        title="Revoke this session?"
        description="The device using it is signed out immediately and has to sign in again."
        confirmLabel={revokeOne.isPending ? "Revoking…" : "Revoke session"}
        onConfirm={() => revokeTarget && revokeOne.mutate(revokeTarget)}
      />

      <ConfirmationDialog
        open={revokeAllOpen}
        onOpenChange={setRevokeAllOpen}
        intent="warning"
        title={`Revoke ${others.length} other session${others.length === 1 ? "" : "s"}?`}
        description="Every device except this one is signed out immediately."
        confirmLabel={revokeOthers.isPending ? "Revoking…" : "Revoke sessions"}
        onConfirm={() => revokeOthers.mutate(others)}
      />
    </SettingsSection>
  );
}

// ── Session row ────────────────────────────────────────────────────────────────

/**
 * Device, place, and last activity. Every field is handled for absence: an
 * activity record with no browser, no city, and no IP is a real shape Clerk
 * returns, and it renders as words rather than as a blank line.
 */
function SessionRow({
  session,
  isCurrent,
  busy,
  onRevoke,
}: {
  session: SessionWithActivities;
  isCurrent: boolean;
  busy: boolean;
  onRevoke: () => void;
}) {
  const activity = session.latestActivity;
  const DeviceIcon =
    activity?.deviceType === "mobile" ? DeviceMobileIcon : MonitorIcon;

  const deviceLabel =
    [activity?.browserName, activity?.browserVersion]
      .filter(Boolean)
      .join(" ") || "Unknown browser";

  const location =
    [activity?.city, activity?.country].filter(Boolean).join(", ") ||
    orDash(activity?.ipAddress);

  return (
    <ItemRow
      padding="dense"
      aria-label={`${deviceLabel} session`}
      leading={
        <span
          className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground"
          aria-hidden
        >
          <DeviceIcon className="size-4" />
        </span>
      }
      title={
        <span className="block truncate text-sm font-medium text-foreground">
          {deviceLabel}
        </span>
      }
      subtitle={
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <GlobeIcon className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{location}</span>
          <span aria-hidden className="text-border">
            ·
          </span>
          <span
            className="shrink-0 tabular-nums"
            title={fmtDateTime(session.lastActiveAt)}
          >
            {timeAgo(session.lastActiveAt)}
          </span>
        </p>
      }
      trailing={
        isCurrent ? (
          <StatusBadge label="This device" tone="progress" />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={busy}
            onClick={onRevoke}
          >
            Revoke session
          </Button>
        )
      }
    />
  );
}
