"use client";

/**
 * The two-step creation flow both key kinds walk.
 *
 * Step 1 collects what the key is for; step 2 shows the secret exactly once.
 * Everything except the middle of step 1 was duplicated across the two forms,
 * including two copies of a centred `max-w-xl` rail that the app dropped
 * everywhere else, and a mono-uppercase "STEP 1 OF 2" eyebrow that read as
 * decoration rather than as progress.
 *
 * The secret's lifetime is the point of this file, so it is stated plainly:
 *
 *   • the plaintext arrives only as the return value of the create/rotate
 *     mutation and is held in the calling component's state
 *   • nothing writes it to the react-query cache — both mutations only
 *     invalidate the key list, and the list DTO carries a prefix and last four,
 *     never a secret
 *   • leaving the flow unmounts the state, and the caller resets the mutation
 *     so the plaintext does not linger in the mutation cache either
 *
 * There is therefore no path that re-fetches a revealed secret, which is why
 * leaving step 2 asks for confirmation: it really is the last chance.
 */

import * as React from "react";
import { ArrowLeftIcon, WarningIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PageBody, PageHeader } from "@/components/shared";
import { ApiError } from "@/lib/api-client";
import { RevealPanel } from "@/components/developers/shared/reveal-step";

export interface CreateKeyLayoutProps {
  title: string;
  /** Inline header state — the step, and what this kind of key can do. */
  meta: React.ReactNode;
  backLabel: string;
  /**
   * A button, not a link: leaving step 2 has to be intercepted, and a `<Link>`
   * would navigate before the guard could ask.
   */
  onBack: () => void;
  children: React.ReactNode;
}

export function CreateKeyLayout({
  title,
  meta,
  backLabel,
  onBack,
  children,
}: CreateKeyLayoutProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={title}
        description={meta}
        actions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={onBack}
          >
            <ArrowLeftIcon className="size-3.5" weight="bold" aria-hidden />
            {backLabel}
          </Button>
        }
      />
      <PageBody padding="default" className="min-h-0 overflow-y-auto">
        {/* A measure cap, left-aligned — not the centred page rail the app
            deleted. Form fields past ~65ch are hard to scan. */}
        <div className="max-w-2xl space-y-6">{children}</div>
      </PageBody>
    </div>
  );
}

/**
 * Step 2. The warning is a rule and a tint rather than a box, so the reveal
 * panel below it stays the only bounded surface on the screen.
 */
export function CreatedKeySecret({
  plaintext,
  onDone,
}: {
  plaintext: string;
  onDone: () => void;
}) {
  return (
    <div className="space-y-5">
      <p className="flex items-start gap-2 border-l-2 border-warning/60 bg-warning/5 py-2 pl-3 text-xs leading-relaxed text-foreground">
        <WarningIcon
          className="mt-0.5 size-3.5 shrink-0 text-warning"
          weight="bold"
          aria-hidden
        />
        <span>
          This is the only time Semblia can show this key. It is stored as a
          hash, so nobody — including support — can retrieve it later. Copy it
          into your secret store before you leave this page.
        </span>
      </p>
      <RevealPanel plaintext={plaintext} onDone={onDone} />
    </div>
  );
}

/**
 * The form's own failure, rendered where the action was taken rather than as a
 * toast that outlives the context it belongs to.
 */
export function CreateKeyError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="border-l-2 border-destructive/60 bg-destructive/5 py-2 pl-3 text-xs leading-relaxed text-destructive"
    >
      {message}
    </p>
  );
}

/**
 * Fixed copy per failure class. The server's own message is deliberately not
 * echoed: `ApiError.message` carries the raw response body, which can hold
 * internals, and no error copy on this surface should ever contain a status
 * code or a stack.
 */
export function createKeyErrorMessage(error: unknown, noun: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return `You don't have permission to create ${noun} on this project. A project owner or admin can grant it.`;
    }
    if (error.status === 409) {
      return `A ${noun.replace(/s$/, "")} with that name already exists. Pick another name.`;
    }
    if (error.status >= 400 && error.status < 500) {
      return "Couldn't create the key. Check the name and the access you picked, then try again.";
    }
  }
  return "Failed to create the key. Nothing was created — try again in a moment.";
}
