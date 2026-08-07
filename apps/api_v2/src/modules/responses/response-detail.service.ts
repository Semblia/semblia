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
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";
import {
  EmailTemplateKey,
  MediaAssetStatus,
  Prisma,
} from "@workspace/database/prisma";
import type {
  V2ResponseContactDTO,
  V2ResponseMediaDTO,
  V2ResponseMediaKind,
  V2ResponseThankYouDTO,
  V2ResponseThankYouKind,
} from "@workspace/types";
import { PrismaService } from "../prisma/prisma.service.js";
import { MediaService } from "../storage/media.service.js";
import { EmailDeliveryService } from "../email/email-delivery.service.js";
import type { ResponseThankYouEmailPayload } from "../email/email.types.js";
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
    @Optional() private readonly config?: ConfigService,
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
    response: ResponseForDetail,
  ): Promise<string | null> {
    const stored =
      await this.prisma.client.formResponsePrivateMetadata.findUnique({
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

  /** The most recent thank-you for this response, read off its annotations. */
  readThankYou(response: ResponseForDetail): V2ResponseThankYouDTO | null {
    const sent = response.annotations
      .filter((annotation) => annotation.labels.includes(THANK_YOU_LABEL))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (!sent) return null;

    const metadata = readJsonObject(sent.metadata);
    const kind = readString(metadata.kind);
    return {
      kind: THANK_YOU_KINDS.has(kind as V2ResponseThankYouKind)
        ? (kind as V2ResponseThankYouKind)
        : "DEFAULT",
      message: sent.note,
      formId: readString(metadata.formId),
      formName: readString(metadata.formName),
      sentAt: sent.createdAt.toISOString(),
      sentByActorId: sent.actorId,
    };
  }

  /**
   * Send one. Everything is resolved and validated before a delivery row is
   * written, so a rejected send leaves no trace and no annotation claiming a
   * thank-you the author never received.
   */
  async sendThankYou(input: SendThankYouInput) {
    const response = await this.loadForThankYou(input.responseId);
    const contact = await this.resolveContact(response, { permitted: true });
    if (!contact.canContact || !contact.email) {
      throw new ConflictException(
        contact.unavailableReason ?? "This author cannot be contacted.",
      );
    }

    const message = this.requireMessage(input);
    const form = await this.requireInviteForm(input);

    const payload: ResponseThankYouEmailPayload = {
      kind: input.kind,
      projectName: response.project.name,
      authorName: response.authorName,
      quote: primaryText(response.answers),
      message,
      formName: form?.name ?? null,
      formUrl: form ? this.hostedFormUrl(form.slug) : null,
    };

    const recipient = contact.email.toLowerCase();
    // Content-addressed: pressing Send twice on the same message is one email,
    // while a genuinely different follow-up is a new one.
    const idempotencyKey = `response-thank-you:${input.responseId}:${fingerprint(payload)}`;

    const delivery = await this.prisma.client.emailDelivery.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        projectId: response.projectId,
        recipientEmail: recipient,
        recipientName: response.authorName,
        template: EmailTemplateKey.RESPONSE_THANK_YOU,
        subject: thankYouSubject(payload),
        payload: payload as unknown as Prisma.InputJsonValue,
        idempotencyKey,
      },
      select: { id: true, status: true },
    });

    if (delivery.status === "PENDING" || delivery.status === "FAILED") {
      await this.emailDelivery?.enqueueDelivery(delivery.id);
    }

    await this.prisma.client.formResponseAnnotation.create({
      data: {
        projectId: response.projectId,
        responseId: response.id,
        actorType: "user",
        actorId: input.actorId,
        labels: [THANK_YOU_LABEL],
        note: message,
        metadata: {
          kind: input.kind,
          formId: form?.id ?? null,
          formName: form?.name ?? null,
          deliveryId: delivery.id,
        } as Prisma.InputJsonObject,
      },
    });

    return { sentTo: recipient, kind: input.kind };
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
        project: { select: { name: true } },
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
      select: { id: true, name: true, slug: true, status: true },
    });

    if (!form)
      throw new BadRequestException("That form is not in this project.");
    if (!form.slug || form.status !== "PUBLISHED") {
      throw new ConflictException(
        `${form.name} is not published yet, so its link would not work.`,
      );
    }

    return { id: form.id, name: form.name, slug: form.slug };
  }

  /** Mirrors `apps/web_v2/lib/semblia-urls.ts`; overridable per environment. */
  private hostedFormUrl(slug: string): string {
    const base =
      this.config?.get<string>("FORMS_PUBLIC_BASE_URL")?.trim() ||
      "https://forms.semblia.com/f";
    return `${base.replace(/\/$/, "")}/${encodeURIComponent(slug)}`;
  }
}

// ── Pure helpers ────────────────────────────────────────────────────────────

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

/** The email hiding in the private answers, for records written before encryption. */
export function emailFromAnswers(value: Prisma.JsonValue): string | null {
  for (const answer of readAnswerObjects(value)) {
    const isEmail = answer.role === "authorEmail" || answer.type === "email";
    if (isEmail && typeof answer.value === "string" && answer.value.trim()) {
      return answer.value.trim();
    }
  }
  return null;
}

/** The testimonial itself, for quoting back in the thank-you. */
export function primaryText(value: Prisma.JsonValue): string | null {
  for (const answer of readAnswerObjects(value)) {
    if (
      answer.role === "primaryText" &&
      typeof answer.value === "string" &&
      answer.value.trim()
    ) {
      return answer.value.trim();
    }
  }
  return null;
}

export function thankYouSubject(payload: ResponseThankYouEmailPayload): string {
  const name = payload.authorName?.trim();
  const greeting = name ? `Thank you, ${name}` : "Thank you";
  return `${greeting} — ${payload.projectName}`.slice(0, 255);
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
