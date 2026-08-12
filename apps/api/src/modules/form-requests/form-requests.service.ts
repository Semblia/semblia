import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
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

    const deliveryIds: string[] = [];
    const created = await this.prisma.client.$transaction(async (tx) => {
      const requestRow = await tx.formRequest.create({
        data: {
          projectId,
          formId: form.id,
          note: body.note,
          createdByUserId: actor?.userId ?? null,
        },
        select: {
          id: true,
          projectId: true,
          formId: true,
          note: true,
          createdByUserId: true,
          createdAt: true,
        },
      });

      const recipients = [];
      for (const email of body.emails) {
        const recipient = await tx.formRequestRecipient.create({
          data: {
            requestId: requestRow.id,
            projectId,
            formId: form.id,
            email,
            emailHash: hashEmailAddress(email),
          },
          select: {
            id: true,
            email: true,
            submittedAt: true,
            submittedResponseId: true,
            createdAt: true,
          },
        });
        const payload: FormRequestEmailPayload = {
          ownerEmail: form.project.user.email,
          projectName: form.project.name,
          formName: form.name,
          formUrl,
          note: body.note,
          recipientEmail: email,
        };
        const rendered = renderEmailTemplate({
          template: EmailTemplateKey.FORM_REQUEST,
          payload,
        });
        const delivery = await tx.emailDelivery.create({
          data: {
            projectId,
            recipientEmail: email,
            template: EmailTemplateKey.FORM_REQUEST,
            subject: rendered.subject,
            payload: payload as unknown as Prisma.InputJsonObject,
            idempotencyKey: `form-request-${recipient.id}`,
          },
          select: { id: true, ...DELIVERY_STATE_SELECT },
        });
        await tx.formRequestRecipient.update({
          where: { id: recipient.id },
          data: { emailDeliveryId: delivery.id },
        });
        deliveryIds.push(delivery.id);
        recipients.push({ ...recipient, delivery });
      }

      return {
        ...requestRow,
        form: { name: form.name, slug: form.slug },
        recipients,
      };
    });

    await Promise.allSettled(
      deliveryIds.map((deliveryId) =>
        this.emailDeliveryService.enqueueDelivery(deliveryId),
      ),
    );
    await this.actionAudit.record({
      projectId,
      actor,
      action: "form_request.sent",
      targetType: "form_request",
      targetId: created.id,
      metadata: { formId: form.id, recipientCount: created.recipients.length },
    });

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
