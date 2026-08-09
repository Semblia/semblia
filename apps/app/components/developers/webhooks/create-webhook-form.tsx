"use client";

/**
 * CreateWebhookForm — register an endpoint, then take the signing secret once.
 *
 * The old build hand-rolled its page chrome: a centred `mx-auto max-w-xl` rail
 * (the app is full-bleed), its own `<h1>`, its own back button, and a
 * mono-uppercase "STEP 1 OF 2" eyebrow, which is the banned decorative motif.
 * It also validated silently — the submit button simply stayed disabled with no
 * statement of what was missing.
 *
 * Now it composes `PageHeader` / `PageBody` / `Section` like every other page,
 * states each field's rule under the field, and keeps only the measure cap a
 * form genuinely needs (a full-bleed text input is unusable, but that is a
 * measure, not a page rail).
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import type { V2OutboundWebhookEventType } from "@workspace/types";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, PageBody, Section } from "@/components/shared";
import { webhooksPath } from "@/lib/routes";
import { useCreateOutboundWebhookEndpoint } from "@/hooks/api";
import {
  RevealPanel,
  ConfirmCloseDialog,
} from "@/components/developers/shared/reveal-step";
import { EventTypePicker } from "./webhook-events";

const DEFAULT_EVENTS: V2OutboundWebhookEventType[] = ["submission.created"];

function isValidUrl(value: string): boolean {
  return /^https?:\/\/.+/.test(value.trim());
}

/** Draft state for the new endpoint, with each field's validity beside it. */
function useNewEndpointDraft() {
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [events, setEvents] =
    React.useState<V2OutboundWebhookEventType[]>(DEFAULT_EVENTS);

  const nameValid = name.trim().length >= 3;
  const urlValid = isValidUrl(url);
  return {
    name,
    setName,
    url,
    setUrl,
    events,
    setEvents,
    nameValid,
    urlValid,
    valid: nameValid && urlValid && events.length > 0,
  };
}

type NewEndpointDraft = ReturnType<typeof useNewEndpointDraft>;

/** The destination fields, each stating its rule under the field. */
function EndpointFields({ draft }: { draft: NewEndpointDraft }) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="wh-name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="wh-name"
          value={draft.name}
          onChange={(e) => draft.setName(e.target.value)}
          placeholder="e.g. Production listener"
          maxLength={60}
          aria-invalid={draft.name.length > 0 && !draft.nameValid}
          aria-describedby="wh-name-hint"
          autoFocus
        />
        <p id="wh-name-hint" className="text-[11px] text-muted-foreground">
          At least 3 characters. Only you see this — it labels the endpoint in
          the list.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wh-url">
          Endpoint URL <span className="text-destructive">*</span>
        </Label>
        <Input
          id="wh-url"
          value={draft.url}
          onChange={(e) => draft.setUrl(e.target.value)}
          placeholder="https://example.com/webhooks/semblia"
          aria-invalid={draft.url.length > 0 && !draft.urlValid}
          aria-describedby="wh-url-hint"
        />
        <p id="wh-url-hint" className="text-[11px] text-muted-foreground">
          Must start with http:// or https:// and be reachable from the public
          internet.
        </p>
      </div>
    </>
  );
}

function SecretRevealedStep({
  secret,
  confirmClose,
  onConfirmCloseChange,
  onDone,
}: {
  secret: string;
  confirmClose: boolean;
  onConfirmCloseChange: (open: boolean) => void;
  onDone: () => void;
}) {
  return (
    <>
      <PageHeader
        title="Endpoint created"
        description="Copy the signing secret — it isn't shown again"
      />
      <PageBody>
        <Section
          title="Signing secret"
          description={
            <>
              Use this to verify the{" "}
              <code className="font-mono">X-Semblia-Signature</code> header on
              every delivery Semblia sends to your receiver.
            </>
          }
        >
          <div className="max-w-xl">
            <RevealPanel plaintext={secret} onDone={onDone} />
          </div>
        </Section>
      </PageBody>

      <ConfirmCloseDialog
        open={confirmClose}
        onOpenChange={onConfirmCloseChange}
        onConfirm={onDone}
      />
    </>
  );
}

export function CreateWebhookForm({ slug }: { slug: string }) {
  const router = useRouter();
  const createMutation = useCreateOutboundWebhookEndpoint(slug);

  const draft = useNewEndpointDraft();
  const [submitting, setSubmitting] = React.useState(false);
  const [secret, setSecret] = React.useState<string | null>(null);
  const [confirmClose, setConfirmClose] = React.useState(false);

  const backHref = webhooksPath(slug);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const result = await createMutation.mutateAsync({
        name: draft.name.trim(),
        url: draft.url.trim(),
        subscribedEvents: draft.events,
      });
      setSecret(result.signingSecret);
    } finally {
      setSubmitting(false);
    }
  }

  function attemptLeave() {
    // Leaving after the secret is shown loses it for good, so that exit is
    // gated. Leaving before then costs nothing and is not.
    if (secret != null) {
      setConfirmClose(true);
      return;
    }
    router.push(backHref);
  }

  function confirmLeave() {
    setConfirmClose(false);
    router.push(backHref);
  }

  const backButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="gap-1.5 text-xs"
      onClick={attemptLeave}
    >
      <ArrowLeftIcon className="size-3.5" weight="bold" aria-hidden />
      Back to webhooks
    </Button>
  );

  if (secret != null) {
    return (
      <SecretRevealedStep
        secret={secret}
        confirmClose={confirmClose}
        onConfirmCloseChange={setConfirmClose}
        onDone={confirmLeave}
      />
    );
  }

  return (
    <>
      <PageHeader title="New webhook endpoint" actions={backButton} />

      <PageBody>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.valid && !submitting) handleSubmit();
          }}
        >
          <Section
            title="Destination"
            description="Semblia POSTs a signed JSON payload to this URL as each subscribed event happens, and retries with backoff when your receiver doesn't answer."
          >
            {/* A measure cap, not a page rail: full-bleed text inputs are
                unreadable, so the fields stop at a comfortable line length. */}
            <div className="max-w-xl space-y-5">
              <EndpointFields draft={draft} />

              <EventTypePicker
                selected={draft.events}
                onChange={draft.setEvents}
              />

              {createMutation.isError && (
                <p role="alert" className="text-[11px] text-destructive">
                  Couldn&apos;t create the endpoint. Check the URL and try
                  again.
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={attemptLeave}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!draft.valid || submitting}
                  aria-busy={submitting}
                >
                  {submitting ? "Creating…" : "Create endpoint"}
                </Button>
              </div>
            </div>
          </Section>
        </form>
      </PageBody>
    </>
  );
}
