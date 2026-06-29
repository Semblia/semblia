import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import {
  DeliveryStatus,
  OutboundWebhookStatus,
  Prisma,
} from "@workspace/database/prisma";
import type { Queue } from "bullmq";
import { createHash, randomBytes } from "node:crypto";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import {
  decryptSecret,
  encryptSecret,
} from "../../common/crypto/secret-cipher.js";
import { paginate } from "../../common/utils/paginate.js";
import { decodeSecretEncryptionKey } from "../../config/env.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { buildOutboundWebhookHeaders } from "./outbound-webhook-signer.js";
import type { OutboundWebhookDispatcher } from "./outbound-webhook-dispatcher.js";
import type {
  CreateOutboundWebhookEndpointBodyDto,
  OutboundWebhookDeliveriesQueryDto,
  UpdateOutboundWebhookEndpointBodyDto,
} from "./outbound-webhooks.dto.js";
import type { OutboundWebhookEventType } from "./outbound-webhook-events.js";

export const OUTBOUND_WEBHOOK_QUEUE = "outbound-webhook-delivery";
const MAX_DELIVERY_ATTEMPTS = 3;

export type OutboundWebhookDeliveryJob = {
  deliveryId: string;
};

const ENDPOINT_SELECT = {
  id: true,
  projectId: true,
  name: true,
  url: true,
  signingSecretEncrypted: true,
  signingSecretHash: true,
  subscribedEvents: true,
  status: true,
  lastSuccessAt: true,
  lastFailureAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OutboundWebhookEndpointSelect;

const DELIVERY_SELECT = {
  id: true,
  endpointId: true,
  projectId: true,
  eventType: true,
  payload: true,
  status: true,
  attempts: true,
  nextAttemptAt: true,
  responseStatus: true,
  responseBodySnippet: true,
  error: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OutboundWebhookDeliverySelect;

const DELIVERY_WITH_ENDPOINT_SELECT = {
  ...DELIVERY_SELECT,
  endpoint: {
    select: ENDPOINT_SELECT,
  },
} satisfies Prisma.OutboundWebhookDeliverySelect;

type EndpointRecord = Prisma.OutboundWebhookEndpointGetPayload<{
  select: typeof ENDPOINT_SELECT;
}>;

type DeliveryRecord = Prisma.OutboundWebhookDeliveryGetPayload<{
  select: typeof DELIVERY_SELECT;
}>;

type DeliveryWithEndpointRecord = Prisma.OutboundWebhookDeliveryGetPayload<{
  select: typeof DELIVERY_WITH_ENDPOINT_SELECT;
}>;

@Injectable()
export class OutboundWebhooksService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @InjectQueue(OUTBOUND_WEBHOOK_QUEUE)
    private readonly deliveryQueue: Queue<OutboundWebhookDeliveryJob>,
    @Inject("OUTBOUND_WEBHOOK_DISPATCHER")
    private readonly dispatcher: OutboundWebhookDispatcher,
    @Inject(ProjectActionAuditService)
    private readonly actionAudit: ProjectActionAuditService,
    @Optional()
    @Inject(NotificationsService)
    private readonly notificationsService?: NotificationsService,
  ) {}

  async listEndpoints(projectId: string) {
    const endpoints = await this.prisma.client.outboundWebhookEndpoint.findMany(
      {
        where: { projectId },
        orderBy: { createdAt: "desc" },
        select: ENDPOINT_SELECT,
      },
    );

    return endpoints.map((endpoint) => this.toEndpointDto(endpoint));
  }

  async getEndpoint(projectId: string, endpointId: string) {
    return this.toEndpointDto(
      await this.getOwnedEndpointOrThrow(projectId, endpointId),
    );
  }

  async createEndpoint(
    projectId: string,
    body: CreateOutboundWebhookEndpointBodyDto,
    actor: ActorContext | null | undefined,
  ) {
    const key = this.getEncryptionKeyOrThrow();
    const signingSecret = this.generateSigningSecret();
    const created = await this.prisma.client.$transaction(async (tx) => {
      const endpoint = await tx.outboundWebhookEndpoint.create({
        data: {
          projectId,
          name: body.name,
          url: body.url,
          signingSecretEncrypted: encryptSecret(signingSecret, key),
          signingSecretHash: this.hashSecret(signingSecret),
          subscribedEvents: body.subscribedEvents,
        },
        select: ENDPOINT_SELECT,
      });

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "outbound_webhook.created",
        targetType: "outbound_webhook_endpoint",
        targetId: endpoint.id,
        metadata: {
          subscribedEvents: endpoint.subscribedEvents,
          url: endpoint.url,
        },
      });

      return endpoint;
    });

    return {
      ...this.toEndpointDto(created),
      signingSecret,
    };
  }

  async updateEndpoint(
    projectId: string,
    endpointId: string,
    body: UpdateOutboundWebhookEndpointBodyDto,
    actor: ActorContext | null | undefined,
  ) {
    await this.getOwnedEndpointOrThrow(projectId, endpointId);
    const updated = await this.prisma.client.$transaction(async (tx) => {
      const endpoint = await tx.outboundWebhookEndpoint.update({
        where: { id: endpointId },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.url !== undefined ? { url: body.url } : {}),
          ...(body.subscribedEvents !== undefined
            ? { subscribedEvents: body.subscribedEvents }
            : {}),
        },
        select: ENDPOINT_SELECT,
      });

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "outbound_webhook.updated",
        targetType: "outbound_webhook_endpoint",
        targetId: endpoint.id,
        metadata: {
          changedFields: Object.keys(body),
        },
      });

      return endpoint;
    });

    return this.toEndpointDto(updated);
  }

  disableEndpoint(
    projectId: string,
    endpointId: string,
    actor: ActorContext | null | undefined,
  ) {
    return this.setEndpointStatus(
      projectId,
      endpointId,
      OutboundWebhookStatus.DISABLED,
      "outbound_webhook.disabled",
      actor,
    );
  }

  revokeEndpoint(
    projectId: string,
    endpointId: string,
    actor: ActorContext | null | undefined,
  ) {
    return this.setEndpointStatus(
      projectId,
      endpointId,
      OutboundWebhookStatus.REVOKED,
      "outbound_webhook.revoked",
      actor,
    );
  }

  async rotateEndpointSecret(
    projectId: string,
    endpointId: string,
    actor: ActorContext | null | undefined,
  ) {
    await this.getOwnedEndpointOrThrow(projectId, endpointId);
    const key = this.getEncryptionKeyOrThrow();
    const signingSecret = this.generateSigningSecret();
    const updated = await this.prisma.client.$transaction(async (tx) => {
      const endpoint = await tx.outboundWebhookEndpoint.update({
        where: { id: endpointId },
        data: {
          signingSecretEncrypted: encryptSecret(signingSecret, key),
          signingSecretHash: this.hashSecret(signingSecret),
        },
        select: ENDPOINT_SELECT,
      });

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "outbound_webhook.secret_rotated",
        targetType: "outbound_webhook_endpoint",
        targetId: endpoint.id,
      });

      return endpoint;
    });

    return {
      ...this.toEndpointDto(updated),
      signingSecret,
    };
  }

  async enqueueEvent(
    projectId: string,
    input: {
      eventType: OutboundWebhookEventType;
      payload: Record<string, unknown>;
    },
  ) {
    const endpoints = await this.prisma.client.outboundWebhookEndpoint.findMany(
      {
        where: {
          projectId,
          status: OutboundWebhookStatus.ACTIVE,
          subscribedEvents: { has: input.eventType },
        },
        select: ENDPOINT_SELECT,
      },
    );

    return Promise.all(
      endpoints.map(async (endpoint) => {
        const deliveryId = generateDeliveryId("del");
        const delivery =
          await this.prisma.client.outboundWebhookDelivery.create({
            data: {
              id: deliveryId,
              endpointId: endpoint.id,
              projectId,
              eventType: input.eventType,
              payload: input.payload as Prisma.InputJsonObject,
            },
            select: DELIVERY_SELECT,
          });

        await this.queueDelivery(delivery.id);
        return this.toDeliveryDto(delivery);
      }),
    );
  }

  async listDeliveries(
    projectId: string,
    query: OutboundWebhookDeliveriesQueryDto,
  ) {
    const where: Prisma.OutboundWebhookDeliveryWhereInput = { projectId };
    if (query.status !== "ALL") {
      where.status = query.status as DeliveryStatus;
    }
    if (query.endpointId) {
      where.endpointId = query.endpointId;
    }
    if (query.eventType) {
      where.eventType = query.eventType;
    }

    const skip = (query.page - 1) * query.pageSize;
    const [total, deliveries] = await Promise.all([
      this.prisma.client.outboundWebhookDelivery.count({ where }),
      this.prisma.client.outboundWebhookDelivery.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
        select: DELIVERY_SELECT,
      }),
    ]);

    return paginate({
      data: deliveries.map((delivery) => this.toDeliveryDto(delivery)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  async getDelivery(projectId: string, deliveryId: string) {
    return this.toDeliveryDto(
      await this.getOwnedDeliveryOrThrow(projectId, deliveryId),
    );
  }

  async retryDelivery(
    projectId: string,
    deliveryId: string,
    actor: ActorContext | null | undefined,
  ) {
    const delivery = await this.getOwnedDeliveryOrThrow(projectId, deliveryId);
    if (
      delivery.status !== DeliveryStatus.FAILED &&
      delivery.status !== DeliveryStatus.EXHAUSTED
    ) {
      throw new ConflictException("Only failed deliveries can be retried");
    }

    const updated = await this.prisma.client.$transaction(async (tx) => {
      const queued = await tx.outboundWebhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: DeliveryStatus.PENDING,
          nextAttemptAt: null,
          error: null,
          responseStatus: null,
          responseBodySnippet: null,
        },
        select: DELIVERY_SELECT,
      });

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "outbound_webhook.delivery_retried",
        targetType: "outbound_webhook_delivery",
        targetId: delivery.id,
        metadata: {
          endpointId: delivery.endpointId,
          eventType: delivery.eventType,
        },
      });

      return queued;
    });

    await this.queueDelivery(updated.id);
    return this.toDeliveryDto(updated);
  }

  async processDelivery(deliveryId: string) {
    const delivery = await this.getDeliveryWithEndpointOrThrow(deliveryId);
    if (delivery.endpoint.status !== OutboundWebhookStatus.ACTIVE) {
      throw new ConflictException("Outbound webhook endpoint is not active");
    }

    const delivering = await this.prisma.client.outboundWebhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: DeliveryStatus.DELIVERING,
        attempts: { increment: 1 },
        error: null,
        nextAttemptAt: null,
      },
      select: DELIVERY_SELECT,
    });

    const rawBody = JSON.stringify(delivery.payload);
    const timestamp = new Date().toISOString();
    const signingSecret = decryptSecret(
      delivery.endpoint.signingSecretEncrypted,
      this.getEncryptionKeyOrThrow(),
    );
    const headers = buildOutboundWebhookHeaders({
      eventType: delivery.eventType,
      deliveryId: delivery.id,
      timestamp,
      rawBody,
      secret: signingSecret,
    });

    try {
      const result = await this.dispatcher.send({
        url: delivery.endpoint.url,
        rawBody,
        headers,
      });

      if (result.status >= 200 && result.status < 300) {
        const updated = await this.prisma.client.outboundWebhookDelivery.update(
          {
            where: { id: delivery.id },
            data: {
              status: DeliveryStatus.SUCCEEDED,
              responseStatus: result.status,
              responseBodySnippet: result.bodySnippet,
              error: null,
              nextAttemptAt: null,
            },
            select: DELIVERY_SELECT,
          },
        );

        await this.prisma.client.outboundWebhookEndpoint.update({
          where: { id: delivery.endpointId },
          data: { lastSuccessAt: new Date() },
          select: { id: true },
        });

        return this.toDeliveryDto(updated);
      }

      const failed = await this.markDeliveryFailed({
        delivery,
        attempts: delivering.attempts,
        responseStatus: result.status,
        responseBodySnippet: result.bodySnippet,
        error: `Webhook returned HTTP ${result.status}`,
      });
      throw new Error(failed.error ?? `Webhook returned HTTP ${result.status}`);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Webhook returned")
      ) {
        throw error;
      }

      const failed = await this.markDeliveryFailed({
        delivery,
        attempts: delivering.attempts,
        error: getErrorMessage(error),
      });
      throw new Error(failed.error ?? "Webhook delivery failed");
    }
  }

  private async setEndpointStatus(
    projectId: string,
    endpointId: string,
    status: OutboundWebhookStatus,
    action: string,
    actor: ActorContext | null | undefined,
  ) {
    await this.getOwnedEndpointOrThrow(projectId, endpointId);
    const updated = await this.prisma.client.$transaction(async (tx) => {
      const endpoint = await tx.outboundWebhookEndpoint.update({
        where: { id: endpointId },
        data: { status },
        select: ENDPOINT_SELECT,
      });

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action,
        targetType: "outbound_webhook_endpoint",
        targetId: endpoint.id,
      });

      return endpoint;
    });

    return this.toEndpointDto(updated);
  }

  private async markDeliveryFailed({
    delivery,
    attempts,
    responseStatus,
    responseBodySnippet,
    error,
  }: {
    delivery: DeliveryWithEndpointRecord;
    attempts: number;
    responseStatus?: number;
    responseBodySnippet?: string;
    error: string;
  }) {
    const exhausted = attempts >= MAX_DELIVERY_ATTEMPTS;
    const updated = await this.prisma.client.outboundWebhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: exhausted ? DeliveryStatus.EXHAUSTED : DeliveryStatus.FAILED,
        responseStatus: responseStatus ?? null,
        responseBodySnippet: responseBodySnippet ?? null,
        error,
        nextAttemptAt: exhausted ? null : nextAttemptAt(attempts),
      },
      select: DELIVERY_SELECT,
    });

    await this.prisma.client.outboundWebhookEndpoint.update({
      where: { id: delivery.endpointId },
      data: { lastFailureAt: new Date() },
      select: { id: true },
    });

    if (exhausted) {
      await this.notificationsService?.createForProjectManagers(
        delivery.projectId,
        {
          type: "OUTBOUND_WEBHOOK_DELIVERY_FAILED",
          title: "Webhook delivery failed",
          message: "An outbound webhook delivery exhausted its retries.",
          link: "/projects",
          metadata: {
            projectId: delivery.projectId,
            deliveryId: delivery.id,
            endpointId: delivery.endpointId,
            eventType: delivery.eventType,
            responseStatus: responseStatus ?? null,
            error,
          },
        },
      );
    }

    return this.toDeliveryDto(updated);
  }

  private queueDelivery(deliveryId: string) {
    return this.deliveryQueue.add(
      "deliver",
      { deliveryId },
      {
        attempts: MAX_DELIVERY_ATTEMPTS,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: true,
        removeOnFail: false,
        jobId: `outbound-webhook-${deliveryId}`,
      },
    );
  }

  private async getOwnedEndpointOrThrow(projectId: string, endpointId: string) {
    const endpoint = await this.prisma.client.outboundWebhookEndpoint.findFirst(
      {
        where: { id: endpointId, projectId },
        select: ENDPOINT_SELECT,
      },
    );

    if (!endpoint) {
      throw new NotFoundException("Outbound webhook endpoint not found");
    }

    return endpoint;
  }

  private async getOwnedDeliveryOrThrow(projectId: string, deliveryId: string) {
    const delivery = await this.prisma.client.outboundWebhookDelivery.findFirst(
      {
        where: { id: deliveryId, projectId },
        select: DELIVERY_SELECT,
      },
    );

    if (!delivery) {
      throw new NotFoundException("Outbound webhook delivery not found");
    }

    return delivery;
  }

  private async getDeliveryWithEndpointOrThrow(deliveryId: string) {
    const delivery = await this.prisma.client.outboundWebhookDelivery.findFirst(
      {
        where: { id: deliveryId },
        select: DELIVERY_WITH_ENDPOINT_SELECT,
      },
    );

    if (!delivery) {
      throw new NotFoundException("Outbound webhook delivery not found");
    }

    return delivery;
  }

  private toEndpointDto(endpoint: EndpointRecord) {
    return {
      id: endpoint.id,
      projectId: endpoint.projectId,
      name: endpoint.name,
      url: endpoint.url,
      subscribedEvents: endpoint.subscribedEvents,
      status: endpoint.status,
      lastSuccessAt: endpoint.lastSuccessAt,
      lastFailureAt: endpoint.lastFailureAt,
      createdAt: endpoint.createdAt,
      updatedAt: endpoint.updatedAt,
    };
  }

  private toDeliveryDto(delivery: DeliveryRecord) {
    return delivery;
  }

  private generateSigningSecret() {
    return `whsec_${randomBytes(32).toString("base64url")}`;
  }

  private hashSecret(secret: string) {
    return createHash("sha256").update(secret, "utf8").digest("hex");
  }

  private getEncryptionKeyOrThrow(): Buffer {
    const key = decodeSecretEncryptionKey(
      this.configService.get<string>("API_V2_SECRET_ENCRYPTION_KEY"),
    );

    if (!key) {
      throw new InternalServerErrorException(
        "Outbound webhook service requires API_V2_SECRET_ENCRYPTION_KEY",
      );
    }

    return key;
  }
}

export function generateDeliveryId(prefix: string) {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

function nextAttemptAt(attempts: number) {
  return new Date(Date.now() + Math.min(30 * 2 ** attempts, 600) * 1000);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Webhook delivery failed";
}
