import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { ApiKeyStatus, ApiKeyType, Prisma } from "@workspace/database/prisma";
import { NotificationsService } from "../notifications/notifications.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  apiKeyScopeValues,
  type ApiKeyScope,
  type CreateApiKeyBodyDto,
} from "./api-keys.dto.js";
import {
  generateCredentialSecret,
  hashCredentialSecret,
} from "./api-key-hasher.js";

export const DEFAULT_PRIVATE_API_KEY_SCOPES: ApiKeyScope[] = [
  "project:read",
  "responses:read",
];

const API_KEY_SELECT = {
  id: true,
  name: true,
  keyPrefix: true,
  keyType: true,
  status: true,
  lastFour: true,
  userId: true,
  projectId: true,
  permissions: true,
  scopes: true,
  usageCount: true,
  usageLimit: true,
  rateLimit: true,
  isActive: true,
  lastUsedAt: true,
  expiresAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ApiKeySelect;

type ApiKeyRow = Prisma.ApiKeyGetPayload<{ select: typeof API_KEY_SELECT }>;

type ApiKeyListOptions = {
  keyType?: ApiKeyType;
};

type ManagedApiKeyType = Extract<ApiKeyType, "SECRET" | "AGENT">;

type ApiKeyCreateInput = CreateApiKeyBodyDto & {
  userId: string;
  projectId: string;
  keyType: ManagedApiKeyType;
};

type UsageEventOptions = {
  keyId?: string;
  keyType?: ApiKeyType;
};

@Injectable()
export class ApiKeysService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional()
    @Inject(NotificationsService)
    private readonly notificationsService?: NotificationsService,
  ) {}

  async list(projectId: string, options: ApiKeyListOptions = {}) {
    const keys = await this.prisma.client.apiKey.findMany({
      where: {
        projectId,
        ...(options.keyType ? { keyType: options.keyType } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: API_KEY_SELECT,
    });

    return keys.map((key) => this.toDto(key));
  }

  async create(input: ApiKeyCreateInput) {
    const scopes = this.normalizeScopes(input.scopes, input.keyType);
    const generated = generateCredentialSecret(input.keyType);

    const created = await this.prisma.client.apiKey.create({
      data: {
        name: input.name,
        keyHash: hashCredentialSecret(generated.secret),
        keyPrefix: generated.keyPrefix,
        keyType: input.keyType,
        status: ApiKeyStatus.ACTIVE,
        lastFour: generated.lastFour,
        userId: input.userId,
        projectId: input.projectId,
        permissions: Prisma.JsonNull,
        scopes,
        usageLimit: input.usageLimit ?? null,
        rateLimit: input.rateLimit ?? 100,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        isActive: true,
      },
      select: API_KEY_SELECT,
    });

    await this.notificationsService?.createForProjectManagers(
      input.projectId,
      {
        type: "SECURITY_ALERT",
        title: "Project credential created",
        message: `${input.name} was created.`,
        link: "/projects",
        metadata: {
          projectId: input.projectId,
          keyId: created.id,
          keyType: created.keyType,
          keyName: created.name,
          action: "api_key.created",
        },
      },
      { excludeUserIds: [input.userId] },
    );

    return {
      ...this.toDto(created),
      secret: generated.secret,
      key: generated.secret,
    };
  }

  async rotate(projectId: string, keyId: string, keyType = ApiKeyType.SECRET) {
    const existing = await this.findProjectKeyOrThrow(
      projectId,
      keyId,
      keyType,
    );
    const generated = generateCredentialSecret(
      existing.keyType === ApiKeyType.AGENT ? "AGENT" : "SECRET",
    );

    const updated = await this.prisma.client.apiKey.update({
      where: { id: existing.id },
      data: {
        keyHash: hashCredentialSecret(generated.secret),
        keyPrefix: generated.keyPrefix,
        lastFour: generated.lastFour,
        status: ApiKeyStatus.ACTIVE,
        isActive: true,
        revokedAt: null,
        lastUsedAt: null,
      },
      select: API_KEY_SELECT,
    });

    await this.notificationsService?.createForProjectManagers(
      projectId,
      {
        type: "SECURITY_ALERT",
        title: "Project credential rotated",
        message: `${updated.name} was rotated.`,
        link: "/projects",
        metadata: {
          projectId,
          keyId: updated.id,
          keyType: updated.keyType,
          keyName: updated.name,
          action: "api_key.rotated",
        },
      },
      { excludeUserIds: [updated.userId] },
    );

    return {
      ...this.toDto(updated),
      secret: generated.secret,
      key: generated.secret,
    };
  }

  async revoke(projectId: string, keyId: string, keyType?: ApiKeyType) {
    const existing = await this.findProjectKeyOrThrow(
      projectId,
      keyId,
      keyType,
    );

    const updated = await this.prisma.client.apiKey.update({
      where: { id: existing.id },
      data: {
        status: ApiKeyStatus.REVOKED,
        isActive: false,
        revokedAt: new Date(),
      },
      select: API_KEY_SELECT,
    });

    await this.notificationsService?.createForProjectManagers(
      projectId,
      {
        type: "SECURITY_ALERT",
        title: "Project credential revoked",
        message: `${updated.name} was revoked.`,
        link: "/projects",
        metadata: {
          projectId,
          keyId: updated.id,
          keyType: updated.keyType,
          keyName: updated.name,
          action: "api_key.revoked",
        },
      },
      { excludeUserIds: [updated.userId] },
    );

    return this.toDto(updated);
  }

  async listEvents(projectId: string, keyId: string, keyType?: ApiKeyType) {
    await this.findProjectKeyOrThrow(projectId, keyId, keyType);
    return this.listUsageEvents(projectId, { keyId, keyType });
  }

  async listUsageEvents(projectId: string, options: UsageEventOptions = {}) {
    const rows = await this.prisma.client.apiKeyDailyUsage.findMany({
      where: {
        ...(options.keyId ? { apiKeyId: options.keyId } : {}),
        apiKey: {
          projectId,
          ...(options.keyType ? { keyType: options.keyType } : {}),
        },
      },
      orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
      take: 100,
      select: {
        id: true,
        apiKeyId: true,
        date: true,
        requestCount: true,
        lastRequestAt: true,
        createdAt: true,
        updatedAt: true,
        apiKey: {
          select: {
            id: true,
            name: true,
            keyPrefix: true,
            keyType: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      type: "usage.daily",
      apiKeyId: row.apiKeyId,
      keyName: row.apiKey.name,
      keyPrefix: row.apiKey.keyPrefix,
      keyType: row.apiKey.keyType,
      date: row.date,
      requestCount: row.requestCount,
      occurredAt: row.lastRequestAt ?? row.updatedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  private async findProjectKeyOrThrow(
    projectId: string,
    keyId: string,
    keyType?: ApiKeyType,
  ) {
    const key = await this.prisma.client.apiKey.findFirst({
      where: {
        id: keyId,
        projectId,
        ...(keyType ? { keyType } : {}),
      },
      select: API_KEY_SELECT,
    });

    if (!key) {
      throw new NotFoundException("API key not found");
    }

    return key;
  }

  private normalizeScopes(
    scopes: readonly ApiKeyScope[],
    keyType: ManagedApiKeyType,
  ): ApiKeyScope[] {
    const launchScopes = new Set<string>(apiKeyScopeValues);
    const uniqueScopes = [...new Set(scopes)];
    const invalid = uniqueScopes.filter((scope) => !launchScopes.has(scope));

    if (invalid.length > 0) {
      throw new BadRequestException(`Invalid scopes: ${invalid.join(", ")}`);
    }

    if (keyType === ApiKeyType.AGENT) {
      return uniqueScopes;
    }

    return uniqueScopes.length > 0
      ? uniqueScopes
      : DEFAULT_PRIVATE_API_KEY_SCOPES;
  }

  private toDto(row: ApiKeyRow) {
    return {
      id: row.id,
      name: row.name,
      keyType: row.keyType,
      keyPrefix: row.keyPrefix,
      lastFour: row.lastFour,
      userId: row.userId,
      projectId: row.projectId,
      scopes: row.scopes,
      usageCount: row.usageCount,
      usageLimit: row.usageLimit,
      rateLimit: row.rateLimit,
      status: row.status,
      isActive: row.isActive,
      lastUsedAt: row.lastUsedAt,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
