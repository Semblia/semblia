"use client";

/**
 * InviteAcceptClient — the screen a team-invite email links to.
 *
 * Runs the explicit accept exactly once on mount and renders the outcome
 * honestly. The API answers with different HTTP statuses for genuinely
 * different situations — expired, already used, wrong email, gone — and
 * folding them into one "couldn't join" message would send someone with an
 * expired invite to ask for a new one when their real problem is that they're
 * signed in under the wrong address. Only the truly unexpected case (a 5xx,
 * a network blip) gets the generic, retryable failure.
 */

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AccountSetupLoader } from "@/components/onboarding/account-setup-loader";
import { useAcceptProjectMemberInvite } from "@/hooks/api";
import { ApiError } from "@/lib/semblia-api";
import { homePath, projectPath } from "@/lib/routes";

type FailureKind =
  | "expired"
  | "revoked"
  | "wrong-email"
  | "team-full"
  | "not-found"
  | "generic";

const FAILURE_COPY: Record<
  FailureKind,
  { title: string; description: string; retryable: boolean }
> = {
  expired: {
    title: "This invite has expired",
    description: "Ask whoever invited you to send a new one.",
    retryable: false,
  },
  revoked: {
    title: "This invite is no longer available",
    description:
      "It may already have been accepted or revoked. Ask a project owner if you still need access.",
    retryable: false,
  },
  "wrong-email": {
    title: "This invite is for a different email",
    description:
      "Sign in with the address the invite was sent to, then open this link again.",
    retryable: false,
  },
  "team-full": {
    title: "This project is at its team limit",
    description:
      "The invite is valid, but the project's plan has no seats left. Ask the owner to upgrade, then open this link again.",
    retryable: false,
  },
  "not-found": {
    title: "We can't find this invite",
    description:
      "The link may be incorrect, or the invite may have been removed.",
    retryable: false,
  },
  generic: {
    title: "Couldn't join the project",
    description:
      "The request didn't complete. Try again, and contact support if it keeps failing.",
    retryable: true,
  },
};

/**
 * The API's own status codes carry the distinction — a 409 covers both an
 * expired invite and one already used, so only the message text tells them
 * apart. If that wording ever drifts, this degrades to "revoked" (still
 * accurate: the invite is unusable either way) rather than throwing.
 */
function classifyFailure(error: unknown): FailureKind {
  if (error instanceof ApiError) {
    if (error.status === 404) return "not-found";
    if (error.status === 403) return "wrong-email";
    if (error.status === 409) {
      if (/team member limit/i.test(error.message)) return "team-full";
      return /expired/i.test(error.message) ? "expired" : "revoked";
    }
  }
  return "generic";
}

export function InviteAcceptClient({ inviteId }: { inviteId: string }) {
  const acceptInvite = useAcceptProjectMemberInvite();
  const attempted = React.useRef(false);

  // Exactly once per mount — a second effect run (Strict Mode) or a re-render
  // must not re-submit the accept.
  React.useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    acceptInvite.mutate(inviteId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteId]);

  if (acceptInvite.isSuccess) {
    const { projectSlug, projectName } = acceptInvite.data;
    return (
      <AccountSetupLoader
        fullScreen
        showSpinner={false}
        title="You're in"
        description={`You've joined ${projectName}.`}
        action={
          <Button asChild>
            <Link href={projectPath(projectSlug)}>Open project</Link>
          </Button>
        }
      />
    );
  }

  if (acceptInvite.isError) {
    const copy = FAILURE_COPY[classifyFailure(acceptInvite.error)];
    return (
      <AccountSetupLoader
        fullScreen
        role="alert"
        showSpinner={false}
        title={copy.title}
        description={copy.description}
        action={
          copy.retryable ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => acceptInvite.mutate(inviteId)}
            >
              Try again
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href={homePath()}>Go to your projects</Link>
            </Button>
          )
        }
      />
    );
  }

  return (
    <AccountSetupLoader
      fullScreen
      title="Joining…"
      description="Confirming your invite."
    />
  );
}
