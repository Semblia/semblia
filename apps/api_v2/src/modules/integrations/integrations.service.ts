import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import {
  DeliveryStatus,
  ExportDestinationProvider,
  ExportDestinationStatus,
  IntegrationAuthStrategy,
  IntegrationProvider,
  Prisma,
} from "@workspace/database/prisma";
import type { Queue } from "bullmq";
import { ProjectActionAuditService } from "../../common/audit/project-action-audit.service.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { generateDeliveryId } from "../outbound-webhooks/outbound-webhooks.service.js";
import type {
  CreateIntegrationConnectionBodyDto,
  CreateNativeIntegrationExportBodyDto,
  UpdateIntegrationConnectionBodyDto,
} from "./integrations.dto.js";
import {
  CONNECTED_ACCOUNT_TOKEN_PROVIDER,
  type ConnectedAccountTokenProvider,
  type ConnectedProvider,
} from "./token-providers/connected-account-token-provider.js";
import type {
  NativeIntegrationProvider,
  NativeIntegrationProviderResult,
} from "./providers/native-integration-provider.js";
import { SlackExportProvider } from "./providers/slack-export.provider.js";
import { NotionExportProvider } from "./providers/notion-export.provider.js";
import { LinearExportProvider } from "./providers/linear-export.provider.js";
import { GithubExportProvider } from "./providers/github-export.provider.js";
import { asRecord } from "./providers/provider-utils.js";

export const NATIVE_INTEGRATION_EXPORT_QUEUE = "native-integration-export";
const MAX_NATIVE_EXPORT_ATTEMPTS = 3;

export type NativeIntegrationDeliveryJob = {
  deliveryId: string;
};

const CONNECTION_SELECT = {
  id: true,
  projectId: true,
  provider: true,
  authStrategy: true,
  connectedByUserId: true,
  clerkProvider: true,
  externalAccountId: true,
  status: true,
  scopes: true,
  config: true,
  lastCheckedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.IntegrationConnectionSelect;

const DESTINATION_SELECT = {
  id: true,
  projectId: true,
  provider: true,
  name: true,
  config: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ExportDestinationSelect;

const DELIVERY_SELECT = {
  id: true,
  projectId: true,
  destinationId: true,
  ruleId: true,
  eventType: true,
  payload: true,
  status: true,
  attempts: true,
  nextAttemptAt: true,
  error: true,
  artifactContent: true,
  artifactContentType: true,
  artifactFilename: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ExportDeliverySelect;

const DELIVERY_WITH_DESTINATION_SELECT = {
  ...DELIVERY_SELECT,
  destination: {
    select: DESTINATION_SELECT,
  },
} satisfies Prisma.ExportDeliverySelect;

type IntegrationConnectionRecord = Prisma.IntegrationConnectionGetPayload<{
  select: typeof CONNECTION_SELECT;
}>;

type ExportDestinationRecord = Prisma.ExportDestinationGetPayload<{
  select: typeof DESTINATION_SELECT;
}>;

type ExportDeliveryRecord = Prisma.ExportDeliveryGetPayload<{
  select: typeof DELIVERY_SELECT;
}>;

type ExportDeliveryWithDestinationRecord = Prisma.ExportDeliveryGetPayload<{
  select: typeof DELIVERY_WITH_DESTINATION_SELECT;
}>;

@Injectable()
export class IntegrationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @InjectQueue(NATIVE_INTEGRATION_EXPORT_QUEUE)
    private readonly exportQueue: Queue<NativeIntegrationDeliveryJob>,
    @Inject(ProjectActionAuditService)
    private readonly actionAudit: ProjectActionAuditService,
    @Inject(CONNECTED_ACCOUNT_TOKEN_PROVIDER)
    private readonly tokenProvider: ConnectedAccountTokenProvider,
    @Inject(SlackExportProvider)
    private readonly slackExportProvider: SlackExportProvider,
    @Inject(NotionExportProvider)
    private readonly notionExportProvider: NotionExportProvider,
    @Inject(LinearExportProvider)
    private readonly linearExportProvider: LinearExportProvider,
    @Inject(GithubExportProvider)
    private readonly githubExportProvider: GithubExportProvider,
  ) {}

  async listConnections(projectId: string) {
    const connections = await this.prisma.client.integrationConnection.findMany(
      {
        where: { projectId },
        orderBy: { createdAt: "desc" },
        select: CONNECTION_SELECT,
      },
    );

    return connections.map((connection) => this.toConnectionDto(connection));
  }

  async createConnection(
    projectId: string,
    body: CreateIntegrationConnectionBodyDto,
    actor: ActorContext | null | undefined,
  ) {
    if (body.authStrategy === "CLERK_OAUTH" && !actor?.userId) {
      throw new ConflictException(
        "Clerk OAuth integration connections require a user actor",
      );
    }

    const created = await this.prisma.client.$transaction(async (tx) => {
      const connection = await tx.integrationConnection.create({
        data: {
          projectId,
          provider: body.provider as IntegrationProvider,
          authStrategy: body.authStrategy as IntegrationAuthStrategy,
          connectedByUserId: actor?.userId ?? null,
          clerkProvider:
            body.clerkProvider ?? defaultClerkProvider(body.provider),
          externalAccountId: body.externalAccountId ?? null,
          scopes: body.scopes,
          config: body.config as Prisma.InputJsonObject,
        },
        select: CONNECTION_SELECT,
      });

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "integration_connection.created",
        targetType: "integration_connection",
        targetId: connection.id,
        metadata: {
          provider: connection.provider,
          authStrategy: connection.authStrategy,
        },
      });

      return connection;
    });

    return this.toConnectionDto(created);
  }

  async updateConnection(
    projectId: string,
    connectionId: string,
    body: UpdateIntegrationConnectionBodyDto,
    actor: ActorContext | null | undefined,
  ) {
    await this.getOwnedConnectionOrThrow(projectId, connectionId);
    const updated = await this.prisma.client.$transaction(async (tx) => {
      const connection = await tx.integrationConnection.update({
        where: { id: connectionId },
        data: {
          ...(body.externalAccountId !== undefined
            ? { externalAccountId: body.externalAccountId }
            : {}),
          ...(body.scopes !== undefined ? { scopes: body.scopes } : {}),
          ...(body.config !== undefined
            ? { config: body.config as Prisma.InputJsonObject }
            : {}),
        },
        select: CONNECTION_SELECT,
      });

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "integration_connection.updated",
        targetType: "integration_connection",
        targetId: connection.id,
        metadata: {
          changedFields: Object.keys(body),
          provider: connection.provider,
        },
      });

      return connection;
    });

    return this.toConnectionDto(updated);
  }

  async disableConnection(
    projectId: string,
    connectionId: string,
    actor: ActorContext | null | undefined,
  ) {
    await this.getOwnedConnectionOrThrow(projectId, connectionId);
    const updated = await this.prisma.client.$transaction(async (tx) => {
      const connection = await tx.integrationConnection.update({
        where: { id: connectionId },
        data: { status: "DISABLED" },
        select: CONNECTION_SELECT,
      });

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "integration_connection.disabled",
        targetType: "integration_connection",
        targetId: connection.id,
        metadata: { provider: connection.provider },
      });

      return connection;
    });

    return this.toConnectionDto(updated);
  }

  async createNativeExport(
    projectId: string,
    connectionId: string,
    body: CreateNativeIntegrationExportBodyDto,
    actor: ActorContext | null | undefined,
  ) {
    const connection = await this.getActiveConnectionOrThrow(
      projectId,
      connectionId,
    );

    const delivery = await this.prisma.client.$transaction(async (tx) => {
      const destination = await this.getOrCreateNativeDestination(
        tx,
        connection,
      );
      const created = await tx.exportDelivery.create({
        data: {
          id: generateDeliveryId("nexp"),
          projectId,
          destinationId: destination.id,
          eventType: body.eventType,
          payload: {
            ...body.payload,
            provider: connection.provider,
            connectionId: connection.id,
          } as Prisma.InputJsonObject,
        },
        select: DELIVERY_SELECT,
      });

      await this.actionAudit.recordWith(tx, {
        projectId,
        actor,
        action: "integration_export.queued",
        targetType: "export_delivery",
        targetId: created.id,
        metadata: {
          provider: connection.provider,
          connectionId: connection.id,
          destinationId: destination.id,
          eventType: body.eventType,
        },
      });

      return created;
    });

    await this.queueNativeExport(delivery.id);
    return this.toDeliveryDto(delivery);
  }

  async processNativeExport(deliveryId: string) {
    const delivery = await this.getDeliveryWithDestinationOrThrow(deliveryId);
    if (!isNativeExportProvider(delivery.destination.provider)) {
      throw new ConflictException(
        "Export delivery is not a native integration",
      );
    }

    const connectionId = getDestinationConnectionId(
      delivery.destination.config,
    );
    const connection = await this.getActiveConnectionOrThrow(
      delivery.projectId,
      connectionId,
    );
    if (!connection.connectedByUserId) {
      throw new ConflictException(
        "Integration connection has no connected user",
      );
    }

    const delivering = await this.prisma.client.exportDelivery.update({
      where: { id: delivery.id },
      data: {
        status: DeliveryStatus.DELIVERING,
        attempts: { increment: 1 },
        error: null,
        nextAttemptAt: null,
      },
      select: DELIVERY_SELECT,
    });

    try {
      const token = await this.tokenProvider.getToken({
        userId: connection.connectedByUserId,
        provider: providerToConnectedProvider(connection.provider),
        requiredScopes: connection.scopes,
      });
      const result = await this.getProvider(connection.provider).deliver({
        token,
        connection: {
          id: connection.id,
          provider: connection.provider,
          config: asRecord(connection.config),
        },
        delivery: {
          id: delivery.id,
          projectId: delivery.projectId,
          eventType: delivery.eventType,
          payload: asRecord(delivery.payload),
        },
      });

      const completed = await this.prisma.client.exportDelivery.update({
        where: { id: delivery.id },
        data: {
          status: DeliveryStatus.SUCCEEDED,
          error: null,
          nextAttemptAt: null,
          completedAt: new Date(),
          payload: {
            ...asRecord(delivery.payload),
            providerResult: compactProviderResult(result),
          } as Prisma.InputJsonObject,
        },
        select: DELIVERY_SELECT,
      });

      return this.toDeliveryDto(completed);
    } catch (error) {
      const failed = await this.markNativeExportFailed(
        delivery,
        delivering.attempts,
        getErrorMessage(error),
      );

      throw new Error(failed.error ?? "Native integration export failed");
    }
  }

  private async getOrCreateNativeDestination(
    tx: Prisma.TransactionClient,
    connection: IntegrationConnectionRecord,
  ): Promise<ExportDestinationRecord> {
    const provider = toExportDestinationProvider(connection.provider);
    const destinations = await tx.exportDestination.findMany({
      where: {
        projectId: connection.projectId,
        provider,
        status: ExportDestinationStatus.ACTIVE,
      },
      select: DESTINATION_SELECT,
    });
    const existing = destinations.find(
      (destination) =>
        getDestinationConnectionIdOrNull(destination.config) === connection.id,
    );
    if (existing) return existing;

    return tx.exportDestination.create({
      data: {
        projectId: connection.projectId,
        provider,
        name: `${providerLabel(connection.provider)} export`,
        config: {
          connectionId: connection.id,
          providerConfig: asRecord(connection.config) as Prisma.InputJsonObject,
        } as Prisma.InputJsonObject,
      },
      select: DESTINATION_SELECT,
    });
  }

  private async markNativeExportFailed(
    delivery: ExportDeliveryWithDestinationRecord,
    attempts: number,
    error: string,
  ) {
    const exhausted = attempts >= MAX_NATIVE_EXPORT_ATTEMPTS;
    return this.prisma.client.exportDelivery.update({
      where: { id: delivery.id },
      data: {
        status: exhausted ? DeliveryStatus.EXHAUSTED : DeliveryStatus.FAILED,
        error,
        nextAttemptAt: exhausted ? null : nextAttemptAt(attempts),
      },
      select: DELIVERY_SELECT,
    });
  }

  private queueNativeExport(deliveryId: string) {
    return this.exportQueue.add(
      "deliver",
      { deliveryId },
      {
        attempts: MAX_NATIVE_EXPORT_ATTEMPTS,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: true,
        removeOnFail: false,
        jobId: `native-integration-export:${deliveryId}`,
      },
    );
  }

  private async getOwnedConnectionOrThrow(
    projectId: string,
    connectionId: string,
  ) {
    const connection = await this.prisma.client.integrationConnection.findFirst(
      {
        where: { id: connectionId, projectId },
        select: CONNECTION_SELECT,
      },
    );

    if (!connection) {
      throw new NotFoundException("Integration connection not found");
    }

    return connection;
  }

  private async getActiveConnectionOrThrow(
    projectId: string,
    connectionId: string,
  ) {
    const connection = await this.getOwnedConnectionOrThrow(
      projectId,
      connectionId,
    );
    if (connection.status !== "ACTIVE") {
      throw new ConflictException("Integration connection is not active");
    }
    return connection;
  }

  private async getDeliveryWithDestinationOrThrow(deliveryId: string) {
    const delivery = await this.prisma.client.exportDelivery.findFirst({
      where: { id: deliveryId },
      select: DELIVERY_WITH_DESTINATION_SELECT,
    });

    if (!delivery) {
      throw new NotFoundException("Export delivery not found");
    }

    return delivery;
  }

  private getProvider(
    provider: IntegrationProvider,
  ): NativeIntegrationProvider {
    switch (provider) {
      case IntegrationProvider.SLACK:
        return this.slackExportProvider;
      case IntegrationProvider.NOTION:
        return this.notionExportProvider;
      case IntegrationProvider.LINEAR:
        return this.linearExportProvider;
      case IntegrationProvider.GITHUB:
        return this.githubExportProvider;
    }
  }

  private toConnectionDto(connection: IntegrationConnectionRecord) {
    return {
      ...connection,
      status: connection.status as "ACTIVE" | "DISABLED" | "REVOKED",
      config: asRecord(connection.config),
    };
  }

  private toDeliveryDto(delivery: ExportDeliveryRecord) {
    return delivery;
  }
}

function toExportDestinationProvider(provider: IntegrationProvider) {
  switch (provider) {
    case IntegrationProvider.SLACK:
      return ExportDestinationProvider.SLACK;
    case IntegrationProvider.NOTION:
      return ExportDestinationProvider.NOTION;
    case IntegrationProvider.LINEAR:
      return ExportDestinationProvider.LINEAR;
    case IntegrationProvider.GITHUB:
      return ExportDestinationProvider.GITHUB;
  }
}

function isNativeExportProvider(provider: ExportDestinationProvider) {
  return (
    provider === ExportDestinationProvider.SLACK ||
    provider === ExportDestinationProvider.NOTION ||
    provider === ExportDestinationProvider.LINEAR ||
    provider === ExportDestinationProvider.GITHUB
  );
}

function providerToConnectedProvider(
  provider: IntegrationProvider,
): ConnectedProvider {
  return provider.toLowerCase() as ConnectedProvider;
}

function defaultClerkProvider(provider: string) {
  return provider.toLowerCase();
}

function providerLabel(provider: IntegrationProvider) {
  return `${provider.charAt(0)}${provider.slice(1).toLowerCase()}`;
}

function getDestinationConnectionId(config: Prisma.JsonValue) {
  const connectionId = getDestinationConnectionIdOrNull(config);
  if (!connectionId) {
    throw new ConflictException(
      "Native export destination is missing integration connection metadata",
    );
  }
  return connectionId;
}

function getDestinationConnectionIdOrNull(config: Prisma.JsonValue) {
  const record = asRecord(config);
  return typeof record.connectionId === "string" ? record.connectionId : null;
}

function compactProviderResult(result: NativeIntegrationProviderResult) {
  return {
    ...(result.externalId ? { externalId: result.externalId } : {}),
    ...(result.externalUrl ? { externalUrl: result.externalUrl } : {}),
  };
}

function nextAttemptAt(attempts: number) {
  return new Date(Date.now() + Math.min(30 * 2 ** attempts, 600) * 1000);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Native integration export failed";
}
