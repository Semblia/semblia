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
 * The email field is a `Combobox` in `multiple` mode used purely for its chip
 * display and removal — there is no item list to pick from here, only free
 * text the composer tokenizes itself on comma/semicolon/whitespace/newline or
 * paste (`email-chips.ts`). Invalid chips stay visible rather than being
 * dropped, so the error names the exact bad address instead of silently
 * losing it from a bulk paste.
 */

import * as React from "react";
import { toast } from "sonner";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react";
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
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
} from "@/components/ui/combobox";
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
        {props.open && <RequestComposerForm {...props} />}
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
function announceRequestResult(result: V2FormRequestDTO) {
  const total = result.recipients.length;
  const suppressed = result.recipients.filter(
    (r) => r.delivery?.status === "SUPPRESSED",
  ).length;
  const failed = result.recipients.filter(
    (r) =>
      r.delivery?.status === "FAILED" || r.delivery?.status === "EXHAUSTED",
  ).length;

  if (suppressed === 0 && failed === 0) {
    toast.success(
      `Request sent to ${total} ${total === 1 ? "person" : "people"}.`,
    );
    return;
  }

  const sent = total - suppressed - failed;
  const parts: string[] = [];
  if (sent > 0) parts.push(`${sent} sent`);
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

  const invalidEmail = emails.find((e) => validateRequestEmail(e) !== null);
  const blocked =
    !formId ||
    emails.length === 0 ||
    invalidEmail !== undefined ||
    send.isPending;

  function commitPending() {
    if (!pendingInput.trim()) return;
    setEmails((prev) => mergeEmailChips(prev, pendingInput));
    setPendingInput("");
  }

  function handleSend() {
    if (blocked || !formId) return;
    setInlineError(null);
    send.mutate(
      { formId, emails, note: note.trim() ? note.trim() : null },
      {
        onSuccess: (result) => {
          announceRequestResult(result);
          onOpenChange(false);
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            setInlineError(error.message);
            return;
          }
          toast.error("Couldn't send the request. Nothing was sent.");
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
          <Combobox<string, true>
            multiple
            value={emails}
            onValueChange={setEmails}
            inputValue={pendingInput}
            onInputValueChange={setPendingInput}
            openOnInputClick={false}
            disabled={send.isPending}
          >
            <ComboboxChips>
              {emails.map((email) => {
                const emailError = validateRequestEmail(email);
                return (
                  <ComboboxChip
                    key={email}
                    className={
                      emailError
                        ? "border border-destructive/50 bg-destructive/10 text-destructive"
                        : undefined
                    }
                  >
                    {email}
                  </ComboboxChip>
                );
              })}
              <ComboboxChipsInput
                id="request-emails"
                aria-invalid={invalidEmail !== undefined || undefined}
                placeholder={
                  emails.length === 0
                    ? "name@example.com, another@example.com"
                    : "Add another…"
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === "," ||
                    event.key === ";"
                  ) {
                    event.preventDefault();
                    commitPending();
                  }
                }}
                onPaste={(event) => {
                  const text = event.clipboardData.getData("text");
                  if (/[,;\s]/.test(text.trim())) {
                    event.preventDefault();
                    setEmails((prev) => mergeEmailChips(prev, text));
                    setPendingInput("");
                  }
                }}
                onBlur={commitPending}
              />
            </ComboboxChips>
          </Combobox>
          <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <span className="min-w-0">
              {invalidEmail !== undefined ? (
                <span className="text-destructive">
                  &ldquo;{invalidEmail}&rdquo; isn&apos;t a complete email
                  address.
                </span>
              ) : (
                "Comma, semicolon, or newline separates addresses."
              )}
            </span>
            <span className="shrink-0 tabular-nums">
              {emails.length}/{MAX_REQUEST_RECIPIENTS}
            </span>
          </div>
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
        const published = isPublished(form);
        const hostedLink = published
          ? hostedFormLink(hostname, form.slug)
          : null;
        const disabled = !hostedLink;
        const disabledReason = hostedLink
          ? null
          : !published
            ? "Not published yet."
            : !form.slug
              ? "Published, but has no public address yet."
              : hostLoading
                ? "Checking this project's public address…"
                : "This project's collection address isn't live yet.";

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
