import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import {
  FormStatus,
  FormVersionStatus,
  Prisma,
  type FormIntent as PrismaFormIntent,
} from "@workspace/database/prisma";
import {
  compileSnapshot,
  createFormTemplate,
  migrateFormDoc,
  toPublicSnapshot,
  type CompiledSnapshot,
  type FormDefinitionDoc,
  type FormIntent as CoreFormIntent,
} from "@workspace/forms-core";
import type {
  V2FormDTO,
  V2FormDraftDTO,
  V2FormSummaryDTO,
  V2FormVersionDTO,
  V2FormVersionSummaryDTO,
} from "@workspace/types";
import { BillingService } from "../billing/billing.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  CreateFormBodyDto,
  FormParamsDto,
  FormVersionParamsDto,
  ProjectFormsParamsDto,
  RuntimeFormSnapshotParamsDto,
  RuntimeFormSnapshotQueryDto,
  RuntimeSnapshotParamsDto,
  SaveFormDraftBodyDto,
  UpdateFormBodyDto,
} from "./forms.dto.js";

const FORM_SELECT = {
  id: true,
  projectId: true,
  intent: true,
  name: true,
  slug: true,
  status: true,
  open: true,
  draft: true,
  draftVersion: true,
  currentVersion: true,
  updatedByUserId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FormSelect;

const FORM_VERSION_SUMMARY_SELECT = {
  id: true,
  formId: true,
  projectId: true,
  slug: true,
  version: true,
  schemaVersion: true,
  rendererVersion: true,
  coreVersion: true,
  status: true,
  checksum: true,
  previewImageUrl: true,
  publishedAt: true,
} satisfies Prisma.FormVersionSelect;

const FORM_VERSION_SELECT = {
  ...FORM_VERSION_SUMMARY_SELECT,
  snapshot: true,
} satisfies Prisma.FormVersionSelect;

type FormRecord = Prisma.FormGetPayload<{
  select: typeof FORM_SELECT;
}>;

type FormVersionSummaryRecord = Prisma.FormVersionGetPayload<{
  select: typeof FORM_VERSION_SUMMARY_SELECT;
}>;

type FormVersionRecord = Prisma.FormVersionGetPayload<{
  select: typeof FORM_VERSION_SELECT;
}>;

type ProjectRequest = { projectAccess?: { projectId: string } };

@Injectable()
export class FormsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(BillingService) private readonly billingService: BillingService,
  ) {}

  async list(
    _params: ProjectFormsParamsDto,
    request: ProjectRequest,
  ): Promise<V2FormSummaryDTO[]> {
    const projectId = this.getProjectIdFromRequest(request);
    const forms = await this.prisma.client.form.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: FORM_SELECT,
    });

    return forms.map((form) => this.toFormSummaryDto(form));
  }

  async create(
    _params: ProjectFormsParamsDto,
    body: CreateFormBodyDto,
    request: ProjectRequest,
    userId: string,
  ): Promise<V2FormDTO> {
    const projectId = this.getProjectIdFromRequest(request);
    const usage = await this.billingService.getFormUsageForProject(projectId);
    if (usage.used >= usage.limit) {
      throw new ForbiddenException("Form limit reached for this plan");
    }

    const draft = createFormTemplate(body.intent as CoreFormIntent);
    const created = await this.prisma.client.form.create({
      data: {
        projectId,
        intent: body.intent as PrismaFormIntent,
        name: body.name ?? this.defaultNameFromDraft(draft),
        status: FormStatus.DRAFT,
        open: true,
        draft: this.toJsonInput(draft),
        draftVersion: 1,
        updatedByUserId: userId || null,
      },
      select: FORM_SELECT,
    });

    return this.toFormDto(created);
  }

  async getById(
    params: FormParamsDto,
    request: ProjectRequest,
  ): Promise<V2FormDTO> {
    const form = await this.getOwnedFormOrThrow(
      params.formId,
      this.getProjectIdFromRequest(request),
    );
    return this.toFormDto(form);
  }

  async update(
    params: FormParamsDto,
    body: UpdateFormBodyDto,
    request: ProjectRequest,
  ): Promise<V2FormDTO> {
    const projectId = this.getProjectIdFromRequest(request);
    const form = await this.getOwnedFormOrThrow(params.formId, projectId);

    try {
      const updated = await this.prisma.client.form.update({
        where: { id: form.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.slug !== undefined ? { slug: body.slug } : {}),
          ...(body.open !== undefined ? { open: body.open } : {}),
        },
        select: FORM_SELECT,
      });

      return this.toFormDto(updated);
    } catch (error: unknown) {
      if (this.isPrismaUniqueViolation(error)) {
        throw new ConflictException("Form slug already exists");
      }

      throw error;
    }
  }

  async delete(params: FormParamsDto, request: ProjectRequest) {
    const form = await this.getOwnedFormOrThrow(
      params.formId,
      this.getProjectIdFromRequest(request),
    );

    return this.prisma.client.form.delete({
      where: { id: form.id },
      select: { id: true, projectId: true },
    });
  }

  async getDraft(
    params: FormParamsDto,
    request: ProjectRequest,
  ): Promise<V2FormDraftDTO> {
    const form = await this.getOwnedFormOrThrow(
      params.formId,
      this.getProjectIdFromRequest(request),
    );

    return {
      draft: this.toRecord(form.draft),
      draftVersion: form.draftVersion,
    };
  }

  async saveDraft(
    params: FormParamsDto,
    body: SaveFormDraftBodyDto,
    request: ProjectRequest,
    userId: string,
  ): Promise<V2FormDraftDTO> {
    const projectId = this.getProjectIdFromRequest(request);
    const draft = migrateFormDoc(body.draft);
    const updated = await this.prisma.client.form.updateMany({
      where: {
        id: params.formId,
        projectId,
        draftVersion: body.expectedVersion,
      },
      data: {
        draft: this.toJsonInput(draft),
        draftVersion: { increment: 1 },
        updatedByUserId: userId || null,
      },
    });

    if (updated.count !== 1) {
      throw new ConflictException("Draft version is stale");
    }

    const form = await this.prisma.client.form.findFirst({
      where: { id: params.formId, projectId },
      select: FORM_SELECT,
    });

    if (!form) {
      throw new InternalServerErrorException(
        "Draft update succeeded but the form row could not be loaded",
      );
    }

    return {
      draft: this.toRecord(form.draft),
      draftVersion: form.draftVersion,
    };
  }

  async publish(
    params: FormParamsDto,
    request: ProjectRequest,
  ): Promise<V2FormVersionDTO> {
    const projectId = this.getProjectIdFromRequest(request);
    const form = await this.getOwnedFormOrThrow(params.formId, projectId);
    const draft = migrateFormDoc(form.draft);
    const latest = await this.prisma.client.formVersion.findFirst({
      where: { formId: form.id, projectId },
      orderBy: { version: "desc" },
      select: FORM_VERSION_SELECT,
    });

    if (latest) {
      const latestCandidate = this.compileForVersion(form, draft, {
        snapshotId: latest.id,
        version: latest.version,
        publishedAt: latest.publishedAt,
      });

      if (latestCandidate.checksum === latest.checksum) {
        if (
          form.currentVersion !== latest.version ||
          form.status !== FormStatus.PUBLISHED
        ) {
          await this.prisma.client.form.update({
            where: { id: form.id },
            data: {
              currentVersion: latest.version,
              status: FormStatus.PUBLISHED,
            },
            select: { id: true },
          });
        }

        return this.toFormVersionDto(latest);
      }
    }

    const version = (latest?.version ?? 0) + 1;
    const snapshotId = this.createCuid();
    const publishedAt = new Date();
    const compiled = this.compileForVersion(form, draft, {
      snapshotId,
      version,
      publishedAt,
    });

    const created = await this.prisma.client.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const versionRow = await tx.formVersion.create({
          data: {
            id: snapshotId,
            formId: form.id,
            projectId,
            slug: form.slug,
            version,
            schemaVersion: compiled.schemaVersion,
            rendererVersion: compiled.rendererVersion,
            coreVersion: compiled.coreVersion,
            status: FormVersionStatus.PUBLISHED,
            snapshot: this.toJsonInput(compiled),
            checksum: compiled.checksum,
            publishedAt,
          },
          select: FORM_VERSION_SELECT,
        });

        await tx.form.update({
          where: { id: form.id },
          data: {
            currentVersion: version,
            status: FormStatus.PUBLISHED,
          },
          select: { id: true },
        });

        return versionRow;
      },
    );

    return this.toFormVersionDto(created);
  }

  async listVersions(
    params: FormParamsDto,
    request: ProjectRequest,
  ): Promise<V2FormVersionSummaryDTO[]> {
    const projectId = this.getProjectIdFromRequest(request);
    await this.getOwnedFormOrThrow(params.formId, projectId);
    const versions = await this.prisma.client.formVersion.findMany({
      where: { formId: params.formId, projectId },
      orderBy: { version: "desc" },
      select: FORM_VERSION_SUMMARY_SELECT,
    });

    return versions.map((version) => this.toFormVersionSummaryDto(version));
  }

  async getVersion(
    params: FormVersionParamsDto,
    request: ProjectRequest,
  ): Promise<V2FormVersionDTO> {
    const projectId = this.getProjectIdFromRequest(request);
    await this.getOwnedFormOrThrow(params.formId, projectId);
    const version = await this.prisma.client.formVersion.findFirst({
      where: {
        formId: params.formId,
        projectId,
        version: params.version,
      },
      select: FORM_VERSION_SELECT,
    });

    if (!version) {
      throw new NotFoundException("Form version not found");
    }

    return this.toFormVersionDto(version);
  }

  async getRuntimeSnapshotBySlug(
    params: RuntimeFormSnapshotParamsDto,
    query: RuntimeFormSnapshotQueryDto,
  ): Promise<Record<string, unknown>> {
    // Phase 7: replace with host-based project resolution.
    const form = await this.prisma.client.form.findFirst({
      where: {
        projectId: query.projectId,
        slug: params.slug,
        status: FormStatus.PUBLISHED,
        open: true,
        currentVersion: { not: null },
      },
      select: {
        id: true,
        currentVersion: true,
      },
    });

    if (!form?.currentVersion) {
      throw new NotFoundException("Form snapshot not found");
    }

    const version = await this.prisma.client.formVersion.findFirst({
      where: {
        formId: form.id,
        projectId: query.projectId,
        version: form.currentVersion,
        status: FormVersionStatus.PUBLISHED,
      },
      select: FORM_VERSION_SELECT,
    });

    if (!version) {
      throw new NotFoundException("Form snapshot not found");
    }

    return this.toPublicSnapshotDto(version);
  }

  async getRuntimeSnapshotById(
    params: RuntimeSnapshotParamsDto,
  ): Promise<Record<string, unknown>> {
    const version = await this.prisma.client.formVersion.findUnique({
      where: { id: params.snapshotId },
      select: FORM_VERSION_SELECT,
    });

    if (!version) {
      throw new NotFoundException("Form snapshot not found");
    }

    return this.toPublicSnapshotDto(version);
  }

  private async getOwnedFormOrThrow(formId: string, projectId: string) {
    const form = await this.prisma.client.form.findFirst({
      where: { id: formId, projectId },
      select: FORM_SELECT,
    });

    if (!form) {
      throw new NotFoundException("Form not found");
    }

    return form;
  }

  private compileForVersion(
    form: FormRecord,
    draft: FormDefinitionDoc,
    input: {
      snapshotId: string;
      version: number;
      publishedAt: Date;
    },
  ) {
    return compileSnapshot(draft, {
      snapshotId: input.snapshotId,
      formId: form.id,
      projectId: form.projectId,
      slug: form.slug,
      version: input.version,
      status: "published",
      publishedAt: input.publishedAt.toISOString(),
      logoUrl: draft.design.logoUrl ?? null,
      backgroundImageUrl: draft.design.backgroundImageUrl ?? null,
    });
  }

  private toFormSummaryDto(form: FormRecord): V2FormSummaryDTO {
    return {
      id: form.id,
      projectId: form.projectId,
      intent: form.intent,
      name: form.name,
      slug: form.slug,
      status: form.status,
      open: form.open,
      draftVersion: form.draftVersion,
      currentVersion: form.currentVersion,
      createdAt: form.createdAt.toISOString(),
      updatedAt: form.updatedAt.toISOString(),
    };
  }

  private toFormDto(form: FormRecord): V2FormDTO {
    return {
      ...this.toFormSummaryDto(form),
      draft: this.toRecord(form.draft),
      updatedByUserId: form.updatedByUserId,
    };
  }

  private toFormVersionSummaryDto(
    version: FormVersionSummaryRecord,
  ): V2FormVersionSummaryDTO {
    return {
      id: version.id,
      formId: version.formId,
      projectId: version.projectId,
      slug: version.slug,
      version: version.version,
      schemaVersion: version.schemaVersion,
      rendererVersion: version.rendererVersion,
      coreVersion: version.coreVersion,
      status: version.status,
      checksum: version.checksum,
      previewImageUrl: version.previewImageUrl,
      publishedAt: version.publishedAt.toISOString(),
    };
  }

  private toFormVersionDto(version: FormVersionRecord): V2FormVersionDTO {
    return {
      ...this.toFormVersionSummaryDto(version),
      snapshot: this.toPublicSnapshotDto(version),
    };
  }

  private toPublicSnapshotDto(
    version: FormVersionRecord,
  ): Record<string, unknown> {
    return toPublicSnapshot(
      version.snapshot as unknown as CompiledSnapshot,
    ) as unknown as Record<string, unknown>;
  }

  private getProjectIdFromRequest(request: ProjectRequest) {
    const projectId = request.projectAccess?.projectId;
    if (!projectId) {
      throw new InternalServerErrorException(
        "FormsService requires request.projectAccess.projectId",
      );
    }

    return projectId;
  }

  private defaultNameFromDraft(draft: FormDefinitionDoc) {
    return draft.content.title.trim() || "Untitled form";
  }

  private createCuid() {
    return `c${Date.now().toString(36)}${randomBytes(10).toString("hex")}`;
  }

  private toJsonInput(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
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
