import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import {
  MediaAssetPurpose,
  MediaAssetStatus,
  MediaAssetVisibility,
  Prisma,
  type MediaAsset,
} from "@workspace/database/prisma";
import type { V2MediaAssetDTO } from "@workspace/types";
import type { ActorContext } from "../../common/authz/actor-context.js";
import { Capability } from "../../common/authz/capabilities.js";
import { ProjectAccessService } from "../../common/authz/project-access.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { PublicSubmitTrustService } from "../testimonials/public-submit-trust.service.js";
import type {
  ConfirmUploadBodyDto,
  CreateUploadIntentBodyDto,
  PublicCreateUploadIntentBodyDto,
} from "./media.dto.js";
import { S3Service } from "./s3.service.js";
import { StorageService } from "./storage.service.js";

const CONFIRM_WINDOW_MS = 10 * 60 * 1000;
const PUBLIC_SUBMIT_WINDOW_MS = 30 * 60 * 1000;

export type SubmissionAttachmentModerationLimits = {
  imagesPerMonth: number;
  maxMediaAssetsPerSubmission: number;
  maxImageBytes: number;
};

@Injectable()
export class MediaService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(S3Service) private readonly s3: S3Service,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(ProjectAccessService)
    private readonly projectAccessService: ProjectAccessService,
    @Inject(PublicSubmitTrustService)
    private readonly publicSubmitTrustService: PublicSubmitTrustService,
  ) {}

  async createUploadIntent(
    actor: ActorContext,
    body: CreateUploadIntentBodyDto,
  ) {
    const purpose = body.purpose as MediaAssetPurpose;
    if (purpose === MediaAssetPurpose.EXPORT_ARTIFACT) {
      throw new ForbiddenException("Export artifacts are internal-only");
    }
    const scope = await this.resolveAuthenticatedScope(actor, body);
    return this.createPendingIntent({
      purpose,
      contentType: body.contentType,
      byteSize: body.byteSize,
      checksumSha256: body.checksumSha256,
      projectId: scope.projectId,
      userId: scope.userId,
      formId: scope.formId,
      actorType: actor.actorType,
      actorId: actor.userId ?? actor.credentialId ?? actor.projectId ?? null,
    });
  }

  async createPublicUploadIntent(
    slug: string,
    body: PublicCreateUploadIntentBodyDto,
    request: Parameters<PublicSubmitTrustService["evaluate"]>[0],
  ) {
    const purpose = body.purpose as MediaAssetPurpose;
    const trust = await this.publicSubmitTrustService.evaluate(request, slug);

    return this.createPendingIntent({
      purpose,
      contentType: body.contentType,
      byteSize: body.byteSize,
      checksumSha256: body.checksumSha256,
      projectId: trust.projectId,
      actorType: "public",
      actorId: trust.principal,
    });
  }

  async confirmUpload(
    actor: ActorContext,
    assetId: string,
    body: ConfirmUploadBodyDto,
  ) {
    const asset = await this.getAssetForActor(assetId, actor);
    if (asset.status !== MediaAssetStatus.PENDING) {
      throw new ConflictException("Media asset is not pending");
    }
    if (Date.now() - asset.createdAt.getTime() > CONFIRM_WINDOW_MS) {
      throw new ConflictException("Upload confirmation window has expired");
    }

    const head = await this.s3.headObject(asset.storageKey);
    const actualSize = Number(head.ContentLength ?? body.byteSize);
    if (actualSize !== body.byteSize) {
      throw new ConflictException("Uploaded object size does not match");
    }

    const updated = await this.prisma.client.mediaAsset.update({
      where: { id: asset.id },
      data: {
        byteSize: actualSize,
        checksumSha256: body.checksumSha256 ?? asset.checksumSha256,
        status: MediaAssetStatus.ACTIVE,
        confirmedAt: new Date(),
      },
    });

    return this.toDto(updated);
  }

  async hardDelete(actor: ActorContext, assetId: string) {
    const asset = await this.getAssetForActor(assetId, actor);
    const deleted = await this.prisma.client.mediaAsset.update({
      where: { id: asset.id },
      data: { status: MediaAssetStatus.DELETED },
    });

    try {
      await this.s3.deleteObject(asset.storageKey);
    } catch {
      // Best-effort S3 delete. The DB status remains authoritative.
    }

    return this.toDto(deleted);
  }

  async mintPresignedGet(assetId: string) {
    const asset = await this.prisma.client.mediaAsset.findUnique({
      where: { id: assetId },
    });
    if (!asset || asset.status !== MediaAssetStatus.ACTIVE) {
      throw new NotFoundException("Media asset not found");
    }
    if (asset.visibility !== MediaAssetVisibility.PRIVATE) {
      throw new BadRequestException("Public assets do not require presigned GET");
    }

    return this.s3.presignGet(asset.storageKey, this.getTtl("S3_PRESIGN_GET_TTL_SECONDS", 300));
  }

  async cloneProjectLogoAsset(input: {
    sourceAssetId: string;
    projectId: string;
    actor: ActorContext;
  }) {
    const source = await this.prisma.client.mediaAsset.findUnique({
      where: { id: input.sourceAssetId },
    });
    if (!source || source.status !== MediaAssetStatus.ACTIVE) {
      throw new NotFoundException("Media asset not found");
    }
    if (!source.storageKey) {
      throw new NotFoundException("Media asset storage key not found");
    }
    const sourceStorageKey = source.storageKey;

    const created = await this.prisma.client.mediaAsset.create({
      data: {
        bucket: this.s3.bucketName,
        storageKey: `pending/${randomUUID()}`,
        contentType: source.contentType,
        byteSize: source.byteSize,
        checksumSha256: source.checksumSha256,
        purpose: MediaAssetPurpose.PROJECT_LOGO,
        visibility: MediaAssetVisibility.PUBLIC,
        status: MediaAssetStatus.ACTIVE,
        projectId: input.projectId,
        createdByActorType: input.actor.actorType,
        createdByActorId:
          input.actor.userId ??
          input.actor.credentialId ??
          input.actor.projectId ??
          input.projectId,
        confirmedAt: new Date(),
      },
    });
    const storageKey = this.storage.keyFor({
      assetId: created.id,
      purpose: MediaAssetPurpose.PROJECT_LOGO,
      visibility: MediaAssetVisibility.PUBLIC,
      contentType: source.contentType,
      projectId: input.projectId,
    });
    await this.s3.copyObject(sourceStorageKey, storageKey);
    return this.prisma.client.mediaAsset.update({
      where: { id: created.id },
      data: { storageKey },
    });
  }

  async getAssetForOwner(input: {
    assetId: string | null | undefined;
    purpose: MediaAssetPurpose;
    projectId?: string | null;
    userId?: string | null;
    statuses?: MediaAssetStatus[];
  }) {
    if (!input.assetId) return null;
    const asset = await this.prisma.client.mediaAsset.findUnique({
      where: { id: input.assetId },
    });
    if (!asset) throw new NotFoundException("Media asset not found");
    if (asset.purpose !== input.purpose) {
      throw new BadRequestException("Media asset purpose does not match");
    }
    if (input.projectId && asset.projectId !== input.projectId) {
      throw new BadRequestException("Media asset belongs to another project");
    }
    if (input.userId && asset.userId !== input.userId) {
      throw new BadRequestException("Media asset belongs to another user");
    }
    const statuses = input.statuses ?? [MediaAssetStatus.ACTIVE];
    if (!statuses.includes(asset.status)) {
      throw new ConflictException("Media asset is not ready");
    }
    return asset;
  }

  async activatePublicSubmitAssets(input: {
    tx: Prisma.TransactionClient;
    assetIds: Array<string | null | undefined>;
    projectId: string;
    principal: string;
  }) {
    const ids = input.assetIds.filter((id): id is string => Boolean(id));
    if (ids.length === 0) return;
    const assets = await input.tx.mediaAsset.findMany({
      where: { id: { in: ids } },
    });
    const now = Date.now();
    for (const asset of assets) {
      if (
        asset.projectId !== input.projectId ||
        asset.createdByActorType !== "public" ||
        asset.createdByActorId !== input.principal ||
        now - asset.createdAt.getTime() > PUBLIC_SUBMIT_WINDOW_MS ||
        !(
          [
            MediaAssetStatus.PENDING,
            MediaAssetStatus.ACTIVE,
          ] as MediaAssetStatus[]
        ).includes(asset.status)
      ) {
        throw new BadRequestException("Invalid submission media asset");
      }
    }
    await input.tx.mediaAsset.updateMany({
      where: { id: { in: ids }, status: MediaAssetStatus.PENDING },
      data: { status: MediaAssetStatus.ACTIVE, confirmedAt: new Date() },
    });
  }

  async attachPublicSubmissionAssets(input: {
    tx: Prisma.TransactionClient;
    assetIds: string[];
    projectId: string;
    formId: string;
    submissionId: string;
    principal: string;
    limits: SubmissionAttachmentModerationLimits;
  }) {
    if (input.assetIds.length === 0) return;
    const uniqueAssetIds = Array.from(new Set(input.assetIds));
    if (uniqueAssetIds.length !== input.assetIds.length) {
      throw new BadRequestException("Duplicate submission media assets");
    }
    if (uniqueAssetIds.length > input.limits.maxMediaAssetsPerSubmission) {
      throw new BadRequestException("Submission media asset limit exceeded");
    }

    const assets = await input.tx.mediaAsset.findMany({
      where: { id: { in: uniqueAssetIds } },
    });
    if (assets.length !== uniqueAssetIds.length) {
      throw new NotFoundException("Media asset not found");
    }

    const imageAssets = assets.filter((asset) =>
      asset.contentType.toLowerCase().startsWith("image/"),
    );
    if (imageAssets.length > 0) {
      const attachedImagesThisMonth = await input.tx.mediaAsset.count({
        where: {
          id: { notIn: uniqueAssetIds },
          projectId: input.projectId,
          purpose: MediaAssetPurpose.SUBMISSION_ATTACHMENT,
          status: MediaAssetStatus.ACTIVE,
          contentType: { startsWith: "image/" },
          submissionId: { not: null },
          createdAt: { gte: startOfUtcMonth(new Date()) },
        },
      });
      if (
        attachedImagesThisMonth + imageAssets.length >
        input.limits.imagesPerMonth
      ) {
        throw new BadRequestException("Monthly image moderation limit exceeded");
      }
    }

    const allowedTypes = this.storage.allowedContentTypes(
      MediaAssetPurpose.SUBMISSION_ATTACHMENT,
    );
    for (const asset of assets) {
      if (asset.purpose !== MediaAssetPurpose.SUBMISSION_ATTACHMENT) {
        throw new BadRequestException("Media asset purpose does not match");
      }
      if (asset.projectId !== input.projectId) {
        throw new BadRequestException("Media asset belongs to another project");
      }
      if (asset.formId && asset.formId !== input.formId) {
        throw new BadRequestException("Media asset belongs to another form");
      }
      if (
        asset.createdByActorType !== "public" ||
        asset.createdByActorId !== input.principal
      ) {
        throw new BadRequestException("Invalid submission media asset");
      }
      if (asset.status !== MediaAssetStatus.ACTIVE) {
        throw new ConflictException("Media asset is not ready");
      }
      if (asset.visibility !== MediaAssetVisibility.PRIVATE) {
        throw new BadRequestException("Submission media asset must be private");
      }
      if (!allowedTypes.includes(asset.contentType)) {
        throw new BadRequestException("Content type is not allowed");
      }
      if (
        asset.contentType.toLowerCase().startsWith("image/") &&
        (asset.byteSize ?? 0) > input.limits.maxImageBytes
      ) {
        throw new BadRequestException("Image exceeds plan moderation limit");
      }
      if (asset.submissionId && asset.submissionId !== input.submissionId) {
        throw new ConflictException("Media asset is already attached");
      }
    }

    await input.tx.mediaAsset.updateMany({
      where: { id: { in: uniqueAssetIds } },
      data: {
        formId: input.formId,
        submissionId: input.submissionId,
      },
    });
  }

  resolvePublicUrl(asset: Pick<MediaAsset, "storageKey" | "visibility"> | null) {
    if (!asset || asset.visibility !== MediaAssetVisibility.PUBLIC) return null;
    return this.storage.publicUrlFor(asset.storageKey);
  }

  toDto(asset: MediaAsset | null): V2MediaAssetDTO | null {
    if (!asset) return null;
    return {
      id: asset.id,
      url: this.resolvePublicUrl(asset),
      contentType: asset.contentType,
      byteSize: asset.byteSize,
      purpose: asset.purpose,
      visibility: asset.visibility,
      status: asset.status,
      createdAt: asset.createdAt.toISOString(),
    };
  }

  private async createPendingIntent(input: {
    purpose: MediaAssetPurpose;
    contentType: string;
    byteSize: number;
    checksumSha256?: string;
    projectId?: string | null;
    userId?: string | null;
    formId?: string | null;
    actorType: string;
    actorId?: string | null;
  }) {
    this.assertContent(input.purpose, input.contentType, input.byteSize);
    const visibility = this.storage.visibilityFor(input.purpose);
    const created = await this.prisma.client.mediaAsset.create({
      data: {
        bucket: this.s3.bucketName,
        storageKey: `pending/${randomUUID()}`,
        contentType: input.contentType,
        byteSize: input.byteSize,
        checksumSha256: input.checksumSha256,
        purpose: input.purpose,
        visibility,
        projectId: input.projectId ?? null,
        userId: input.userId ?? null,
        formId: input.formId ?? null,
        createdByActorType: input.actorType,
        createdByActorId: input.actorId ?? null,
      },
    });
    const storageKey = this.storage.keyFor({
      assetId: created.id,
      purpose: input.purpose,
      visibility,
      contentType: input.contentType,
      projectId: input.projectId,
      userId: input.userId,
      formId: input.formId,
    });
    const asset = await this.prisma.client.mediaAsset.update({
      where: { id: created.id },
      data: { storageKey },
    });
    const ttl = this.getTtl("S3_PRESIGN_PUT_TTL_SECONDS", 600);
    const uploadUrl = await this.s3.presignPut(
      asset.storageKey,
      asset.contentType,
      input.byteSize,
      ttl,
    );
    return {
      assetId: asset.id,
      uploadUrl,
      storageKey: asset.storageKey,
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
      requiredHeaders: { "Content-Type": asset.contentType },
    };
  }

  private async resolveAuthenticatedScope(
    actor: ActorContext,
    body: CreateUploadIntentBodyDto,
  ) {
    if (body.purpose === "ACCOUNT_DEFAULTS_LOGO") {
      if (!actor.userId) {
        throw new ForbiddenException("Account defaults require a user actor");
      }
      return { userId: actor.userId };
    }

    const access = await this.projectAccessService.resolveBySlug(
      actor,
      body.projectSlug,
    );
    if (!access.capabilities.has(Capability.MANAGE_PROJECT)) {
      throw new ForbiddenException(`Missing capability: ${Capability.MANAGE_PROJECT}`);
    }
    if (body.purpose === "FORM_BRANDING_LOGO") {
      const form = await this.prisma.client.collectionForm.findFirst({
        where: { id: body.formId, projectId: access.project.id },
        select: { id: true },
      });
      if (!form) throw new NotFoundException("Form not found");
      return { projectId: access.project.id, formId: form.id };
    }
    if (body.purpose === "SUBMISSION_ATTACHMENT" && body.formId) {
      const form = await this.prisma.client.collectionForm.findFirst({
        where: { id: body.formId, projectId: access.project.id },
        select: { id: true },
      });
      if (!form) throw new NotFoundException("Form not found");
      return { projectId: access.project.id, formId: form.id };
    }
    return { projectId: access.project.id };
  }

  private async getAssetForActor(assetId: string, actor: ActorContext) {
    const asset = await this.prisma.client.mediaAsset.findUnique({
      where: { id: assetId },
    });
    if (!asset) throw new NotFoundException("Media asset not found");

    if (
      asset.createdByActorType !== actor.actorType ||
      asset.createdByActorId !==
        (actor.userId ?? actor.credentialId ?? actor.projectId ?? null)
    ) {
      throw new ForbiddenException("Media asset belongs to another actor");
    }
    return asset;
  }

  private assertContent(
    purpose: MediaAssetPurpose,
    contentType: string,
    byteSize: number,
  ) {
    if (!this.storage.allowedContentTypes(purpose).includes(contentType)) {
      throw new BadRequestException("Content type is not allowed");
    }
    const maxBytes = this.storage.maxBytesFor(purpose);
    if (byteSize > maxBytes) {
      throw new BadRequestException(`File exceeds ${maxBytes} byte limit`);
    }
  }

  private getTtl(name: string, fallback: number) {
    const raw = this.configService.get<string | number>(name);
    const parsed = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
