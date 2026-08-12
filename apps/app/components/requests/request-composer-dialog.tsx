"use client";

/**
 * RequestComposerDialog — "ask for a testimonial" instead of waiting for one.
 *
 * Two entry points, one component (WS-D):
 *   • the Requests page's "New request" — `presetForm` is `null`, so the form
 *     picker is shown, disabled in place for anything the API would 409 on
 *   • a form row/card's overflow action — `presetForm` is set, so the picker
 *     is skipped entirely; the row's own action is already disabled unless
 *     the form has a live public link (the same fact the API checks)
 *
 * The email field is a plain controlled input inside the chip shell — the
 * Combobox primitive is list-driven and swallowed free typing here (proved in
 * a real browser), and this field needs none of its machinery: only free text
 * the composer tokenizes itself on comma/semicolon/whitespace/newline or
 * paste (`email-chips.ts`). Invalid chips stay visible rather than being
 * dropped, so the error names the exact bad address instead of silently
 * losing it from a bulk paste. Whatever is still sitting uncommitted in the
 * input is folded into the send — Send never silently drops a typed address.
 */

import * as React from "react";
import { toast } from "sonner";
import { PaperPlaneTiltIcon, XIcon } from "@phosphor-icons/react";
import type { V2FormRequestDTO, V2FormSummaryDTO } from "@workspace/types";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/semblia-api";
import { hostedFormLink } from "@/lib/public-hosts";
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
import {
  useFormsList,
  useProjectHost,
  useCreateFormRequest,
} from "@/hooks/api";
import { isPublished } from "@/lib/forms/intents";
import {
  mergeEmailChips,
  validateRequestEmail,
  MAX_REQUEST_RECIPIENTS,
} from "./email-chips";

const NOTE_MAX = 1000;

export interface RequestComposerDialogProps {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preselects the form and hides the picker — opened from a form row/card. */
  presetForm: { id: string; name: string } | null;
}

export function RequestComposerDialog(props: RequestComposerDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <RequestComposerForm {...props} />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Announces what actually happened to the batch, not just that the write
 * succeeded — mirrors `announceThankYouResult` (`thank-you-dialog.tsx`): a
 * suppressed or failed delivery is recorded, not silently folded into
 * "sent".
 */
function classifyDeliveries(recipients: V2FormRequestDTO["recipients"]) {
  const counts = { sent: 0, suppressed: 0, failed: 0, queued: 0 };
  for (const recipient of recipients) {
    switch (recipient.delivery?.status) {
      case "SENT":
        counts.sent += 1;
        break;
      case "SUPPRESSED":
        counts.suppressed += 1;
        break;
      case "FAILED":
      case "EXHAUSTED":
        counts.failed += 1;
        break;
      // The 201 snapshot is taken before the worker runs, so PENDING is the
      // normal answer — and an enum value this client has never heard of is
      // counted here too rather than inventing a state for it.
      default:
        counts.queued += 1;
        break;
    }
  }
  return counts;
}

function announceRequestResult(result: V2FormRequestDTO) {
  const total = result.recipients.length;
  const { sent, suppressed, failed, queued } = classifyDeliveries(
    result.recipients,
  );

  if (suppressed === 0 && failed === 0) {
    const people = total === 1 ? "person" : "people";
    toast.success(
      queued > 0
        ? `Request queued for ${total} ${people}.`
        : `Request sent to ${total} ${people}.`,
    );
    return;
  }

  const parts: string[] = [];
  if (sent > 0) parts.push(`${sent} sent`);
  if (queued > 0) parts.push(`${queued} queued`);
  if (suppressed > 0) {
    parts.push(
      `${suppressed} ${suppressed === 1 ? "has" : "have"} unsubscribed or delivery off`,
    );
  }
  if (failed > 0) parts.push(`${failed} failed to deliver`);

  toast.warning(`Request recorded for ${total} — ${parts.join(", ")}.`);
}

function RequestComposerForm({
  slug,
  presetForm,
  onOpenChange,
}: RequestComposerDialogProps) {
  const [formId, setFormId] = React.useState<string | null>(
    presetForm?.id ?? null,
  );
  const [emails, setEmails] = React.useState<string[]>([]);
  const [pendingInput, setPendingInput] = React.useState("");
  const [note, setNote] = React.useState("");
  const [inlineError, setInlineError] = React.useState<string | null>(null);

  const formsQuery = useFormsList(slug);
  const collectionHost = useProjectHost(slug, "COLLECTION");
  const send = useCreateFormRequest(slug);

  const forms = formsQuery.data ?? [];
  const selectedForm = presetForm ?? forms.find((f) => f.id === formId) ?? null;

  // What Send would actually submit: committed chips plus whatever is still
  // sitting in the input. Deriving the gate and the payload from the same
  // list is what makes "typed but never pressed Enter" impossible to drop.
  const candidateEmails = React.useMemo(
    () =>
      pendingInput.trim() ? mergeEmailChips(emails, pendingInput) : emails,
    [emails, pendingInput],
  );

  const invalidEmail = candidateEmails.find(
    (e) => validateRequestEmail(e) !== null,
  );
  const blocked =
    !formId ||
    candidateEmails.length === 0 ||
    invalidEmail !== undefined ||
    send.isPending;

  function commitPending() {
    if (!pendingInput.trim()) return;
    setEmails((prev) => mergeEmailChips(prev, pendingInput));
    setPendingInput("");
  }

  function removeEmail(email: string) {
    setEmails((prev) => prev.filter((e) => e !== email));
  }

  function handleSend() {
    if (blocked || !formId) return;
    setInlineError(null);
    // Fold the uncommitted text into visible chips so what the user sees
    // matches what was sent, then send the same candidate list.
    setEmails(candidateEmails);
    setPendingInput("");
    send.mutate(
      {
        formId,
        emails: candidateEmails,
        note: note.trim() ? note.trim() : null,
      },
      {
        onSuccess: (result) => {
          announceRequestResult(result);
          onOpenChange(false);
        },
        onError: (error) => {
          if (
            error instanceof ApiError &&
            (error.status === 400 || error.status === 409)
          ) {
            // Pre-commit rejections — the server proved nothing was created.
            setInlineError(error.message);
            return;
          }
          // A network drop or 5xx can land after the server committed and
          // queued the emails — the client cannot truthfully claim nothing
          // was sent. The list refetch (hook invalidates on error too) is
          // what settles it.
          toast.error(
            "Couldn't confirm the request went through — check the requests list before sending again.",
          );
        },
      },
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Request a testimonial</DialogTitle>
        <DialogDescription>
          {selectedForm
            ? `Emails a link to ${selectedForm.name} and tracks who answers.`
            : "Pick a form, add who to ask, and Semblia emails each one a link."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {!presetForm && (
          <FormPicker
            forms={forms}
            hostname={collectionHost.hostname}
            hostLoading={collectionHost.isLoading}
            loading={formsQuery.isPending}
            failed={formsQuery.isError}
            value={formId}
            onPick={setFormId}
          />
        )}

        <div className="space-y-1.5">
          <label
            htmlFor="request-emails"
            className="text-[13px] font-medium text-foreground"
          >
            Send to
          </label>
          <EmailChipsField
            emails={emails}
            pendingInput={pendingInput}
            invalidEmail={invalidEmail}
            candidateCount={candidateEmails.length}
            disabled={send.isPending}
            onPendingChange={setPendingInput}
            onCommit={commitPending}
            onRemove={removeEmail}
            onPopLast={() => setEmails((prev) => prev.slice(0, -1))}
            onPasteText={(text) => {
              // Paste continues whatever was already typed — "ali" + a pasted
              // "ce@x.com, bob@y.com" must yield alice@x.com, not lose "ali".
              setEmails((prev) => mergeEmailChips(prev, pendingInput + text));
              setPendingInput("");
            }}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="request-note"
            className="text-[13px] font-medium text-foreground"
          >
            Personal note{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </label>
          <Textarea
            id="request-note"
            rows={4}
            value={note}
            maxLength={NOTE_MAX}
            placeholder="Add a line so it doesn't read like a form letter."
            onChange={(event) => setNote(event.target.value)}
          />
          <p className="text-right text-[11px] tabular-nums text-muted-foreground">
            {note.length}/{NOTE_MAX}
          </p>
        </div>

        {inlineError && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 px-3.5 py-3 text-[13px] leading-relaxed text-destructive"
          >
            {inlineError}
          </p>
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
        <Button
          onClick={handleSend}
          disabled={blocked}
          aria-busy={send.isPending}
        >
          {send.isPending ? (
            <>
              <Spinner /> Sending
            </>
          ) : (
            <>
              <PaperPlaneTiltIcon
                className="size-3.5"
                weight="bold"
                aria-hidden
              />
              Send request
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * The chip shell: committed chips (invalid ones flagged in place, never
 * dropped) plus a plain controlled input that commits on Enter/comma/
 * semicolon/blur, pops the last chip on empty-Backspace, and hands
 * multi-address pastes back to the parent for tokenizing.
 */
function EmailChipsField({
  emails,
  pendingInput,
  invalidEmail,
  candidateCount,
  disabled,
  onPendingChange,
  onCommit,
  onRemove,
  onPopLast,
  onPasteText,
}: {
  emails: string[];
  pendingInput: string;
  invalidEmail: string | undefined;
  candidateCount: number;
  disabled: boolean;
  onPendingChange: (value: string) => void;
  onCommit: () => void;
  onRemove: (email: string) => void;
  onPopLast: () => void;
  onPasteText: (text: string) => void;
}) {
  return (
    <>
      <div
        className={cn(
          "flex min-h-8 flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent bg-clip-padding px-2.5 py-1 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30 dark:bg-input/30",
          invalidEmail !== undefined &&
            "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40",
        )}
      >
        {emails.map((email) => (
          <span
            key={email}
            data-slot="request-email-chip"
            className={cn(
              "flex h-[calc(--spacing(5.25))] w-fit items-center justify-center gap-1 rounded-sm bg-muted px-1.5 pr-0 text-xs font-medium whitespace-nowrap text-foreground",
              validateRequestEmail(email) &&
                "border border-destructive/50 bg-destructive/10 text-destructive",
            )}
          >
            {email}
            <Button
              variant="ghost"
              size="icon-xs"
              type="button"
              aria-label={`Remove ${email}`}
              className="-ml-1 opacity-50 hover:opacity-100"
              disabled={disabled}
              onClick={() => onRemove(email)}
            >
              <XIcon className="pointer-events-none" aria-hidden />
            </Button>
          </span>
        ))}
        <input
          id="request-emails"
          type="text"
          value={pendingInput}
          disabled={disabled}
          aria-invalid={invalidEmail !== undefined || undefined}
          className="h-6 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={
            emails.length === 0
              ? "name@example.com, another@example.com"
              : "Add another…"
          }
          onChange={(event) => onPendingChange(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" ||
              event.key === "," ||
              event.key === ";"
            ) {
              event.preventDefault();
              onCommit();
              return;
            }
            if (
              event.key === "Backspace" &&
              pendingInput === "" &&
              emails.length > 0
            ) {
              event.preventDefault();
              onPopLast();
            }
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            if (/[,;\s]/.test(text.trim())) {
              event.preventDefault();
              onPasteText(text);
            }
          }}
          onBlur={onCommit}
        />
      </div>
      <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span className="min-w-0">
          {invalidEmail !== undefined ? (
            <span className="text-destructive">
              &ldquo;{invalidEmail}&rdquo; isn&apos;t a complete email address.
            </span>
          ) : (
            "Comma, semicolon, or newline separates addresses."
          )}
        </span>
        <span className="shrink-0 tabular-nums">
          {candidateCount}/{MAX_REQUEST_RECIPIENTS}
        </span>
      </div>
    </>
  );
}

/**
 * Why a form cannot be requested against, in words naming its own cause —
 * the same fact ladder `useFormActions` gates Share on.
 */
function formPickState(
  form: V2FormSummaryDTO,
  hostname: string | null,
  hostLoading: boolean,
): { disabled: boolean; disabledReason: string | null } {
  const published = isPublished(form);
  const hostedLink =
    published && form.publishedDelivery !== "embed"
      ? hostedFormLink(hostname, form.slug)
      : null;
  if (hostedLink) return { disabled: false, disabledReason: null };
  if (!published)
    return { disabled: true, disabledReason: "Not published yet." };
  if (form.publishedDelivery === "embed") {
    return {
      disabled: true,
      disabledReason:
        "Embedded on your site — it has no hosted page to link to.",
    };
  }
  if (!form.slug) {
    return {
      disabled: true,
      disabledReason: "Published, but has no public address yet.",
    };
  }
  return {
    disabled: true,
    disabledReason: hostLoading
      ? "Checking this project's public address…"
      : "This project's collection address isn't live yet.",
  };
}

/**
 * Radio list of forms this project can request against. Mirrors the
 * `InvitePicker` shape in `thank-you-dialog.tsx`, but disables in place
 * instead of filtering out — the same "never offer an action the API will
 * refuse" rule, applied to a picker rather than a single control.
 */
function FormPicker({
  forms,
  hostname,
  hostLoading,
  loading,
  failed,
  value,
  onPick,
}: {
  forms: V2FormSummaryDTO[];
  hostname: string | null;
  hostLoading: boolean;
  loading: boolean;
  failed: boolean;
  value: string | null;
  onPick: (id: string) => void;
}) {
  if (loading) {
    return (
      <p className="text-[13px] text-muted-foreground">Loading your forms…</p>
    );
  }

  if (failed) {
    return (
      <p className="rounded-lg bg-destructive/10 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
        Your forms could not be loaded. Close this and try again in a moment.
      </p>
    );
  }

  if (forms.length === 0) {
    return (
      <p className="rounded-lg bg-warning/10 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
        This project has no forms yet. Create one before asking for a
        testimonial.
      </p>
    );
  }

  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1.5 text-[13px] font-medium text-foreground">
        Which form?
      </legend>
      {forms.map((form) => {
        const { disabled, disabledReason } = formPickState(
          form,
          hostname,
          hostLoading,
        );

        return (
          <label
            key={form.id}
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5",
              "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/30",
              disabled
                ? "cursor-not-allowed border-border/60 opacity-60"
                : value === form.id
                  ? "border-foreground/30 bg-muted/40"
                  : "border-border hover:bg-muted/25",
            )}
          >
            <input
              type="radio"
              name="request-form"
              value={form.id}
              checked={value === form.id}
              disabled={disabled}
              onChange={() => onPick(form.id)}
              className="mt-0.5 size-3.5 shrink-0 accent-[var(--brand)]"
            />
            <span className="min-w-0">
              <span className="block truncate text-[13px] text-foreground">
                {form.name}
              </span>
              {disabledReason && (
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {disabledReason}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
