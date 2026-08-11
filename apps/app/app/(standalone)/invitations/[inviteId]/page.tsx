import type { Metadata } from "next";
import { InviteAcceptClient } from "./_invite-accept";

export const metadata: Metadata = { title: "Accept invite" };

/**
 * The address every team-invite email links to. `proxy.ts` protects it like
 * any other app page — a signed-out visitor is bounced to sign-in and, once
 * signed in, returned to this exact URL (`?redirect_url`) — so by the time
 * `InviteAcceptClient` mounts there is always a session to accept with.
 */
export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ inviteId: string }>;
}) {
  const { inviteId } = await params;
  return <InviteAcceptClient inviteId={inviteId} />;
}
