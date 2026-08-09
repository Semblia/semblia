import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import { ApiKeyStatus, ApiKeyType } from "@workspace/database/prisma";
import {
  buildCredentialActorContext,
  type ActorContext,
} from "../../common/authz/actor-context.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  extractCredentialPrefix,
  verifyCredentialSecret,
} from "./api-key-hasher.js";

export type ApiKeyAuthenticationResult = {
  user: { id: string };
  clerkUserId: string;
  actor: ActorContext;
};

type RequestWithAuthorization = {
  headers?: Record<string, string | string[] | undefined>;
  user?: { id?: string };
  clerkUserId?: string;
  actor?: ActorContext;
};

@Injectable()
export class ApiKeyAuthenticator {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async authenticate(
    secret: string,
  ): Promise<ApiKeyAuthenticationResult | null> {
    const keyPrefix = extractCredentialPrefix(secret);
    if (!keyPrefix) return null;

    const now = new Date();
    const credentials = await this.prisma.client.apiKey.findMany({
      where: {
        keyPrefix,
        status: ApiKeyStatus.ACTIVE,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        id: true,
        keyHash: true,
        keyType: true,
        scopes: true,
        userId: true,
        projectId: true,
        usageCount: true,
        usageLimit: true,
      },
    });

    for (const credential of credentials) {
      if (!verifyCredentialSecret(secret, credential.keyHash)) {
        continue;
      }

      if (
        credential.usageLimit !== null &&
        credential.usageCount >= credential.usageLimit
      ) {
        return null;
      }

      await this.recordUsage(credential.id, now);

      const actorType =
        credential.keyType === ApiKeyType.AGENT ? "agent_key" : "api_key";

      return {
        user: { id: credential.userId },
        clerkUserId: credential.userId,
        actor: buildCredentialActorContext({
          actorType,
          userId: credential.userId,
          projectId: credential.projectId,
          credentialId: credential.id,
          scopes: credential.scopes,
        }),
      };
    }

    return null;
  }

  private async recordUsage(apiKeyId: string, now: Date) {
    const date = now.toISOString().slice(0, 10);

    await this.prisma.client.$transaction([
      this.prisma.client.apiKey.update({
        where: { id: apiKeyId },
        data: {
          lastUsedAt: now,
          usageCount: { increment: 1 },
        },
      }),
      this.prisma.client.apiKeyDailyUsage.upsert({
        where: {
          apiKeyId_date: {
            apiKeyId,
            date,
          },
        },
        update: {
          requestCount: { increment: 1 },
          lastRequestAt: now,
        },
        create: {
          apiKeyId,
          date,
          requestCount: 1,
          lastRequestAt: now,
        },
      }),
    ]);
  }
}

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    @Inject(ApiKeyAuthenticator)
    private readonly authenticator: ApiKeyAuthenticator,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithAuthorization>();
    const authorization = getHeaderValue(request.headers?.authorization);
    if (!authorization?.startsWith("Bearer ")) {
      return false;
    }

    const result = await this.authenticator.authenticate(
      authorization.slice(7),
    );
    if (!result) return false;

    request.user = result.user;
    request.clerkUserId = result.clerkUserId;
    request.actor = result.actor;
    return true;
  }
}

function getHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
