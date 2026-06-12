"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { V2OutboundWebhookEventType } from "@workspace/types";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function CreateWebhookForm({ slug }: { slug: string }) {
  const router = useRouter();
  const createMutation = useCreateOutboundWebhookEndpoint(slug);

  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [events, setEvents] =
    React.useState<V2OutboundWebhookEventType[]>(DEFAULT_EVENTS);
  const [submitting, setSubmitting] = React.useState(false);
  const [secret, setSecret] = React.useState<string | null>(null);
  const [confirmClose, setConfirmClose] = React.useState(false);

  const valid = name.trim().length >= 3 && isValidUrl(url) && events.length > 0;
  const backHref = `/projects/${slug}/developers/webhooks`;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const result = await createMutation.mutateAsync({
        name: name.trim(),
        url: url.trim(),
        subscribedEvents: events,
      });
      setSecret(result.signingSecret);
    } finally {
      setSubmitting(false);
    }
  }

  function attemptLeave() {
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

  if (secret != null) {
    return (
      <>
        <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Step 2 of 2
            </p>
            <h1 className="text-lg font-semibold text-foreground">
              Endpoint created
            </h1>
            <p className="text-xs text-muted-foreground">
              Use this signing secret to verify the{" "}
              <code className="font-mono">X-Semblia-Signature</code> header on
              incoming deliveries.
            </p>
          </div>
          <RevealPanel plaintext={secret} onDone={confirmLeave} />
        </div>

        <ConfirmCloseDialog
          open={confirmClose}
          onOpenChange={setConfirmClose}
          onConfirm={confirmLeave}
        />
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 sm:py-12">
      <button
        type="button"
        onClick={attemptLeave}
        className="mb-4 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3" weight="bold" aria-hidden />
        Back to webhooks
      </button>

      <div className="mb-6 space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Step 1 of 2
        </p>
        <h1 className="text-lg font-semibold text-foreground">
          New webhook endpoint
        </h1>
        <p className="text-xs text-muted-foreground">
          Semblia POSTs signed event payloads to your URL with retries.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && !submitting) handleSubmit();
        }}
        className="space-y-5"
      >
        <div className="space-y-1.5">
          <Label htmlFor="wh-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="wh-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Production listener"
            maxLength={60}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wh-url">
            Endpoint URL <span className="text-destructive">*</span>
          </Label>
          <Input
            id="wh-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/webhooks/semblia"
          />
        </div>

        <EventTypePicker selected={events} onChange={setEvents} />

        {createMutation.isError && (
          <p className="text-[11px] text-destructive">
            Could not create the endpoint. Check the URL and try again.
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
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
            disabled={!valid || submitting}
            className="gap-1.5"
          >
            {submitting ? "Creating…" : "Create endpoint"}
          </Button>
        </div>
      </form>
    </div>
  );
}
