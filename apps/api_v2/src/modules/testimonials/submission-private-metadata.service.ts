import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";
import { Prisma } from "@workspace/database/prisma";
import {
  decryptSecret,
  encryptSecret,
} from "../../common/crypto/secret-cipher.js";
import { decodeSecretEncryptionKey } from "../../config/env.js";

type PrivateMetadataWriter = {
  submissionPrivateMetadata: {
    create(args: {
      data: Prisma.SubmissionPrivateMetadataUncheckedCreateInput;
    }): Promise<unknown>;
  };
};

type PrivateMetadataRecord = {
  authorEmailEncrypted?: string | null;
};

export type PublicSubmitPrivateMetadataInput = {
  submissionId: string;
  authorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  consentSnapshot?: Record<string, unknown> | null;
};

@Injectable()
export class SubmissionPrivateMetadataService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async createForPublicSubmit(
    writer: PrivateMetadataWriter,
    input: PublicSubmitPrivateMetadataInput,
  ) {
    const authorEmail = this.trimOptional(input.authorEmail);
    const ipAddress = this.trimOptional(input.ipAddress);
    const userAgent = this.trimOptional(input.userAgent);

    if (!authorEmail && !ipAddress && !userAgent && !input.consentSnapshot) {
      return null;
    }

    const key = this.getEncryptionKeyOrThrow();
    return writer.submissionPrivateMetadata.create({
      data: {
        submissionId: input.submissionId,
        authorEmailEncrypted: authorEmail
          ? encryptSecret(authorEmail, key)
          : null,
        authorEmailHash: authorEmail
          ? this.hashIdentifier(authorEmail.toLowerCase())
          : null,
        ipAddressEncrypted: ipAddress ? encryptSecret(ipAddress, key) : null,
        ipAddressHash: ipAddress ? this.hashIdentifier(ipAddress) : null,
        userAgentEncrypted: userAgent ? encryptSecret(userAgent, key) : null,
        userAgentHash: userAgent ? this.hashIdentifier(userAgent) : null,
        ...(input.consentSnapshot
          ? {
              consentSnapshot: this.toJsonObjectInput(input.consentSnapshot),
            }
          : {}),
      },
    });
  }

  decryptAuthorEmail(metadata: PrivateMetadataRecord | null | undefined) {
    if (!metadata?.authorEmailEncrypted) {
      return null;
    }

    return decryptSecret(
      metadata.authorEmailEncrypted,
      this.getEncryptionKeyOrThrow(),
    );
  }

  private hashIdentifier(value: string) {
    return createHash("sha256").update(value, "utf8").digest("hex");
  }

  private trimOptional(value: string | null | undefined) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private toJsonObjectInput(value: Record<string, unknown>) {
    return value as Prisma.InputJsonObject;
  }

  private getEncryptionKeyOrThrow() {
    const key = decodeSecretEncryptionKey(
      this.configService.get<string>("API_V2_SECRET_ENCRYPTION_KEY"),
    );

    if (!key) {
      throw new InternalServerErrorException(
        "Submission private metadata requires API_V2_SECRET_ENCRYPTION_KEY",
      );
    }

    return key;
  }
}
