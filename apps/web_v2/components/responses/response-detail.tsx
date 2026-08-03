"use client";

/**
 * ResponseDetail — one response on its own page.
 *
 * List → detail: the queue at `/[slug]/responses` is the index; this screen
 * is the record. Two columns on desktop — the person on the left, what they
 * said on the right, which is wider because reading it is the job. Actions
 * live in one decision bar under the reading column.
 *
 * Emphasis follows the decision (V4): approve carries the fill because it is
 * the common outcome; reject is quiet because it is the consequential one.
 * Destructive actions live behind the overflow, with a real confirmation.
 *
 * Keyboard: A approves, R rejects, Esc returns to the queue.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CaretRight,
  Check,
  Copy,
  X,
  Eye,
  EyeSlash,
  Trash,
  DotsThreeVertical,
  Star,
  UserCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DataState,
  DefinitionList,
  PageBody,
  StatusBadge,
  reviewStatusMeta,
  useDataState,
} from "@/components/shared";
import {
  orDash,
  timeAgo,
  fmtDateTime,
  nameInitials,
  humanizeLabel,
  isEditableTarget,
} from "@/lib/format";
import { formatImportSourceLabel } from "@/lib/imports/source-label";
import { responsesPath } from "@/lib/routes";
import type {
  V2ProjectDTO,
  V2ResponseDTO,
  V2FormResponsePublishStatus,
} from "@workspace/types";
import {
  useResponse,
  useUpdateResponseStatus,
  useUpdateResponsePublish,
  useDeleteResponse,
} from "@/hooks/api";
import { ModerationVerdict } from "./moderation-verdict";

/** Trust modes in words a reviewer can act on — never the raw enum. */
const TRUST_LABELS: Record<string, string> = {
  ORIGIN: "Origin-checked submit",
  HMAC: "Signed submit",
  IMPORT: "Imported",
};

function trustLabel(mode: string): string {
  return TRUST_LABELS[mode] ?? humanizeLabel(mode);
}

const CONSENT_FIELDS: Array<{
  key: keyof V2ResponseDTO["consent"];
  label: string;
}> = [
  { key: "canPublishText", label: "Testimonial" },
  { key: "canPublishName", label: "Name" },
  { key: "canPublishRole", label: "Role" },
  { key: "canPublishCompany", label: "Company" },
  { key: "canPublishAvatar", label: "Photo" },
  { key: "canEditForClarity", label: "Edits for clarity" },
];

type ResponseAnswer = V2ResponseDTO["answers"][number];

export function ResponseDetail({
  project,
  responseId,
}: {
  project: V2ProjectDTO;
  responseId: string;
}) {
  const slug = project.slug;

  const query = useResponse(slug, responseId);
  const response = query.data;
  const state = useDataState(query, { count: response ? 1 : 0 });

  const { busy, decide, handlePublish, handleDelete } = useResponseActions(
    slug,
    responseId,
  );
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  useVerdictKeys({ slug, response, busy, decide });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── One header line: the way back and the record's state ── */}
      <DetailHeader
        slug={slug}
        response={response}
        onRequestDelete={() => setConfirmDelete(true)}
      />

      <PageBody padding="bare" className="flex min-h-0 flex-1 flex-col">
        <DataState
          state={state}
          resource="this response"
          align="center"
          className="min-h-0"
          skeleton={<DetailSkeleton />}
        >
          {response && (
            // One phone column that scrolls as a page, two desktop columns
            // that scroll independently. On the phone the testimonial comes
            // first — reading it is the job; the person and the record's
            // standing follow under the decision.
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-visible">
              {/* ── The person ── */}
              <aside className="order-last shrink-0 border-t border-border lg:order-first lg:w-72 lg:overflow-y-auto lg:border-t-0 lg:border-r xl:w-80">
                <AuthorRail response={response} />
              </aside>

              {/* ── Wider: what they said, and what you may do with it ──
                  The decision bar is the last line of the composition it
                  judges, not a viewport-pinned band — pinning it left a
                  dead void between the evidence and the verdict on short
                  records, and its controls off the content's grid. */}
              <main className="flex min-w-0 flex-col bg-card lg:min-h-0 lg:flex-1">
                <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                  <div className="mx-auto w-full max-w-[44rem] px-5 py-7 sm:px-8">
                    <Testimonial response={response} />
                    <ConsentCard response={response} />
                    <DecisionBar
                      response={response}
                      busy={busy}
                      onApprove={() =>
                        decide("APPROVED", "Approved", "approve")
                      }
                      onReject={() => decide("REJECTED", "Rejected", "reject")}
                      onTogglePublish={handlePublish}
                    />
                  </div>
                </div>
              </main>
            </div>
          )}
        </DataState>
      </PageBody>

      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        intent="danger"
        title="Delete this response?"
        description="This permanently removes the testimonial and its private metadata. This cannot be undone."
        cancelLabel="Keep response"
        confirmLabel="Delete response"
        onConfirm={handleDelete}
      />
    </div>
  );
}

/** One line: the way back, the record's state, and the overflow of last resort. */
function DetailHeader({
  slug,
  response,
  onRequestDelete,
}: {
  slug: string;
  response: V2ResponseDTO | undefined;
  onRequestDelete: () => void;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-5">
      <Button
        asChild
        size="sm"
        variant="ghost"
        className="-ml-2 h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <Link href={responsesPath(slug)}>
          <ArrowLeft className="size-3.5" weight="bold" aria-hidden />
          Responses
        </Link>
      </Button>

      {response && (
        <>
          {/* The identity hero in the rail owns the name — repeating it
              here put the same bold string twice within one glance. */}
          <span aria-hidden className="h-4 w-px bg-border" />
          <StatusBadge {...reviewStatusMeta(response.reviewStatus)} />
          <span
            className="hidden text-[11px] tabular-nums text-muted-foreground sm:inline"
            title={fmtDateTime(response.createdAt)}
          >
            {timeAgo(response.createdAt)}
          </span>

          <div className="ml-auto flex shrink-0 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  aria-label="More actions"
                >
                  <DotsThreeVertical
                    className="size-4"
                    weight="bold"
                    aria-hidden
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem
                  variant="destructive"
                  className="gap-2 text-xs"
                  onSelect={onRequestDelete}
                >
                  <Trash className="size-3.5" weight="bold" aria-hidden />
                  Delete response
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </header>
  );
}

// ── Verbs — the three mutations this record answers to ──────────────────────

function useResponseActions(slug: string, responseId: string) {
  const router = useRouter();
  const statusMutation = useUpdateResponseStatus(slug);
  const publishMutation = useUpdateResponsePublish(slug);
  const deleteMutation = useDeleteResponse(slug);
  const busy =
    statusMutation.isPending ||
    publishMutation.isPending ||
    deleteMutation.isPending;

  // Success speaks in the past tense ("Approved"), failure in the present
  // ("Couldn't approve it") — one label can't do both jobs.
  const decide = React.useCallback(
    (status: string, done: string, verb: string) => {
      statusMutation.mutate(
        { responseId, status },
        {
          onSuccess: () => toast.success(done),
          onError: () => toast.error(`Couldn't ${verb} it.`),
        },
      );
    },
    [responseId, statusMutation],
  );

  const handlePublish = (status: V2FormResponsePublishStatus) => {
    publishMutation.mutate(
      { responseId, status },
      {
        onSuccess: () =>
          toast.success(status === "PUBLISHED" ? "Featured" : "Unfeatured"),
        onError: () => toast.error("Couldn't change how this is displayed."),
      },
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(responseId, {
      onSuccess: () => {
        toast.success("Response deleted");
        router.push(responsesPath(slug));
      },
      onError: () => toast.error("Couldn't delete this response."),
    });
  };

  return { busy, decide, handlePublish, handleDelete };
}

// ── Keyboard: verdict + way back ─────────────────────────────────────────────

/** What each verdict key does — the status to set and both toast tenses. */
const KEY_VERDICTS: Record<
  string,
  { status: string; done: string; verb: string }
> = {
  a: { status: "APPROVED", done: "Approved", verb: "approve" },
  r: { status: "REJECTED", done: "Rejected", verb: "reject" },
};

/** Modified keys belong to the browser, never to this screen. */
function hasModifierKey(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey || event.altKey;
}

/** Verdict keys act only on a pending record with no mutation in flight. */
function awaitingVerdict(
  response: V2ResponseDTO | undefined,
  busy: boolean,
): boolean {
  return !!response && response.reviewStatus === "PENDING" && !busy;
}

function useVerdictKeys({
  slug,
  response,
  busy,
  decide,
}: {
  slug: string;
  response: V2ResponseDTO | undefined;
  busy: boolean;
  decide: (status: string, done: string, verb: string) => void;
}) {
  const router = useRouter();

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (hasModifierKey(event)) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) {
        return;
      }
      if (event.key === "Escape") {
        router.push(responsesPath(slug));
        return;
      }
      if (!awaitingVerdict(response, busy)) return;
      const verdict = KEY_VERDICTS[event.key.toLowerCase()];
      if (!verdict) return;
      event.preventDefault();
      decide(verdict.status, verdict.done, verdict.verb);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, decide, response, router, slug]);
}

// ── Left rail — the person, then everything known about this record ─────────

/**
 * The person is the hero (the reference bar treats a testimonial as a
 * relationship, not a row): a large avatar and the name in display size,
 * then the record's facts as icon rows that read like a contact card.
 * Consent lives with the testimonial in the reading column — it is about
 * what was said, not who said it.
 */
export function AuthorRail({ response }: { response: V2ResponseDTO }) {
  const author = response.authorName?.trim() || "Anonymous";
  const role = response.authorRole?.trim();

  return (
    <div className="divide-y divide-border/70">
      {/* Identity hero — the rail's h1: the person owns this page. */}
      <div className="flex items-center gap-3.5 px-5 py-6">
        <span
          aria-hidden
          className="flex size-13 shrink-0 items-center justify-center rounded-full bg-brand/12 text-base font-semibold text-brand"
        >
          {nameInitials(response.authorName, "?")}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
            {author}
          </h1>
          {role && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {role}
            </p>
          )}
        </div>
      </div>

      {/* The record's fields, on the shared Record primitive. */}
      <div className="px-5 py-2">
        <DefinitionList items={recordItems(response)} />
      </div>

      {/* The machine's opinion, clearly advisory. */}
      <div className="px-5 py-4">
        <h3 className="text-xs font-semibold tracking-tight text-foreground">
          Automated check
        </h3>
        <div className="mt-2">
          <ModerationVerdict runs={response.moderationRuns} />
        </div>
      </div>
    </div>
  );
}

/**
 * The record's facts as term/value rows. Trust is omitted for imports —
 * "Source: Manual" already says it, and the same fact twice down one rail
 * is noise.
 */
function recordItems(response: V2ResponseDTO) {
  return [
    { term: "Company", value: orDash(response.authorCompany) },
    response.origin === "IMPORT"
      ? {
          term: "Source",
          value: <SourceValue response={response} />,
        }
      : { term: "Form", value: response.form?.name ?? "Form" },
    { term: "Received", value: fmtDateTime(response.createdAt) },
    ...(response.origin === "IMPORT"
      ? []
      : [{ term: "Trust", value: trustLabel(response.trustMode) }]),
  ];
}

// ── Right column — the form transcript, question by question ────────────────

/**
 * What the customer was asked, and what they answered — kept together. The
 * old build stripped the questions out and floated a bare quote, which
 * turned a conversation into a database value. Each answer is a card whose
 * header band is the question; the primary testimonial leads and reads
 * larger.
 */
export function Testimonial({ response }: { response: V2ResponseDTO }) {
  const primary = response.answers.find((a) => a.role === "primaryText");
  const ratingShown = response.ratingValue !== null && !!response.ratingScale;
  const others = secondaryAnswers(response.answers, primary, ratingShown);
  const primaryText = primaryAnswerText(primary);

  return (
    <div className="space-y-4">
      {response.ratingValue !== null && response.ratingScale && (
        <RatingRow value={response.ratingValue} scale={response.ratingScale} />
      )}

      {primaryText ? (
        <PrimaryAnswerCard
          origin={response.origin}
          primary={primary}
          text={primaryText}
          hasOthers={others.length > 0}
        />
      ) : (
        <p className="text-sm italic text-muted-foreground">
          No written text — a recording, or left blank.
        </p>
      )}

      {others.map(({ answer, text }) => (
        <AnswerCard
          key={answer.fieldId}
          question={answer.labelSnapshot}
          marker={!answer.publishable ? "not for publication" : undefined}
        >
          {text}
        </AnswerCard>
      ))}
    </div>
  );
}

/** The rating as the row of stars the customer actually chose. */
function RatingRow({ value, scale }: { value: number; scale: number }) {
  return (
    <p
      className="inline-flex items-center gap-1 text-sm font-medium tabular-nums text-amber-500"
      aria-label={`Rated ${value} out of ${scale}`}
    >
      {Array.from({ length: scale }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-5",
            i < value ? "text-amber-500" : "text-muted-foreground/25",
          )}
          weight="fill"
          aria-hidden
        />
      ))}
      <span className="ml-1.5 text-xs text-muted-foreground">
        {value}/{scale}
      </span>
    </p>
  );
}

/** Every answer that reads beside the primary one, rendered-ready. */
function secondaryAnswers(
  answers: V2ResponseDTO["answers"],
  primary: ResponseAnswer | undefined,
  ratingShown: boolean,
) {
  return answers.flatMap((answer) => {
    if (answer === primary) return [];
    // The star row above already states the rating — the same number twice
    // on one screen is noise, not detail.
    if (ratingShown && answer.role === "rating") return [];
    const text = answerDisplay(answer.value);
    return text === null ? [] : [{ answer, text }];
  });
}

/** The written testimonial itself, when there is one. */
function primaryAnswerText(primary: ResponseAnswer | undefined): string | null {
  return typeof primary?.value === "string" && primary.value.trim()
    ? primary.value
    : null;
}

/**
 * The lead card. Imports carry a synthetic label ("Imported proof") — say it
 * in human words instead. The Primary chip only earns its place when there
 * are other answers to rank against (n=1 needs no ranking).
 */
function PrimaryAnswerCard({
  origin,
  primary,
  text,
  hasOthers,
}: {
  origin: V2ResponseDTO["origin"];
  primary: ResponseAnswer | undefined;
  text: string;
  hasOthers: boolean;
}) {
  return (
    <AnswerCard
      lead
      question={
        origin === "IMPORT"
          ? "In their words"
          : (primary?.labelSnapshot ?? "Testimonial")
      }
      chip={
        hasOthers ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/12 px-2 py-0.5 text-[10px] font-semibold text-brand-ink">
            <Star className="size-2.5" weight="fill" aria-hidden />
            Primary
          </span>
        ) : undefined
      }
    >
      {text}
    </AnswerCard>
  );
}

/**
 * One question and its answer, kept together the way the form asked them.
 * A single tinted panel per answer — one container level, the same device
 * as the consent note — never a bordered card inside the reading column.
 */
function AnswerCard({
  question,
  children,
  chip,
  marker,
  lead = false,
}: {
  question: string;
  children: React.ReactNode;
  chip?: React.ReactNode;
  marker?: string;
  lead?: boolean;
}) {
  return (
    <section className="rounded-lg bg-surface px-4 py-3.5">
      <header className="flex items-center gap-2">
        {chip}
        <h3 className="min-w-0 flex-1 truncate text-[11px] font-medium text-muted-foreground">
          {question}
        </h3>
        {marker && (
          <span className="shrink-0 text-[10px] text-muted-foreground/60">
            {marker}
          </span>
        )}
      </header>
      <div
        className={cn(
          "mt-1.5 whitespace-pre-wrap leading-relaxed text-foreground",
          lead ? "text-sm" : "text-[13px]",
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** Both faces of the consent verdict — icon, tint, and sentence agree. */
const CONSENT_STATES = {
  ok: {
    Icon: UserCheck,
    iconClass: "mt-0.5 size-4 shrink-0 text-success",
    surface: "bg-success/8",
    message: "You can use this testimonial publicly.",
  },
  blocked: {
    Icon: WarningCircle,
    iconClass: "mt-0.5 size-4 shrink-0 text-warning",
    surface: "bg-warning/10",
    message: "This can't be shown publicly yet.",
  },
} as const;

/**
 * Consent as the sentence the owner actually needs — "may I use this?" —
 * with the field-by-field matrix tucked behind a disclosure. Six rows of
 * Granted/Withheld up front was a database dump, not an answer.
 */
export function ConsentCard({ response }: { response: V2ResponseDTO }) {
  const ok = response.publishable;
  const state = ok ? CONSENT_STATES.ok : CONSENT_STATES.blocked;
  return (
    <div className={cn("mt-6 rounded-lg px-4 py-3", state.surface)}>
      <div className="flex items-start gap-2.5">
        <state.Icon className={state.iconClass} weight="bold" aria-hidden />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[13px] font-medium text-foreground">
            {state.message}
          </p>
          {!ok && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {response.publishBlockedReason ??
                "The author withheld consent for part of this submission."}
            </p>
          )}
          <ConsentMatrix consent={response.consent} />
        </div>
      </div>
    </div>
  );
}

/** The field-by-field consent matrix, behind the disclosure. */
function ConsentMatrix({ consent }: { consent: V2ResponseDTO["consent"] }) {
  return (
    <details className="group/consent pt-0.5">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-sm text-[11px] font-medium text-foreground/70 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30">
        <CaretRight
          className="size-3 transition-transform duration-(--duration-base) group-open/consent:rotate-90"
          weight="bold"
          aria-hidden
        />
        Consent, in full
      </summary>
      <ul className="mt-2 grid gap-x-8 gap-y-1 sm:grid-cols-2">
        {CONSENT_FIELDS.map(({ key, label }) => (
          <li
            key={key}
            className="flex items-baseline justify-between gap-3 text-xs"
          >
            <span className="text-muted-foreground">{label}</span>
            <span
              className={cn(
                "font-medium",
                consent[key] ? "text-foreground" : "text-muted-foreground/60",
              )}
            >
              {consent[key] ? "Granted" : "Withheld"}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * An answer as displayable text. Multi-select answers arrive as arrays;
 * objects stay excluded — there is no honest one-line rendering of a shape
 * this app doesn't know.
 */
function answerDisplay(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) return answerListDisplay(value);
  return null;
}

function answerListDisplay(values: unknown[]): string | null {
  const parts = values
    .map((item) => answerDisplay(item))
    .filter((item): item is string => item !== null);
  return parts.length > 0 ? parts.join(", ") : null;
}

// ── Decision bar ─────────────────────────────────────────────────────────────

export function DecisionBar({
  response,
  busy,
  onApprove,
  onReject,
  onTogglePublish,
}: {
  response: V2ResponseDTO;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onTogglePublish: (next: V2FormResponsePublishStatus) => void;
}) {
  return (
    <footer className="mt-6 border-t border-border pt-4">
      {response.reviewStatus === "PENDING" ? (
        <PendingVerdict busy={busy} onApprove={onApprove} onReject={onReject} />
      ) : response.reviewStatus === "APPROVED" ? (
        <ApprovedActions
          response={response}
          busy={busy}
          onTogglePublish={onTogglePublish}
        />
      ) : (
        <SettledVerdict response={response} busy={busy} onApprove={onApprove} />
      )}
    </footer>
  );
}

/** The pending record asks one question; the fill belongs to the common answer. */
function PendingVerdict({
  busy,
  onApprove,
  onReject,
}: {
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        className="ink-raised gap-1.5 text-xs"
        disabled={busy}
        onClick={onApprove}
      >
        <Check className="size-3.5" weight="bold" aria-hidden />
        Approve
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
        disabled={busy}
        onClick={onReject}
      >
        <X className="size-3.5" weight="bold" aria-hidden />
        Reject
      </Button>
      <span className="ml-auto hidden text-[11px] text-muted-foreground sm:block">
        <kbd className="font-mono">A</kbd> approve ·{" "}
        <kbd className="font-mono">R</kbd> reject
      </span>
    </div>
  );
}

/** Both faces of the publish toggle — the fill belongs to the forward action. */
const PUBLISH_TOGGLE = {
  published: {
    next: "UNPUBLISHED",
    label: "Remove from widgets",
    Icon: EyeSlash,
    variant: "outline",
    className: "gap-1.5 text-xs",
  },
  unpublished: {
    next: "PUBLISHED",
    label: "Feature in widgets",
    Icon: Eye,
    variant: "default",
    className: "gap-1.5 text-xs ink-raised",
  },
} as const;

function ApprovedActions({
  response,
  busy,
  onTogglePublish,
}: {
  response: V2ResponseDTO;
  busy: boolean;
  onTogglePublish: (next: V2FormResponsePublishStatus) => void;
}) {
  const isPublished = response.publishStatus === "PUBLISHED";
  const blocked = !isPublished && !response.publishable;
  const toggle = isPublished
    ? PUBLISH_TOGGLE.published
    : PUBLISH_TOGGLE.unpublished;
  const copyText = copyPrimary(response);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant={toggle.variant}
        className={toggle.className}
        disabled={busy || blocked}
        onClick={() => onTogglePublish(toggle.next)}
      >
        <toggle.Icon className="size-3.5" weight="bold" aria-hidden />
        {toggle.label}
      </Button>
      {/* The approved record has a next life beyond this queue. */}
      {copyText && (
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={copyText}
        >
          <Copy className="size-3.5" weight="bold" aria-hidden />
          Copy text
        </Button>
      )}
      {blocked && (
        // The reason is stated once, in the consent note this bar sits
        // directly beneath.
        <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted-foreground">
          Consent is missing — see the note above.
        </p>
      )}
    </div>
  );
}

/** A settled record states its standing and keeps one road back open. */
function SettledVerdict({
  response,
  busy,
  onApprove,
}: {
  response: V2ResponseDTO;
  busy: boolean;
  onApprove: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <StatusBadge {...reviewStatusMeta(response.reviewStatus)} />
      <Button
        size="sm"
        variant="ghost"
        className="text-xs"
        disabled={busy}
        onClick={onApprove}
      >
        Approve instead
      </Button>
    </div>
  );
}

/**
 * Clipboard access is a capability, not a given (insecure contexts have
 * no navigator.clipboard) — no button beats a button that throws.
 */
function copyPrimary(response: V2ResponseDTO): (() => void) | undefined {
  const primary = response.answers.find(
    (a) => a.role === "primaryText" && typeof a.value === "string",
  );
  const text = primaryAnswerText(primary);
  if (!text) return undefined;
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return undefined;
  }
  return () => {
    void navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Copied"))
      .catch(() => toast.error("Couldn't copy it."));
  };
}

// ── Provenance pieces ────────────────────────────────────────────────────────

const SAFE_SOURCE_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Imported proof keeps a way back to the original — truncated evidence with
 * no route to the source is not evidence.
 */
function SourceValue({ response }: { response: V2ResponseDTO }) {
  if (response.origin !== "IMPORT") {
    return <>{response.form?.name ?? "Form"}</>;
  }

  const label = formatImportSourceLabel(
    typeof response.sourceMetadata.source === "string"
      ? response.sourceMetadata.source
      : null,
  );
  const href =
    typeof response.sourceMetadata.sourceUrl === "string"
      ? safeSourceUrl(response.sourceMetadata.sourceUrl)
      : null;

  if (!href) return <>{label}</>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`Source: ${label}`}
      className="underline decoration-border underline-offset-2 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      {label}
    </a>
  );
}

function safeSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return SAFE_SOURCE_PROTOCOLS.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

// ── Cold load ────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div aria-hidden className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="shrink-0 space-y-4 border-b border-border px-5 py-6 lg:w-72 lg:border-b-0 lg:border-r xl:w-80">
        <div className="flex items-center gap-3.5">
          <span className="size-13 shrink-0 rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="animate-shimmer h-3.5 w-28" />
            <Skeleton className="animate-shimmer h-2.5 w-20" />
          </div>
        </div>
        <Skeleton className="animate-shimmer h-2.5 w-3/4" />
        <Skeleton className="animate-shimmer h-2.5 w-2/3" />
        <Skeleton className="animate-shimmer h-2.5 w-1/2" />
      </div>
      <div className="flex-1 space-y-4 bg-card px-8 py-7">
        <Skeleton className="animate-shimmer h-4 w-32" />
        <Skeleton className="animate-shimmer h-28 w-full max-w-2xl rounded-lg" />
        <Skeleton className="animate-shimmer h-20 w-full max-w-2xl rounded-lg" />
      </div>
    </div>
  );
}
