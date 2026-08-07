"use client";

/**
 * Thanking the person who vouched for you.
 *
 * The default is written for the owner — that is what "automated" buys them —
 * but it is never sent on their behalf. Somebody clicks Send. A testimonial is
 * a favour, and a favour answered by an automatic email that the person who
 * received the favour never read is worse than silence.
 *
 * Three ways to answer, in the order they get used:
 *   • the message Semblia wrote, shown in full so it is a choice, not a promise
 *   • the owner's own words
 *   • an invitation to another of their forms, for the customer who clearly
 *     has more to say
 *
 * A response with no address cannot be answered at all. That is stated on the
 * disabled control itself (`disabledReason`), never in a tooltip a disabled
 * button cannot receive.
 */

import * as React from "react";
import { toast } from "sonner";
import { ArrowSquareOutIcon, EnvelopeSimpleIcon } from "@phosphor-icons/react";
import type {
  V2ResponseContactDTO,
  V2ResponseThankYouKind,
} from "@workspace/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { useFormsList, useSendResponseThankYou } from "@/hooks/api";
import { hostedFormLink } from "@/lib/semblia-urls";

const MESSAGE_MAX = 2000;

type Mode = V2ResponseThankYouKind;

const MODES: Array<{ value: Mode; label: string; hint: string }> = [
  {
    value: "DEFAULT",
    label: "Our thank-you",
    hint: "A short note from your project, quoting what they wrote.",
  },
  {
    value: "CUSTOM",
    label: "Write my own",
    hint: "Your words, sent as-is under your project's name.",
  },
  {
    value: "INVITE",
    label: "Invite to a form",
    hint: "Thanks them, and links one more of your forms.",
  },
];

export interface ThankYouDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  responseId: string;
  projectName: string;
  authorName: string | null;
  contact: V2ResponseContactDTO;
}

export function ThankYouDialog(props: ThankYouDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {props.open && <ThankYouForm {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function ThankYouForm({
  onOpenChange,
  slug,
  responseId,
  projectName,
  authorName,
  contact,
}: ThankYouDialogProps) {
  const [mode, setMode] = React.useState<Mode>("DEFAULT");
  const [message, setMessage] = React.useState("");
  const [formId, setFormId] = React.useState<string | null>(null);

  const send = useSendResponseThankYou(slug, responseId);
  const formsQuery = useFormsList(slug);
  // Only a published form has a working public link, so only a published form
  // is offerable — inviting somebody to a draft sends them to a dead address
  // with your name on it.
  const invitableForms = React.useMemo(
    () =>
      (formsQuery.data ?? []).filter(
        (form) => form.status === "PUBLISHED" && form.slug,
      ),
    [formsQuery.data],
  );

  const trimmed = message.trim();
  const blocked =
    (mode === "CUSTOM" && (!trimmed || trimmed.length > MESSAGE_MAX)) ||
    (mode === "INVITE" && !formId);

  function handleSend() {
    const body =
      mode === "CUSTOM"
        ? ({ kind: "CUSTOM", message: trimmed } as const)
        : mode === "INVITE"
          ? ({ kind: "INVITE", formId: formId as string } as const)
          : ({ kind: "DEFAULT" } as const);

    send.mutate(body, {
      onSuccess: (result) => {
        toast.success(`Thank-you sent to ${result.sentTo}`);
        onOpenChange(false);
      },
      onError: (error) =>
        toast.error(
          error instanceof Error && error.message
            ? error.message
            : "Couldn't send the thank-you.",
        ),
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Thank {authorName?.trim() || "this reviewer"}</DialogTitle>
        <DialogDescription>
          Sent from {projectName} to {contact.email}. They can reply straight to
          it.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <fieldset>
          <legend className="sr-only">What to send</legend>
          <div className="grid gap-1.5">
            {MODES.map((option) => (
              <ModeRow
                key={option.value}
                option={option}
                checked={mode === option.value}
                onSelect={() => setMode(option.value)}
              />
            ))}
          </div>
        </fieldset>

        {mode === "DEFAULT" && <DefaultPreview projectName={projectName} />}

        {mode === "CUSTOM" && (
          <div className="space-y-1.5">
            <label
              htmlFor="thank-you-message"
              className="text-[13px] font-medium text-foreground"
            >
              Your message
            </label>
            <Textarea
              id="thank-you-message"
              rows={5}
              value={message}
              maxLength={MESSAGE_MAX}
              // `||`, not `??`: a name of "   " trims to "" and would greet
              // the reader with "Hi  —".
              placeholder={`Hi ${authorName?.trim().split(" ")[0] || "there"} — thank you for the kind words about ${projectName}. It made our week.`}
              onChange={(event) => setMessage(event.target.value)}
            />
            {/* Counts what `maxLength` counts — the raw value — so the number
                never disagrees with the field that stops accepting input. */}
            <p className="text-right text-[11px] tabular-nums text-muted-foreground">
              {message.length}/{MESSAGE_MAX}
            </p>
          </div>
        )}

        {mode === "INVITE" && (
          <InvitePicker
            forms={invitableForms}
            loading={formsQuery.isPending}
            failed={formsQuery.isError}
            value={formId}
            onPick={setFormId}
          />
        )}
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={send.isPending}
        >
          Cancel
        </Button>
        <Button onClick={handleSend} disabled={blocked || send.isPending}>
          {send.isPending ? (
            <>
              <Spinner /> Sending
            </>
          ) : (
            <>
              <EnvelopeSimpleIcon
                className="size-3.5"
                weight="bold"
                aria-hidden
              />
              Send thank-you
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * A real radio, not a div that behaves like one: arrow keys, roving focus and
 * the group semantics all come free, and every hand-rolled radio in this app
 * has had to reimplement them badly.
 */
function ModeRow({
  option,
  checked,
  onSelect,
}: {
  option: (typeof MODES)[number];
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5",
        "transition-[background,border-color] duration-(--duration-fast)",
        "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/30",
        checked
          ? "border-foreground/30 bg-muted/40"
          : "border-border hover:bg-muted/25",
      )}
    >
      <input
        type="radio"
        name="thank-you-mode"
        value={option.value}
        checked={checked}
        onChange={onSelect}
        className="mt-0.5 size-3.5 shrink-0 accent-[var(--brand)]"
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-foreground">
          {option.label}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          {option.hint}
        </span>
      </span>
    </label>
  );
}

/** The words that will actually be sent, so "our thank-you" is not a mystery. */
function DefaultPreview({ projectName }: { projectName: string }) {
  return (
    <div className="rounded-lg bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
      <p>
        Thank you for taking the time to write about {projectName}. It genuinely
        helps.
      </p>
      <p className="mt-2">
        Nothing is needed from you — we just wanted to say so.
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground/70">
        Their own words are quoted underneath, so it reads as a reply to what
        they actually said.
      </p>
    </div>
  );
}

function InvitePicker({
  forms,
  loading,
  failed,
  value,
  onPick,
}: {
  forms: Array<{ id: string; name: string; slug: string | null }>;
  loading: boolean;
  /** The forms query failed — distinct from this project having none. */
  failed: boolean;
  value: string | null;
  onPick: (id: string) => void;
}) {
  if (loading) {
    return (
      <p className="text-[13px] text-muted-foreground">Loading your forms…</p>
    );
  }

  // A failed request and an empty project both produce an empty list, and
  // telling somebody to publish a form does not fix a request that never
  // arrived.
  if (failed) {
    return (
      <p className="rounded-lg bg-destructive/10 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
        Your forms could not be loaded, so there is nothing to choose from yet.
        Close this and try again in a moment.
      </p>
    );
  }

  if (forms.length === 0) {
    return (
      <p className="rounded-lg bg-warning/10 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
        You have no published forms to invite them to. Publish a form first — an
        invitation to a draft is a link that does not work.
      </p>
    );
  }

  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1.5 text-[13px] font-medium text-foreground">
        Which form?
      </legend>
      {forms.map((form) => (
        <label
          key={form.id}
          className={cn(
            "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2",
            "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/30",
            value === form.id
              ? "border-foreground/30 bg-muted/40"
              : "border-border hover:bg-muted/25",
          )}
        >
          <input
            type="radio"
            name="thank-you-form"
            checked={value === form.id}
            onChange={() => onPick(form.id)}
            className="size-3.5 shrink-0 accent-[var(--brand)]"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] text-foreground">
              {form.name}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {form.slug ? hostedFormLink(form.slug) : ""}
            </span>
          </span>
          {form.slug && (
            <a
              href={hostedFormLink(form.slug)}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`Open ${form.name} in a new tab`}
              onClick={(event) => event.stopPropagation()}
              className="shrink-0 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <ArrowSquareOutIcon className="size-3.5" aria-hidden />
            </a>
          )}
        </label>
      ))}
    </fieldset>
  );
}
