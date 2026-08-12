import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { EmailTemplateKey, Prisma } from "@workspace/database/prisma";
import type { V2FormRequestDTO } from "@workspace/types";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import { EmailDeliveryService } from "../email/email-delivery.service.js";
import { toDeliveryStateDto } from "../email/email-delivery-state.js";
import { renderEmailTemplate } from "../email/email-templates.js";
import type { FormRequestEmailPayload } from "../email/email.types.js";
import { hashEmailAddress } from "../email/email-unsubscribe.service.js";
import {
  hostedFormUrl,
  requireHostedDelivery,
  requireReachableForm,
} from "../forms/hosted-form-url.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  CreateFormRequestBodyDto,
  FormRequestsListQueryDto,
} from "./form-requests.dto.js";

export type FormRequestProjectRequest = {
  projectAccess?: { projectId: string };
};

const DELIVERY_STATE_SELECT = {
  status: true,
  suppressionReason: true,
  sentAt: true,
} satisfies Prisma.EmailDeliverySelect;

const FORM_REQUEST_LIST_SELECT = {
  id: true,
  projectId: true,
  formId: true,
  note: true,
  createdByUserId: true,
  createdAt: true,
  form: { select: { name: true, slug: true } },
  recipients: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      submittedAt: true,
      submittedResponseId: true,
      createdAt: true,
      delivery: { select: DELIVERY_STATE_SELECT },
    },
  },
} satisfies Prisma.FormRequestSelect;

type FormRequestRecord = Prisma.FormRequestGetPayload<{
  select: typeof FORM_REQUEST_LIST_SELECT;
}>;

/**
 * How many request emails one project may fan out per UTC day, across all of
 * its composes. The platform-wide EMAIL_DAILY_LIMIT protects the total send
 * budget but is blind to who spends it — without this, one tenant could
 * drain everyone's day with four 50-recipient composes.
 * ponytail: flat per-project bound; replace with a plan-tier budget when
 * billing grows one.
 */
export const FORM_REQUEST_DAILY_RECIPIENT_LIMIT = 200;

@Injectable()
export class FormRequestsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EmailDeliveryService)
    private readonly emailDeliveryService: EmailDeliveryService,
    @Inject(ProjectActionAuditService)
    private readonly actionAudit: ProjectActionAuditService,
  ) {}

  async create(
    body: CreateFormRequestBodyDto,
    request: FormRequestProjectRequest,
    actor: ActorContext | null,
  ): Promise<V2FormRequestDTO> {
    const projectId = this.getProjectIdFromRequest(request);
    const form = await this.prisma.client.form.findFirst({
      where: { id: body.formId, projectId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        currentVersion: true,
        project: {
          select: { id: true, name: true, user: { select: { email: true } } },
        },
      },
    });
    if (!form) {
      throw new BadRequestException("That form is not in this project.");
    }

    const reachable = requireReachableForm(form);
    await requireHostedDelivery(this.prisma.client, form);
    const formUrl = await hostedFormUrl(
      this.prisma.client,
      projectId,
      reachable.slug,
      reachable.name,
    );

    const utcMidnight = new Date();
    utcMidnight.setUTCHours(0, 0, 0, 0);
    const sentToday = await this.prisma.client.formRequestRecipient.count({
      where: { projectId, createdAt: { gte: utcMidnight } },
    });
    if (sentToday + body.emails.length > FORM_REQUEST_DAILY_RECIPIENT_LIMIT) {
      throw new ConflictException(
        `This project has asked ${sentToday} people today; its daily limit is ` +
          `${FORM_REQUEST_DAILY_RECIPIENT_LIMIT}. The count resets at midnight UTC.`,
      );
    }

    // Ids are minted here so the whole fan-out is two createMany statements
    // instead of three round-trips per recipient — 50 recipients must not
    // ride a default-timeout interactive transaction across 151 queries.
    const rows = body.emails.map((email) => {
      const recipientId = randomUUID();
      const payload: FormRequestEmailPayload = {
        ownerEmail: form.project.user.email,
        projectName: form.project.name,
        formName: form.name,
        formUrl,
        note: body.note,
        recipientEmail: email,
      };
      return {
        recipientId,
        deliveryId: randomUUID(),
        email,
        emailHash: hashEmailAddress(email),
        payload,
        subject: renderEmailTemplate({
          template: EmailTemplateKey.FORM_REQUEST,
          payload,
        }).subject,
      };
    });

    const created = await this.prisma.client.$transaction(async (tx) => {
      const requestRow = await tx.formRequest.create({
        data: {
          projectId,
          formId: form.id,
          note: body.note,
          createdByUserId: actor?.userId ?? null,
        },
        select: { id: true },
      });

      // Deliveries first — recipient rows carry the FK to them.
      await tx.emailDelivery.createMany({
        data: rows.map((row) => ({
          id: row.deliveryId,
          projectId,
          recipientEmail: row.email,
          template: EmailTemplateKey.FORM_REQUEST,
          subject: row.subject,
          payload: row.payload as unknown as Prisma.InputJsonObject,
          idempotencyKey: `form-request-${row.recipientId}`,
        })),
      });
      await tx.formRequestRecipient.createMany({
        data: rows.map((row) => ({
          id: row.recipientId,
          requestId: requestRow.id,
          projectId,
          formId: form.id,
          email: row.email,
          emailHash: row.emailHash,
          emailDeliveryId: row.deliveryId,
        })),
      });

      // Inside the transaction: an audit that cannot be written rolls the
      // whole compose back before a single email is queued, so a 500 here is
      // truthful — nothing was sent.
      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "form_request.sent",
        targetType: "form_request",
        targetId: requestRow.id,
        metadata: { formId: form.id, recipientCount: rows.length },
      });

      // Read back the committed shape rather than assembling a local mirror
      // of it — one constant query, and the 201 body carries the DB's own
      // timestamps.
      return tx.formRequest.findUniqueOrThrow({
        where: { id: requestRow.id },
        select: FORM_REQUEST_LIST_SELECT,
      });
    });

    await Promise.allSettled(
      rows.map((row) =>
        this.emailDeliveryService.enqueueDelivery(row.deliveryId),
      ),
    );

    return this.toDto(created);
  }

  async list(
    query: FormRequestsListQueryDto,
    request: FormRequestProjectRequest,
  ): Promise<V2FormRequestDTO[]> {
    const projectId = this.getProjectIdFromRequest(request);
    const requests = await this.prisma.client.formRequest.findMany({
      where: { projectId, ...(query.formId ? { formId: query.formId } : {}) },
      orderBy: { createdAt: "desc" },
      select: FORM_REQUEST_LIST_SELECT,
    });
    return requests.map((item) => this.toDto(item));
  }

  private toDto(request: FormRequestRecord): V2FormRequestDTO {
    return {
      id: request.id,
      projectId: request.projectId,
      formId: request.formId,
      formName: request.form.name,
      formSlug: request.form.slug,
      note: request.note,
      createdByUserId: request.createdByUserId,
      recipients: request.recipients.map((recipient) => ({
        id: recipient.id,
        email: recipient.email,
        delivery: recipient.delivery
          ? toDeliveryStateDto(recipient.delivery)
          : null,
        submittedAt: recipient.submittedAt?.toISOString() ?? null,
        responseId: recipient.submittedResponseId,
        createdAt: recipient.createdAt.toISOString(),
      })),
      createdAt: request.createdAt.toISOString(),
    };
  }

  private getProjectIdFromRequest(request: FormRequestProjectRequest) {
    const projectId = request.projectAccess?.projectId;
    if (!projectId) {
      throw new InternalServerErrorException(
        "FormRequestsService requires request.projectAccess.projectId",
      );
    }
    return projectId;
  }
}
