/**
 * What the single-record read knows that a list row must not.
 *
 * Three things live here rather than in `ResponsesService`:
 *
 *  • **Contact.** The author's address is encrypted at rest and filtered out of
 *    the display-safe answer set. Releasing it is a deliberate act with its own
 *    capability check, not a field that quietly appears on every row a client
 *    caches. Keeping the decrypt in one place is what makes that reviewable.
 *  • **Media.** A recorded video answer is a MediaAsset id; presenting it means
 *    minting a short-lived signed URL per asset. Doing that for a page of 25
 *    rows would be 25× the work for a column nobody reads, so it happens once,
 *    for the record actually open.
 *  • **The thank-you.** Semblia writing to somebody who has no account here is
 *    the one outbound path in this module, and it is owner-initiated by
 *    construction: nothing is sent until a person with REVIEW_RESPONSES asks
 *    for it. The default body is composed for them; custom and invite are the
 *    two ways to override it.
 */

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Optional,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  EmailTemplateKey,
  MediaAssetStatus,
  Prisma,
} from "@workspace/database/prisma";
import type {
  V2EmailDeliveryStateDTO,
  V2ResponseContactDTO,
  V2ResponseMediaDTO,
  V2ResponseMediaKind,
  V2ResponseThankYouDTO,
  V2ResponseThankYouKind,
  V2SendResponseThankYouResultDTO,
} from "@workspace/types";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  hostedFormUrl,
  requireHostedDelivery,
  requireReachableForm,
} from "../forms/hosted-form-url.js";
import { findDefaultLiveHostname } from "../public-surfaces/default-hostname.js";
import { MediaService } from "../storage/media.service.js";
import { EmailDeliveryService } from "../email/email-delivery.service.js";
import { toDeliveryStateDto } from "../email/email-delivery-state.js";
import type {
  ResponsePublishedEmailPayload,
  ResponseThankYouEmailPayload,
} from "../email/email.types.js";
import { SubmissionPrivateMetadataService } from "./submission-private-metadata.service.js";

/** The annotation label that records a thank-you. */
export const THANK_YOU_LABEL = "thank-you";

/** How long a custom message may be. Long enough to be personal, short enough to be read. */
export const THANK_YOU_MESSAGE_MAX = 2000;

const THANK_YOU_KINDS = new Set<V2ResponseThankYouKind>([
  "DEFAULT",
  "CUSTOM",
  "INVITE",
]);

type AnnotationRecordLike = {
  id: string;
  actorId: string | null;
  labels: string[];
  note: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
};

type ResponseForDetail = {
  id: string;
  projectId: string;
  origin: string;
  authorName: string | null;
  answers: Prisma.JsonValue;
  annotations: AnnotationRecordLike[];
};

type ResponseForPublished = Pick<
  ResponseForDetail,
  "id" | "projectId" | "authorName" | "answers"
> & {
  consent: Prisma.JsonValue | null;
  project?: {
    name: string;
    user: { email: string };
  };
};

type DeliveryStateRecord = {
  status: string;
  suppressionReason: string | null;
  sentAt: Date | null;
};

type PublishedEmailWriter = Pick<
  Prisma.TransactionClient,
  | "emailDelivery"
  | "formResponsePrivateMetadata"
  | "project"
  | "publicSurfaceHost"
>;

export type SendThankYouInput = {
  responseId: string;
  projectId: string;
  kind: V2ResponseThankYouKind;
  message?: string | null;
  formId?: string | null;
  actorId: string | null;
};

@Injectable()
export class ResponseDetailService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SubmissionPrivateMetadataService)
    private readonly privateMetadata: SubmissionPrivateMetadataService,
    @Optional() @Inject(MediaService) private readonly media?: MediaService,
    @Optional()
    @Inject(EmailDeliveryService)
    private readonly emailDelivery?: EmailDeliveryService,
  ) {}

  // ── Contact ───────────────────────────────────────────────────────────────

  /**
   * The author's address, and — when there isn't one — the reason in words the
   * owner can act on. Never a bare null: "no email" and "this form never asked
   * for one" lead to different next steps, and a disabled button with no
   * explanation is the defect this avoids.
   */
  async resolveContact(
    response: ResponseForDetail,
    options: { permitted: boolean },
  ): Promise<V2ResponseContactDTO> {
    if (!options.permitted) {
      return {
        email: null,
        canContact: false,
        unavailableReason:
          "Contact details need the Reviewer role or above on this project.",
      };
    }

    if (response.origin === "IMPORT") {
      return {
        email: null,
        canContact: false,
        unavailableReason:
          "Imported proof carries no address — this person never wrote to you through Semblia.",
      };
    }

    const email = await this.readAuthorEmail(response);
    if (!email) {
      return {
        email: null,
        canContact: false,
        unavailableReason:
          "This submission has no email address. Add an email question to the form to be able to reply.",
      };
    }

    return { email, canContact: true, unavailableReason: null };
  }

  /**
   * The stored address. The encrypted column is the source of truth; the
   * private answer is the fallback for records written before private metadata
   * existed, so an older response is still answerable.
   */
  private async readAuthorEmail(
    response: Pick<ResponseForDetail, "id" | "answers">,
    writer: Pick<Prisma.TransactionClient, "formResponsePrivateMetadata"> = this
      .prisma.client,
  ): Promise<string | null> {
    const stored = await writer.formResponsePrivateMetadata.findUnique({
      where: { responseId: response.id },
      select: { authorEmailEncrypted: true },
    });

    const decrypted = this.privateMetadata.decryptAuthorEmail(stored);
    if (decrypted?.trim()) return decrypted.trim();

    return emailFromAnswers(response.answers);
  }

  // ── Media ─────────────────────────────────────────────────────────────────

  /**
   * Everything recorded or attached with this submission, as playable URLs.
   *
   * Read from the asset's own `responseId` rather than by parsing answer values:
   * the submit path sets that link when it activates the upload, so it stays
   * correct for an answer shape this serializer has never seen. A URL that
   * cannot be signed comes back `null` rather than dropping the asset, because
   * "there is a video here and it will not load" is a different message from
   * "there is no video".
   */
  async resolveMedia(responseId: string): Promise<V2ResponseMediaDTO[]> {
    const assets = await this.prisma.client.mediaAsset.findMany({
      where: { responseId, status: MediaAssetStatus.ACTIVE },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        contentType: true,
        byteSize: true,
        visibility: true,
        createdAt: true,
      },
    });

    return Promise.all(
      assets.map(async (asset) => ({
        assetId: asset.id,
        kind: mediaKind(asset.contentType),
        contentType: asset.contentType,
        byteSize: asset.byteSize,
        url: await this.signAsset(asset.id),
        createdAt: asset.createdAt.toISOString(),
      })),
    );
  }

  private async signAsset(assetId: string): Promise<string | null> {
    if (!this.media) return null;
    try {
      return await this.media.mintPresignedGet(assetId);
    } catch {
      // A public asset, a reaped asset, or storage being unreachable. The row
      // still renders and says the file could not be opened.
      return null;
    }
  }

  // ── The thank-you ─────────────────────────────────────────────────────────

  /**
   * The most recent thank-you, queried rather than filtered out of the
   * record's annotation list.
   *
   * That list is capped (`take: 20`) for the timeline it feeds, so on a
   * heavily-annotated response the thank-you falls off the end and the screen
   * offers to send one that was already sent. Asking the database for the
   * labelled row directly has no such ceiling.
   */
  async resolveThankYou(
    responseId: string,
    projectId: string,
  ): Promise<V2ResponseThankYouDTO | null> {
    const sent = await this.prisma.client.formResponseAnnotation.findFirst({
      where: { responseId, labels: { has: THANK_YOU_LABEL } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        actorId: true,
        labels: true,
        note: true,
        metadata: true,
        createdAt: true,
      },
    });
    return sent ? this.toThankYouDto(sent, projectId) : null;
  }

  /** The most recent thank-you within an already-loaded annotation list. */
  async readThankYou(
    response: ResponseForDetail,
  ): Promise<V2ResponseThankYouDTO | null> {
    const sent = response.annotations
      .filter((annotation) => annotation.labels.includes(THANK_YOU_LABEL))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    return sent ? this.toThankYouDto(sent, response.projectId) : null;
  }

  private async toThankYouDto(
    sent: AnnotationRecordLike,
    projectId: string,
  ): Promise<V2ResponseThankYouDTO> {
    const metadata = readJsonObject(sent.metadata);
    const kind = readString(metadata.kind);
    const delivery = await this.readDeliveryState(
      readString(metadata.deliveryId),
      projectId,
    );
    return {
      kind: THANK_YOU_KINDS.has(kind as V2ResponseThankYouKind)
        ? (kind as V2ResponseThankYouKind)
        : "DEFAULT",
      message: sent.note,
      formId: readString(metadata.formId),
      formName: readString(metadata.formName),
      sentAt: sent.createdAt.toISOString(),
      sentByActorId: sent.actorId,
      delivery,
    };
  }

  /**
   * Send one. Everything is resolved and validated before a delivery row is
   * written, so a rejected send leaves no trace and no annotation claiming a
   * thank-you the author never received.
   */
  async sendThankYou(
    input: SendThankYouInput,
  ): Promise<V2SendResponseThankYouResultDTO> {
    const response = await this.loadForThankYou(input.responseId);
    const recipient = await this.requireRecipient(response);
    const message = this.requireMessage(input);
    const form = await this.requireInviteForm(input);

    const payload: ResponseThankYouEmailPayload = {
      kind: input.kind,
      projectName: response.project.name,
      ownerEmail: response.project.user.email,
      authorName: response.authorName,
      quote: primaryText(response.answers),
      message,
      formName: form?.name ?? null,
      formUrl: form
        ? await hostedFormUrl(
            this.prisma.client,
            input.projectId,
            form.slug,
            form.name,
          )
        : null,
    };

    const { deliveryId, delivery, created } = await this.recordSend({
      input,
      response,
      recipient,
      payload,
      form,
    });

    // Only a delivery this call actually created is worth queueing; an existing
    // one is already enqueued, sending, or sent. The enqueue is best-effort:
    // the row is committed, so a broker hiccup leaves a durable PENDING outbox
    // the maintenance cron retries — it must not fail the request after the
    // delivery and its annotation are already written (matching the sibling
    // publish path).
    if (created) {
      try {
        await this.emailDelivery?.enqueueDelivery(deliveryId);
      } catch {
        // Durable PENDING row is the outbox; the maintenance cron retries it.
      }
    }

    return {
      sentTo: recipient,
      kind: input.kind,
      delivery: toDeliveryStateDto(delivery),
    };
  }

  /** The address, or the reason there isn't one — before anything is composed. */
  private async requireRecipient(response: ResponseForDetail): Promise<string> {
    const contact = await this.resolveContact(response, { permitted: true });
    if (!contact.canContact || !contact.email) {
      throw new ConflictException(
        contact.unavailableReason ?? "This author cannot be contacted.",
      );
    }
    return contact.email.toLowerCase();
  }

  /**
   * The delivery and its annotation, written together or not at all.
   *
   * The idempotency key is content-addressed, so pressing Send twice on the
   * same message is one email — but the annotation used to be created
   * unconditionally beside it, which meant the second press left a second
   * "thanked" record for an email that was never sent again. The annotation now
   * follows the insert: it exists exactly when a new delivery does.
   */
  private recordSend(args: {
    input: SendThankYouInput;
    response: { id: string; projectId: string; authorName: string | null };
    recipient: string;
    payload: ResponseThankYouEmailPayload;
    form: { id: string; name: string } | null;
  }): Promise<{
    deliveryId: string;
    delivery: DeliveryStateRecord;
    created: boolean;
  }> {
    const { input, response, recipient, payload, form } = args;
    const idempotencyKey = `response-thank-you:${input.responseId}:${fingerprint(payload)}`;

    return this.prisma.client.$transaction(async (tx) => {
      const existing = await tx.emailDelivery.findUnique({
        where: { idempotencyKey },
        select: {
          id: true,
          status: true,
          suppressionReason: true,
          sentAt: true,
        },
      });
      if (existing) {
        return {
          deliveryId: existing.id,
          delivery: existing,
          created: false,
        };
      }

      // `findUnique` then `create` is check-then-act: two simultaneous sends of
      // the same message both see nothing and both insert. The unique index is
      // what actually decides, so the loser reads the winner's row rather than
      // failing the whole transaction — one email, one annotation, either way.
      let delivery: { id: string } & DeliveryStateRecord;
      try {
        delivery = await tx.emailDelivery.create({
          data: {
            projectId: response.projectId,
            recipientEmail: recipient,
            recipientName: response.authorName,
            template: EmailTemplateKey.RESPONSE_THANK_YOU,
            subject: thankYouSubject(payload),
            payload: payload as unknown as Prisma.InputJsonValue,
            idempotencyKey,
          },
          select: {
            id: true,
            status: true,
            suppressionReason: true,
            sentAt: true,
          },
        });
      } catch (cause) {
        if (!isUniqueViolation(cause)) throw cause;
        const winner = await tx.emailDelivery.findUnique({
          where: { idempotencyKey },
          select: {
            id: true,
            status: true,
            suppressionReason: true,
            sentAt: true,
          },
        });
        if (!winner) throw cause;
        return {
          deliveryId: winner.id,
          delivery: winner,
          created: false,
        };
      }

      await tx.formResponseAnnotation.create({
        data: {
          projectId: response.projectId,
          responseId: response.id,
          actorType: "user",
          actorId: input.actorId,
          labels: [THANK_YOU_LABEL],
          note: payload.message ?? null,
          metadata: {
            kind: input.kind,
            formId: form?.id ?? null,
            formName: form?.name ?? null,
            deliveryId: delivery.id,
          } as Prisma.InputJsonObject,
        },
      });

      return { deliveryId: delivery.id, delivery, created: true };
    });
  }

  private async loadForThankYou(responseId: string) {
    const response = await this.prisma.client.formResponse.findUnique({
      where: { id: responseId },
      select: {
        id: true,
        projectId: true,
        origin: true,
        authorName: true,
        answers: true,
        project: {
          select: {
            name: true,
            user: { select: { email: true } },
          },
        },
        annotations: {
          select: {
            id: true,
            actorId: true,
            labels: true,
            note: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
    });
    if (!response) throw new ConflictException("Response not found");
    return response;
  }

  async sendResponsePublished(
    response: ResponseForPublished,
  ): Promise<{ deliveryId: string; created: boolean } | null> {
    const result = await this.recordResponsePublished(response);
    if (result?.created) {
      await this.enqueueResponsePublished(result.deliveryId);
    }
    return result;
  }

  async recordResponsePublished(
    response: ResponseForPublished,
    writer: PublishedEmailWriter = this.prisma.client,
  ): Promise<{ deliveryId: string; created: boolean } | null> {
    const recipient = await this.readAuthorEmail(response, writer);
    if (!recipient?.trim()) return null;

    const project =
      response.project ??
      (await writer.project.findUnique({
        where: { id: response.projectId },
        select: {
          name: true,
          user: { select: { email: true } },
        },
      }));
    if (!project) return null;

    const idempotencyKey = `email-response-published-${response.id}`;
    const existing = await writer.emailDelivery.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    });
    if (existing) return { deliveryId: existing.id, created: false };

    const hostname = await findDefaultLiveHostname(writer, {
      projectId: response.projectId,
      feature: "WALL",
    });
    const payload: ResponsePublishedEmailPayload = {
      projectName: project.name,
      ownerEmail: project.user.email,
      authorName: consentAllowsName(response.consent)
        ? response.authorName
        : null,
      publishedUrl: hostname ? `https://${hostname}` : null,
    };

    let created: { id: string };
    try {
      created = await writer.emailDelivery.create({
        data: {
          projectId: response.projectId,
          recipientEmail: recipient.trim().toLowerCase(),
          recipientName: response.authorName,
          template: EmailTemplateKey.RESPONSE_PUBLISHED,
          subject: publishedSubject(payload),
          payload: payload as Prisma.InputJsonValue,
          idempotencyKey,
        },
        select: { id: true },
      });
    } catch (cause) {
      if (!isUniqueViolation(cause)) throw cause;
      const winner = await writer.emailDelivery.findUnique({
        where: { idempotencyKey },
        select: { id: true },
      });
      if (!winner) throw cause;
      return { deliveryId: winner.id, created: false };
    }

    return { deliveryId: created.id, created: true };
  }

  async enqueueResponsePublished(deliveryId: string): Promise<void> {
    try {
      await this.emailDelivery?.enqueueDelivery(deliveryId);
    } catch {
      // The durable PENDING row is the outbox; the maintenance cron retries it.
    }
  }

  private async readDeliveryState(
    deliveryId: string | null,
    projectId: string,
  ): Promise<V2EmailDeliveryStateDTO | null> {
    if (!deliveryId) return null;
    // The delivery id is read from client-writable annotation metadata, so the
    // lookup is scoped to the caller's project — a planted id pointing at
    // another tenant's delivery resolves to nothing rather than leaking its
    // send state.
    const delivery = await this.prisma.client.emailDelivery.findFirst({
      where: { id: deliveryId, projectId },
      select: {
        status: true,
        suppressionReason: true,
        sentAt: true,
      },
    });
    return delivery ? toDeliveryStateDto(delivery) : null;
  }

  /** `CUSTOM` is the owner's own words, so it must actually have some. */
  private requireMessage(input: SendThankYouInput): string | null {
    if (input.kind !== "CUSTOM") return null;
    const message = input.message?.trim();
    if (!message) {
      throw new BadRequestException("A custom thank-you needs a message.");
    }
    if (message.length > THANK_YOU_MESSAGE_MAX) {
      throw new BadRequestException(
        `A custom thank-you is at most ${THANK_YOU_MESSAGE_MAX} characters.`,
      );
    }
    return message;
  }

  /**
   * The form an `INVITE` points at, proved to belong to this project and to be
   * reachable. Inviting somebody to a draft, or to another project's form, sends
   * them to a dead address with your name on it.
   */
  private async requireInviteForm(input: SendThankYouInput) {
    if (input.kind !== "INVITE") return null;
    if (!input.formId) {
      throw new BadRequestException("Choose a form to invite them to.");
    }

    const form = await this.prisma.client.form.findFirst({
      where: { id: input.formId, projectId: input.projectId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        currentVersion: true,
      },
    });

    if (!form)
      throw new BadRequestException("That form is not in this project.");
    const reachable = requireReachableForm(form);
    await requireHostedDelivery(this.prisma.client, form);
    return reachable;
  }
}

// ── Pure helpers ────────────────────────────────────────────────────────────

/** Prisma's unique-constraint failure, without depending on its error class. */
function isUniqueViolation(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    (cause as { code?: unknown }).code === "P2002"
  );
}

/**
 * Media kind from the content type, because that is what decides the control
 * that plays it. Anything unrecognized is a file: offering a `<video>` for a
 * PDF is worse than offering a download for a video.
 */
export function mediaKind(contentType: string): V2ResponseMediaKind {
  if (contentType.startsWith("image/")) return "IMAGE";
  if (contentType.startsWith("video/")) return "VIDEO";
  if (contentType.startsWith("audio/")) return "AUDIO";
  return "FILE";
}

/**
 * The first answer this predicate accepts, as trimmed text.
 *
 * Both readers below want the same thing — scan the answers, take the first
 * one that matches and has words in it — and differed only in the predicate.
 * Naming that shape once leaves each reader as its own single line.
 */
function findAnswerText(
  value: Prisma.JsonValue,
  matches: (answer: AnswerObject) => boolean,
): string | null {
  for (const answer of readAnswerObjects(value)) {
    if (!matches(answer)) continue;
    const text = typeof answer.value === "string" ? answer.value.trim() : "";
    if (text) return text;
  }
  return null;
}

/** An answer carrying the author's address, by role or by field type. */
function isEmailAnswer(answer: AnswerObject): boolean {
  return answer.role === "authorEmail" || answer.type === "email";
}

/** The email hiding in the private answers, for records written before encryption. */
export function emailFromAnswers(value: Prisma.JsonValue): string | null {
  return findAnswerText(value, isEmailAnswer);
}

/** The testimonial itself, for quoting back in the thank-you. */
export function primaryText(value: Prisma.JsonValue): string | null {
  return findAnswerText(value, (answer) => answer.role === "primaryText");
}

export function thankYouSubject(payload: ResponseThankYouEmailPayload): string {
  const name = payload.authorName?.trim();
  const greeting = name ? `Thank you, ${name}` : "Thank you";
  return `${greeting} — ${payload.projectName}`.slice(0, 255);
}

function publishedSubject(payload: ResponsePublishedEmailPayload): string {
  return `Your testimonial is live — ${payload.projectName}`.slice(0, 255);
}

function consentAllowsName(value: Prisma.JsonValue | null): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).canPublishName === true
  );
}

/**
 * A stable fingerprint of what the recipient will actually read. Two sends that
 * differ only in a field the email never shows are the same email.
 */
function fingerprint(payload: ResponseThankYouEmailPayload): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        payload.kind,
        payload.message ?? "",
        payload.formUrl ?? "",
      ]),
    )
    .digest("hex")
    .slice(0, 32);
}

type AnswerObject = { role?: unknown; type?: unknown; value?: unknown };

function readAnswerObjects(value: Prisma.JsonValue): AnswerObject[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) =>
    typeof item === "object" && item !== null && !Array.isArray(item)
      ? [item as AnswerObject]
      : [],
  );
}

function readJsonObject(
  value: Prisma.JsonValue | null,
): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
