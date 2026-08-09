import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { Prisma, StudioDraftResourceType } from "@workspace/database/prisma";
import { PrismaService } from "../prisma/prisma.service.js";

const STUDIO_DRAFT_SELECT = {
  id: true,
  projectId: true,
  resourceType: true,
  resourceId: true,
  version: true,
  publishedVersion: true,
  draft: true,
  updatedByUserId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StudioDraftSelect;

type StudioDraftRecord = Prisma.StudioDraftGetPayload<{
  select: typeof STUDIO_DRAFT_SELECT;
}>;

type StudioDraftLocator = {
  projectId: string;
  resourceType: StudioDraftResourceType;
  resourceId: string;
};

type SaveStudioDraftInput = StudioDraftLocator & {
  draft: Record<string, unknown>;
  expectedVersion: number;
  updatedByUserId: string;
};

@Injectable()
export class StudioDraftsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getDraft(locator: StudioDraftLocator) {
    const draft = await this.prisma.client.studioDraft.findUnique({
      where: this.toUniqueWhere(locator),
      select: STUDIO_DRAFT_SELECT,
    });

    return draft
      ? this.toDto(draft)
      : {
          resourceType: locator.resourceType,
          resourceId: locator.resourceId,
          version: 0,
          publishedVersion: null,
          draft: null,
          updatedByUserId: null,
          updatedAt: null,
        };
  }

  async saveDraft(input: SaveStudioDraftInput) {
    if (input.expectedVersion === 0) {
      return this.createDraft(input);
    }

    const updated = await this.prisma.client.studioDraft.updateMany({
      where: {
        projectId: input.projectId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        version: input.expectedVersion,
      },
      data: {
        draft: this.toJsonObjectInput(input.draft),
        updatedByUserId: input.updatedByUserId,
        version: { increment: 1 },
      },
    });

    if (updated.count !== 1) {
      throw new ConflictException("Draft version is stale");
    }

    const draft = await this.prisma.client.studioDraft.findUnique({
      where: this.toUniqueWhere(input),
      select: STUDIO_DRAFT_SELECT,
    });

    if (!draft) {
      throw new InternalServerErrorException(
        "Draft update succeeded but the draft row could not be loaded",
      );
    }

    return this.toDto(draft);
  }

  private async createDraft(input: SaveStudioDraftInput) {
    try {
      const draft = await this.prisma.client.studioDraft.create({
        data: {
          projectId: input.projectId,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          version: 1,
          draft: this.toJsonObjectInput(input.draft),
          updatedByUserId: input.updatedByUserId,
        },
        select: STUDIO_DRAFT_SELECT,
      });

      return this.toDto(draft);
    } catch (error: unknown) {
      if (this.isPrismaUniqueViolation(error)) {
        throw new ConflictException("Draft version is stale");
      }

      throw error;
    }
  }

  private toDto(draft: StudioDraftRecord) {
    return {
      resourceType: draft.resourceType,
      resourceId: draft.resourceId,
      version: draft.version,
      publishedVersion: draft.publishedVersion,
      draft: draft.draft,
      updatedByUserId: draft.updatedByUserId,
      updatedAt: draft.updatedAt,
    };
  }

  private toUniqueWhere(locator: StudioDraftLocator) {
    return {
      projectId_resourceType_resourceId: {
        projectId: locator.projectId,
        resourceType: locator.resourceType,
        resourceId: locator.resourceId,
      },
    };
  }

  private toJsonObjectInput(value: Record<string, unknown>) {
    return value as Prisma.InputJsonObject;
  }

  private isPrismaUniqueViolation(error: unknown): error is { code: string } {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    );
  }
}
