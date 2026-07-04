import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "node:crypto";
import { NotificationsService } from "../notifications/notifications.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { decodeSecretEncryptionKey } from "../../config/env.js";
import {
  decryptSecret,
  encryptSecret,
} from "../../common/crypto/secret-cipher.js";

@Injectable()
export class SigningSecretService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Optional()
    @Inject(NotificationsService)
    private readonly notificationsService?: NotificationsService,
  ) {}

  async generateOrRotate(projectId: string): Promise<{
    plaintext: string;
    rotatedAt: Date;
  }> {
    const key = this.getEncryptionKeyOrThrow();
    const plaintext = randomBytes(32).toString("base64");
    const rotatedAt = new Date();
    const signingSecretEncrypted = encryptSecret(plaintext, key);
    const secretHash = this.hashSecret(plaintext);
    const nextVersion = await this.getNextVersion(projectId);

    await this.prisma.client.$transaction(async (tx) => {
      await tx.projectSigningSecret.updateMany({
        where: { projectId, status: "ACTIVE" },
        data: {
          status: "REVOKED",
          revokedAt: rotatedAt,
        },
      });

      await tx.projectSigningSecret.create({
        data: {
          projectId,
          version: nextVersion,
          secretEncrypted: signingSecretEncrypted,
          secretHash,
          status: "ACTIVE",
          rotatedAt,
        },
      });

      await tx.project.update({
        where: { id: projectId },
        data: {
          signingSecretEncrypted,
          signingSecretRotatedAt: rotatedAt,
        },
      });
    });

    await this.notificationsService?.createForProjectManagers(projectId, {
      type: "SECURITY_ALERT",
      title: "Signing secret rotated",
      message: "The public submit signing secret was rotated.",
      link: "/projects",
      metadata: {
        projectId,
        action: "signing_secret.rotated",
      },
    });

    return { plaintext, rotatedAt };
  }

  async clear(projectId: string): Promise<void> {
    const revokedAt = new Date();
    await this.prisma.client.$transaction(async (tx) => {
      await tx.projectSigningSecret.updateMany({
        where: { projectId, status: "ACTIVE" },
        data: {
          status: "REVOKED",
          revokedAt,
        },
      });

      await tx.project.update({
        where: { id: projectId },
        data: {
          signingSecretEncrypted: null,
          signingSecretRotatedAt: null,
        },
      });
    });

    await this.notificationsService?.createForProjectManagers(projectId, {
      type: "SECURITY_ALERT",
      title: "Signing secret cleared",
      message: "The public submit signing secret was cleared.",
      link: "/projects",
      metadata: {
        projectId,
        action: "signing_secret.cleared",
      },
    });
  }

  async getActiveDecrypted(projectId: string): Promise<{
    id: string;
    plaintext: string;
  } | null> {
    const key = this.getEncryptionKeyOrThrow();
    const activeSecret =
      await this.prisma.client.projectSigningSecret.findFirst({
        where: { projectId, status: "ACTIVE" },
        orderBy: { version: "desc" },
        select: { id: true, secretEncrypted: true },
      });

    if (!activeSecret) {
      const legacySecret = await this.getDecrypted(projectId);
      return legacySecret
        ? { id: "legacy-project-signing-secret", plaintext: legacySecret }
        : null;
    }

    return {
      id: activeSecret.id,
      plaintext: decryptSecret(activeSecret.secretEncrypted, key),
    };
  }

  async getDecrypted(projectId: string): Promise<string | null> {
    const key = this.getEncryptionKeyOrThrow();
    const activeSecret =
      await this.prisma.client.projectSigningSecret.findFirst({
        where: { projectId, status: "ACTIVE" },
        orderBy: { version: "desc" },
        select: { secretEncrypted: true },
      });

    if (activeSecret) {
      return decryptSecret(activeSecret.secretEncrypted, key);
    }

    const project = await this.prisma.client.project.findUnique({
      where: { id: projectId },
      select: { signingSecretEncrypted: true },
    });

    if (!project?.signingSecretEncrypted) {
      return null;
    }

    return decryptSecret(project.signingSecretEncrypted, key);
  }

  async markUsed(secretId: string, ipAddress: string): Promise<void> {
    if (secretId === "legacy-project-signing-secret") return;

    await this.prisma.client.projectSigningSecret.update({
      where: { id: secretId },
      data: {
        lastUsedAt: new Date(),
        lastUsedFromIpHash: this.hashIdentifier(ipAddress),
      },
    });
  }

  private async getNextVersion(projectId: string) {
    const aggregate = await this.prisma.client.projectSigningSecret.aggregate({
      where: { projectId },
      _max: { version: true },
    });

    return (aggregate._max.version ?? 0) + 1;
  }

  private hashSecret(secret: string) {
    return createHash("sha256").update(secret, "utf8").digest("hex");
  }

  private hashIdentifier(value: string) {
    return createHash("sha256").update(value, "utf8").digest("hex");
  }

  private getEncryptionKeyOrThrow(): Buffer {
    const key = decodeSecretEncryptionKey(
      this.configService.get<string>("API_V2_SECRET_ENCRYPTION_KEY"),
    );

    if (!key) {
      throw new InternalServerErrorException(
        "Signing-secret service requires API_V2_SECRET_ENCRYPTION_KEY",
      );
    }

    return key;
  }
}
