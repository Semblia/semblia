import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ModerationStatus,
  MediaAssetPurpose,
  MediaAssetStatus,
  Prisma,
  PublicSurfaceFeature,
  PublicSurfaceResourceType,
  PublicSubmitSurface,
  PublicSubmitTrustMode,
  StudioDraftResourceType,
  TestimonialType,
} from "@workspace/database/prisma";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import { StudioDraftsService } from "../studio-drafts/studio-drafts.service.js";
import { TestimonialPrivateMetadataService } from "../testimonials/testimonial-private-metadata.service.js";
import { PublicSubmitTrustService } from "../testimonials/public-submit-trust.service.js";
import { MediaService } from "../storage/media.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import {
  publicSubmitIdempotencyWhere,
  replayCompletedPublicSubmit,
} from "../testimonials/public-submit-idempotency.js";
import { hashIdempotencyPayload } from "../testimonials/testimonials.dto.js";
import {
  createFormSubmissionBodySchema,
  type CreateFormBodyDto,
  type CreateFormSubmissionBodyDto,
  type FormParamsDto,
  type HostedFormRequestContextDto,
  type ProjectFormsParamsDto,
  type RuntimeFormsSubmitBodyDto,
  type StudioDraftBodyDto,
  type UpdateFormBodyDto,
} from "./forms.dto.js";

const FORM_SELECT = {
  id: true,
  projectId: true,
  slug: true,
  name: true,
  description: true,
  isActive: true,
  abWeight: true,
  config: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CollectionFormSelect;

const TESTIMONIAL_SELECT = {
  id: true,
  projectId: true,
  userId: true,
  formId: true,
  authorName: true,
  authorEmail: true,
  authorRole: true,
  authorCompany: true,
  authorAvatarAssetId: true,
  authorAvatarAsset: true,
  content: true,
  type: true,
  videoAssetId: true,
  videoAsset: true,
  mediaAssetId: true,
  mediaAsset: true,
  source: true,
  sourceUrl: true,
  isPublished: true,
  rating: true,
  isApproved: true,
  isOAuthVerified: true,
  oauthProvider: true,
  moderationStatus: true,
  moderationScore: true,
  moderationFlags: true,
  autoPublished: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TestimonialSelect;

type ProjectRequest = { projectAccess?: { projectId: string } };

type PublicSubmitRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Buffer | string;
  ip?: string;
  socket?: { remoteAddress?: string | null };
};

type FormRecord = Prisma.CollectionFormGetPayload<{
  select: typeof FORM_SELECT;
}>;

type PublicFormDto = {
  id: string;
  slug: string | null;
  name: string;
  description: string;
  isActive: boolean;
  abWeight: number;
  config: Prisma.JsonValue;
  createdAt: Date;
};

type PublicFormsResponse = {
  data: PublicFormDto[];
};

type TestimonialRecord = Prisma.TestimonialGetPayload<{
  select: typeof TESTIMONIAL_SELECT;
}>;

@Injectable()
export class FormsService {
  private readonly logger = new Logger(FormsService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(RedisService) private readonly redisService: RedisService,
    @Inject(PublicSubmitTrustService)
    private readonly publicSubmitTrustService: PublicSubmitTrustService,
    @Inject(TestimonialPrivateMetadataService)
    private readonly privateMetadataService: TestimonialPrivateMetadataService,
    @Inject(StudioDraftsService)
    private readonly studioDraftsService: StudioDraftsService,
    @Inject(MediaService)
    private readonly mediaService?: MediaService,
    @Optional()
    @Inject(NotificationsService)
    private readonly notificationsService?: NotificationsService,
  ) {}

  async list(params: ProjectFormsParamsDto, request: ProjectRequest) {
    void params;

    const items = await this.prisma.client.collectionForm.findMany({
      where: { projectId: this.getProjectIdFromRequest(request) },
      orderBy: { createdAt: "asc" },
      select: FORM_SELECT,
    });

    return Promise.all(items.map((item) => this.toAuthenticatedFormDto(item)));
  }

  async create(
    params: ProjectFormsParamsDto,
    body: CreateFormBodyDto,
    request: ProjectRequest,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const config = await this.validateFormConfigMedia(
      body.config,
      projectId,
    );
    const slug = await this.createUniqueFormSlug(
      projectId,
      body.slug ?? body.name,
    );
    const created = await this.prisma.client.collectionForm.create({
      data: {
        projectId,
        slug,
        name: body.name,
        description: body.description,
        isActive: body.isActive,
        abWeight: body.abWeight,
        config: this.toJsonObjectInput(config),
      },
      select: FORM_SELECT,
    });

    await this.bustPublicFormsCache(params.slug);
    return this.toAuthenticatedFormDto(created);
  }

  async getById(params: FormParamsDto, request: ProjectRequest) {
    const form = await this.getOwnedFormOrThrow(
      params.formId,
      this.getProjectIdFromRequest(request),
    );

    return this.toAuthenticatedFormDto(form);
  }

  async update(
    params: FormParamsDto,
    body: UpdateFormBodyDto,
    request: ProjectRequest,
  ) {
    const form = await this.getOwnedFormOrThrow(
      params.formId,
      this.getProjectIdFromRequest(request),
    );

    const config =
      body.config !== undefined
        ? await this.validateFormConfigMedia(body.config, form.projectId)
        : undefined;
    const slug =
      body.slug !== undefined
        ? await this.createUniqueFormSlug(form.projectId, body.slug, form.id)
        : undefined;
    const updated = await this.prisma.client.collectionForm.update({
      where: { id: form.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.abWeight !== undefined ? { abWeight: body.abWeight } : {}),
        ...(config !== undefined
          ? { config: this.toJsonObjectInput(config) }
          : {}),
      },
      select: FORM_SELECT,
    });

    await this.bustPublicFormsCache(params.slug);
    return this.toAuthenticatedFormDto(updated);
  }

  async duplicate(params: FormParamsDto, request: ProjectRequest) {
    const projectId = this.getProjectIdFromRequest(request);
    const source = await this.getOwnedFormOrThrow(params.formId, projectId);

    const created = await this.prisma.client.collectionForm.create({
      data: {
        projectId,
        slug: await this.createUniqueFormSlug(
          projectId,
          `${source.slug ?? source.name}-copy`,
        ),
        name: this.toDuplicateFormName(source.name),
        description: source.description,
        isActive: false,
        abWeight: 0,
        config: this.toJsonValueInput(source.config),
      },
      select: FORM_SELECT,
    });

    await this.bustPublicFormsCache(params.slug);
    return this.toAuthenticatedFormDto(created);
  }

  async delete(params: FormParamsDto, request: ProjectRequest) {
    const form = await this.getOwnedFormOrThrow(
      params.formId,
      this.getProjectIdFromRequest(request),
    );

    const deleted = await this.prisma.client.collectionForm.delete({
      where: { id: form.id },
      select: {
        id: true,
        projectId: true,
      },
    });

    await this.bustPublicFormsCache(params.slug);
    return deleted;
  }

  async getDraft(params: FormParamsDto, request: ProjectRequest) {
    const projectId = this.getProjectIdFromRequest(request);
    const form = await this.getOwnedFormOrThrow(params.formId, projectId);

    return this.studioDraftsService.getDraft({
      projectId,
      resourceType: StudioDraftResourceType.FORM,
      resourceId: form.id,
    });
  }

  async saveDraft(
    params: FormParamsDto,
    body: StudioDraftBodyDto,
    request: ProjectRequest,
    updatedByUserId: string,
  ) {
    const projectId = this.getProjectIdFromRequest(request);
    const form = await this.getOwnedFormOrThrow(params.formId, projectId);

    return this.studioDraftsService.saveDraft({
      projectId,
      resourceType: StudioDraftResourceType.FORM,
      resourceId: form.id,
      draft: body.draft,
      expectedVersion: body.expectedVersion,
      updatedByUserId,
    });
  }

  async listPublic(params: ProjectFormsParamsDto) {
    const cacheKey = this.getPublicFormsCacheKey(params.slug);
    const cached = await this.redisService.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as PublicFormsResponse;
    }

    const project = await this.prisma.client.project.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const forms = await this.prisma.client.collectionForm.findMany({
      where: { projectId: project.id, isActive: true },
      orderBy: { createdAt: "asc" },
      select: FORM_SELECT,
    });

    const response: PublicFormsResponse = {
      data: await Promise.all(forms.map((form) => this.toPublicFormDto(form))),
    };

    await this.redisService.redis.set(
      cacheKey,
      JSON.stringify(response),
      "EX",
      60,
    );
    return response;
  }

  async resolveRuntimeForm(
    context: HostedFormRequestContextDto,
    request: PublicSubmitRequest,
  ) {
    const originalHost = this.getRuntimeOriginalHost(request, context);
    const originalPath = this.readHeader(request, "x-tresta-original-path");
    if (originalPath && normalizePath(originalPath) !== context.path) {
      throw new BadRequestException("Hosted form path does not match request");
    }

    const resolution = await this.resolveHostedFormTarget(
      context,
      originalHost,
    );

    await this.recordRuntimeFormView({
      projectId: resolution.project.id,
      formId: resolution.form.id,
      host: originalHost,
      request,
    });

    return {
      project: {
        id: resolution.project.id,
        slug: resolution.project.slug,
        name: resolution.project.name,
        publicSlug: context.projectPublicSlug,
        brandColorPrimary: resolution.project.brandColorPrimary,
      },
      form: {
        id: resolution.form.id,
        slug: resolution.form.slug,
        name: resolution.form.name,
        description: resolution.form.description,
        config: this.toHostedFormConfig(resolution.form, resolution.project),
        publishedAt: resolution.form.updatedAt.toISOString(),
      },
    };
  }

  async submitRuntimeForm(
    input: RuntimeFormsSubmitBodyDto,
    request: PublicSubmitRequest,
  ) {
    const originalHost = this.getRuntimeOriginalHost(request, input.context);
    const originalPath = this.readHeader(request, "x-tresta-original-path");
    if (originalPath && normalizePath(originalPath) !== input.context.path) {
      throw new BadRequestException("Hosted form path does not match request");
    }

    const resolution = await this.resolveHostedFormTarget(
      input.context,
      originalHost,
    );
    const submitBody = this.parseRuntimeSubmitBody(input);
    const rawBody = JSON.stringify(submitBody);
    const origin = `https://${originalHost}`;
    const userAgent =
      this.readHeader(request, "x-tresta-original-user-agent") ??
      this.readHeader(request, "user-agent");
    const forwardedFor =
      this.readHeader(request, "x-tresta-original-forwarded-for") ??
      this.readHeader(request, "x-forwarded-for");

    await this.submitPublic(
      { slug: resolution.project.slug, formId: resolution.form.id },
      submitBody,
      {
        method: "POST",
        headers: {
          origin,
          ...(userAgent ? { "user-agent": userAgent } : {}),
          ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
        },
        rawBody,
        ip: request.ip,
        socket: request.socket,
      },
    );

    return { redirectTo: this.getRuntimeRedirectTo(resolution.form) };
  }

  async submitPublic(
    params: FormParamsDto,
    body: CreateFormSubmissionBodyDto,
    request: PublicSubmitRequest,
  ) {
    const trust = await this.publicSubmitTrustService.evaluate(
      request,
      params.slug,
    );

    const form = await this.prisma.client.collectionForm.findFirst({
      where: {
        id: params.formId,
        projectId: trust.projectId,
        isActive: true,
      },
      select: FORM_SELECT,
    });

    if (!form) {
      throw new NotFoundException("Form not found");
    }

    const idempotencyKey = this.readHeader(request, "idempotency-key");
    const payloadHash = hashIdempotencyPayload(request.rawBody);

    if (idempotencyKey) {
      const replay = await this.tryReplayIdempotentSubmit(
        trust.projectId,
        idempotencyKey,
        payloadHash,
      );
      if (replay) {
        return replay;
      }
    }

    const project = await this.prisma.client.project.findUnique({
      where: { id: trust.projectId },
      select: {
        id: true,
        autoModeration: true,
        autoApproveVerified: true,
      },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }

    let moderationStatus: ModerationStatus = ModerationStatus.PENDING;
    let isApproved = false;
    let autoPublished = false;

    if (project.autoModeration) {
      if (trust.trust === "hmac") {
        moderationStatus = ModerationStatus.APPROVED;
        isApproved = true;
        autoPublished = true;
      } else if (
        trust.trust === "origin" &&
        project.autoApproveVerified &&
        body.isOAuthVerified === true
      ) {
        moderationStatus = ModerationStatus.APPROVED;
        isApproved = true;
        autoPublished = true;
      }
    }

    const clientIp = this.publicSubmitTrustService.getClientIp(request);
    const userAgent = this.readHeader(request, "user-agent") ?? null;

    const { testimonial: created, submission } =
      await this.prisma.client.$transaction(async (tx) => {
        await this.mediaService?.activatePublicSubmitAssets({
          tx,
          projectId: trust.projectId,
          principal: trust.principal,
          assetIds: [
            body.authorAvatarAssetId,
            body.videoAssetId,
            body.mediaAssetId,
          ],
        });
        const testimonial = await tx.testimonial.create({
          data: {
            projectId: trust.projectId,
            formId: form.id,
            authorName: body.authorName,
            authorEmail: null,
            authorRole: body.authorRole ?? null,
            authorCompany: body.authorCompany ?? null,
            authorAvatarAssetId: body.authorAvatarAssetId ?? null,
            content: body.content,
            type: body.type ?? TestimonialType.TEXT,
            videoAssetId: body.videoAssetId ?? null,
            mediaAssetId: body.mediaAssetId ?? null,
            source: body.source ?? null,
            sourceUrl: body.sourceUrl ?? null,
            rating: this.toProjectedTestimonialRating(body.rating),
            isPublished: false,
            isApproved,
            isOAuthVerified: body.isOAuthVerified ?? false,
            oauthProvider: body.oauthProvider ?? null,
            moderationStatus,
            autoPublished,
            ipAddress: null,
            userAgent: null,
          },
          select: TESTIMONIAL_SELECT,
        });

        const submission = await tx.collectionFormSubmission.create({
          data: {
            projectId: trust.projectId,
            formId: form.id,
            testimonialId: testimonial.id,
            trustedOriginId: trust.trustedOriginId ?? null,
            signingSecretId: trust.signingSecretId ?? null,
            trustMode:
              trust.trust === "hmac"
                ? PublicSubmitTrustMode.HMAC
                : PublicSubmitTrustMode.ORIGIN,
            idempotencyKey: idempotencyKey ?? null,
            payloadHash,
            answers: this.toJsonObjectInput(body.answers ?? {}),
            ratingValue: body.rating ?? null,
            ratingScale: this.toSubmissionRatingScale(body.rating),
            moderationStatus,
          },
        });
        const day = startOfUtcDay(new Date());
        await tx.projectAnalyticsDaily.upsert({
          where: {
            projectId_day: {
              projectId: trust.projectId,
              day,
            },
          },
          create: {
            projectId: trust.projectId,
            day,
            formSubmissions: 1,
          },
          update: {
            formSubmissions: { increment: 1 },
          },
        });

        await this.privateMetadataService.createForPublicSubmit(tx, {
          testimonialId: testimonial.id,
          submissionId: submission.id,
          authorEmail: body.authorEmail,
          ipAddress: clientIp,
          userAgent,
          consentSnapshot: this.toPublicSubmitConsentSnapshot(body),
        });

        return { testimonial, submission };
      });

    const response = this.toTestimonialDto(created);

    if (idempotencyKey) {
      await this.prisma.client.publicSubmitIdempotency.update({
        where: publicSubmitIdempotencyWhere(
          trust.projectId,
          PublicSubmitSurface.FORM,
          idempotencyKey,
        ),
        data: {
          submissionId: submission.id,
          responseStatusCode: 201,
          responseBody: response as unknown as Prisma.InputJsonValue,
        },
      });
    }

    await this.notificationsService?.createForProjectReviewers(
      trust.projectId,
      {
        type: "SUBMISSION_CREATED",
        title: "New form response",
        message: `${created.authorName} submitted a response.`,
        link: `/projects/${params.slug}/testimonials/${created.id}`,
        metadata: {
          projectId: trust.projectId,
          projectSlug: params.slug,
          formId: form.id,
          submissionId: submission.id,
          testimonialId: created.id,
          moderationStatus,
        },
      },
    );
    await this.bustPublicTestimonialsCache(params.slug);
    return response;
  }

  private async getOwnedFormOrThrow(formId: string, projectId: string) {
    const form = await this.prisma.client.collectionForm.findFirst({
      where: { id: formId, projectId },
      select: FORM_SELECT,
    });

    if (!form) {
      throw new NotFoundException("Form not found");
    }

    return form;
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

  private async resolveHostedFormTarget(
    context: HostedFormRequestContextDto,
    originalHost: string,
  ) {
    const normalizedHost = normalizeHostname(originalHost);
    const defaultHost = this.getDefaultRuntimeHost(context.projectPublicSlug);
    const hosted = await this.prisma.client.publicSurfaceHost.findFirst({
      where: {
        hostname: normalizedHost,
        status: "ACTIVE",
        feature: PublicSurfaceFeature.COLLECTION,
      },
      select: {
        resourceType: true,
        resourceId: true,
        project: {
          select: {
            id: true,
            slug: true,
            name: true,
            brandColorPrimary: true,
          },
        },
      },
    });

    const project =
      hosted?.project ??
      (normalizedHost === defaultHost
        ? await this.prisma.client.project.findFirst({
            where: { slug: context.projectPublicSlug, isActive: true },
            select: {
              id: true,
              slug: true,
              name: true,
              brandColorPrimary: true,
            },
          })
        : null);

    if (!project) {
      throw new NotFoundException("Hosted form project not found");
    }

    const form = context.formSlug
      ? await this.prisma.client.collectionForm.findFirst({
          where: {
            projectId: project.id,
            isActive: true,
            OR: [{ slug: context.formSlug }, { id: context.formSlug }],
          },
          select: FORM_SELECT,
        })
      : hosted?.resourceType === PublicSurfaceResourceType.FORM &&
          hosted.resourceId
        ? await this.prisma.client.collectionForm.findFirst({
            where: {
              id: hosted.resourceId,
              projectId: project.id,
              isActive: true,
            },
            select: FORM_SELECT,
          })
        : await this.prisma.client.collectionForm.findFirst({
            where: { projectId: project.id, isActive: true },
            orderBy: [{ abWeight: "desc" }, { createdAt: "asc" }],
            select: FORM_SELECT,
          });

    if (!form) {
      throw new NotFoundException("Hosted form not found");
    }

    return { project, form };
  }

  private getRuntimeOriginalHost(
    request: PublicSubmitRequest,
    context: HostedFormRequestContextDto,
  ) {
    return normalizeHostname(
      this.readHeader(request, "x-tresta-original-host") ??
        this.getDefaultRuntimeHost(context.projectPublicSlug),
    );
  }

  private getDefaultRuntimeHost(projectPublicSlug: string) {
    const baseDomain =
      this.configService.get<string>("FORMS_RUNTIME_PUBLIC_BASE_DOMAIN") ??
      "collect.tresta.app";
    return normalizeHostname(`${projectPublicSlug}.${baseDomain}`);
  }

  private parseRuntimeSubmitBody(
    input: RuntimeFormsSubmitBodyDto,
  ): CreateFormSubmissionBodyDto {
    const parsed = input.contentType.toLowerCase().includes("application/json")
      ? this.parseRuntimeJsonBody(input.body)
      : this.parseRuntimeUrlEncodedBody(input.body);
    const answers = this.toRecord(parsed.answers) ?? {};
    const value = (...keys: string[]) => {
      for (const key of keys) {
        const answer = answers[key];
        if (typeof answer === "string" && answer.trim()) return answer.trim();
        const topLevel = parsed[key];
        if (typeof topLevel === "string" && topLevel.trim()) {
          return topLevel.trim();
        }
      }
      return undefined;
    };

    const rating = this.parseRuntimeRating(value("rating"));
    const candidate = {
      authorName: value("authorName", "name"),
      authorEmail: this.nullableValue(value("authorEmail", "email")),
      authorRole: this.nullableValue(value("authorRole", "jobTitle")),
      authorCompany: this.nullableValue(value("authorCompany", "company")),
      content: value("content", "testimonial", "message"),
      rating,
      answers,
      source: "hosted_form",
    };
    const result = createFormSubmissionBodySchema.safeParse(candidate);
    if (!result.success) {
      throw new BadRequestException("Invalid hosted form submission");
    }

    return result.data;
  }

  private parseRuntimeJsonBody(body: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(body) as unknown;
      return this.toRecord(parsed) ?? {};
    } catch {
      throw new BadRequestException("Invalid hosted form JSON body");
    }
  }

  private parseRuntimeUrlEncodedBody(body: string): Record<string, unknown> {
    const answers: Record<string, unknown> = {};
    const topLevel: Record<string, unknown> = {};
    const params = new URLSearchParams(body);
    for (const [key, value] of params.entries()) {
      const answerMatch = key.match(/^answers\[([^\]]+)\]$/);
      if (answerMatch?.[1]) {
        answers[answerMatch[1]] = value;
      } else {
        topLevel[key] = value;
      }
    }

    return { ...topLevel, answers };
  }

  private parseRuntimeRating(value: string | undefined) {
    if (!value) return undefined;
    const rating = Number(value);
    return Number.isInteger(rating) ? rating : undefined;
  }

  private nullableValue(value: string | undefined) {
    return value && value.trim() ? value.trim() : null;
  }

  private getRuntimeRedirectTo(form: FormRecord) {
    const config = this.toRecord(form.config);
    const content = this.toRecord(config?.content);
    const successAction = this.toRecord(content?.successAction);
    if (
      successAction?.kind === "redirect" &&
      typeof successAction.url === "string"
    ) {
      return successAction.url;
    }

    return null;
  }

  private toHostedFormConfig(
    form: FormRecord,
    project: { name: string; brandColorPrimary: string | null },
  ) {
    const config = this.toRecord(form.config);
    if (this.isHostedFormConfig(config)) {
      return config;
    }

    const content = this.toRecord(config?.content);
    const fields = this.toRecord(config?.fields);
    const branding = this.toRecord(config?.branding);
    const colors = this.toRecord(branding?.colors);

    const questions = [
      {
        id: "content",
        type: "textarea",
        label: "Your feedback",
        placeholder: "",
        required: true,
      },
      {
        id: "authorName",
        type: "text",
        label: "Your name",
        placeholder: "",
        required: true,
      },
      ...this.optionalHostedQuestion(fields?.email, {
        id: "authorEmail",
        type: "email",
        label: "Email",
      }),
      ...this.optionalHostedQuestion(fields?.rating, {
        id: "rating",
        type: "rating",
        label: "Rating",
      }),
      ...this.optionalHostedQuestion(fields?.jobTitle, {
        id: "authorRole",
        type: "text",
        label: "Job title",
      }),
      ...this.optionalHostedQuestion(fields?.company, {
        id: "authorCompany",
        type: "text",
        label: "Company",
      }),
    ];

    return {
      brandName: project.name,
      headline:
        this.stringOrNull(content?.headerTitle) ??
        form.name ??
        "Share your experience",
      subhead:
        this.stringOrNull(content?.headerDescription) ??
        form.description ??
        "Your honest feedback helps others make better decisions.",
      questions,
      tokens: {
        accent:
          this.stringOrNull(colors?.primary) ??
          project.brandColorPrimary ??
          "#4f46e5",
        background: this.stringOrNull(colors?.background) ?? "#f8fafc",
        text: this.stringOrNull(colors?.foreground) ?? "#111827",
        mutedText: "#6b7280",
        surface: "#ffffff",
        border: "#d1d5db",
        radius: this.radiusTokenToNumber(branding?.cornerRadius),
        fontFamily: this.fontFamilyTokenToCss(branding?.fontFamily),
      },
    };
  }

  private optionalHostedQuestion(
    field: unknown,
    question: {
      id: string;
      type: "text" | "textarea" | "email" | "rating";
      label: string;
    },
  ) {
    const record = this.toRecord(field);
    if (record?.enabled !== true) return [];
    return [
      {
        ...question,
        placeholder: "",
        required: record.required === true,
      },
    ];
  }

  private isHostedFormConfig(
    value: Record<string, unknown> | null | undefined,
  ) {
    return (
      Boolean(value) &&
      typeof value?.brandName === "string" &&
      Array.isArray(value.questions) &&
      Boolean(this.toRecord(value.tokens))
    );
  }

  private async recordRuntimeFormView(input: {
    projectId: string;
    formId: string;
    host: string;
    request: PublicSubmitRequest;
  }) {
    try {
      const day = startOfUtcDay(new Date());
      await this.prisma.client.$transaction([
        this.prisma.client.formImpression.create({
          data: {
            projectId: input.projectId,
            formId: input.formId,
            ipAddress:
              this.readHeader(
                input.request,
                "x-tresta-original-forwarded-for",
              )
                ?.split(",")[0]
                ?.trim()
                .slice(0, 45) ??
              this.publicSubmitTrustService.getClientIp(input.request),
            userAgent:
              this.readHeader(input.request, "x-tresta-original-user-agent") ??
              this.readHeader(input.request, "user-agent") ??
              null,
          },
        }),
        this.prisma.client.projectAnalyticsDaily.upsert({
          where: {
            projectId_day: {
              projectId: input.projectId,
              day,
            },
          },
          create: {
            projectId: input.projectId,
            day,
            formViews: 1,
            hostedPageViews: 1,
          },
          update: {
            formViews: { increment: 1 },
            hostedPageViews: { increment: 1 },
          },
        }),
      ]);
    } catch (error) {
      this.logger.warn(
        `Failed to record hosted form analytics for ${input.host}: ${String(
          error,
        )}`,
      );
    }
  }

  private async toAuthenticatedFormDto(form: FormRecord) {
    const config = await this.hydrateFormConfig(form.config);
    const metrics = {
      submissions: 0,
      views: 0,
      responseRate: 0,
      avgRating: 0,
      lastSubmissionAt: null,
    };

    return {
      ...form,
      config,
      // The web client expects analytics fields, but real aggregation lands later.
      ...metrics,
      entry: {
        id: form.id,
        slug: form.slug,
        name: form.name,
        description: form.description,
        isActive: form.isActive,
        abWeight: form.abWeight,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
        ...metrics,
      },
    };
  }

  private async toPublicFormDto(form: FormRecord): Promise<PublicFormDto> {
    return {
      id: form.id,
      slug: form.slug,
      name: form.name,
      description: form.description,
      isActive: form.isActive,
      abWeight: form.abWeight,
      config: await this.hydrateFormConfig(form.config),
      createdAt: form.createdAt,
    };
  }

  private toTestimonialDto(testimonial: TestimonialRecord) {
    const {
      authorEmail: _authorEmail,
      authorAvatarAsset,
      videoAsset,
      mediaAsset,
      ...safeTestimonial
    } = testimonial;
    void _authorEmail;

    return {
      ...safeTestimonial,
      authorAvatar: this.mediaDto(authorAvatarAsset),
      video: this.mediaDto(videoAsset),
      media: this.mediaDto(mediaAsset),
      tags: [],
    };
  }

  private toJsonObjectInput(value: Record<string, unknown>) {
    return value as Prisma.InputJsonObject;
  }

  private async validateFormConfigMedia(
    config: Record<string, unknown>,
    projectId: string,
  ) {
    const logoAssetId = this.readBrandingLogoAssetId(config);
    if (logoAssetId) {
      await this.mediaService?.getAssetForOwner({
        assetId: logoAssetId,
        purpose: MediaAssetPurpose.FORM_BRANDING_LOGO,
        projectId,
        statuses: [MediaAssetStatus.ACTIVE],
      });
    }
    return this.stripHydratedLogo(config);
  }

  private async hydrateFormConfig(config: Prisma.JsonValue) {
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      return config;
    }
    const record = { ...(config as Record<string, unknown>) };
    const branding =
      record.branding &&
      typeof record.branding === "object" &&
      !Array.isArray(record.branding)
        ? { ...(record.branding as Record<string, unknown>) }
        : null;
    if (!branding) return record as Prisma.JsonValue;
    const logoAssetId =
      typeof branding.logoAssetId === "string" ? branding.logoAssetId : null;
    const logo = logoAssetId
      ? await this.prisma.client.mediaAsset.findUnique({
          where: { id: logoAssetId },
        })
      : null;
    branding.logo = this.mediaDto(logo);
    delete branding.logoUrl;
    record.branding = branding;
    return record as Prisma.JsonValue;
  }

  private stripHydratedLogo(config: Record<string, unknown>) {
    const next = { ...config };
    if (
      next.branding &&
      typeof next.branding === "object" &&
      !Array.isArray(next.branding)
    ) {
      const branding = { ...(next.branding as Record<string, unknown>) };
      delete branding.logo;
      delete branding.logoUrl;
      next.branding = branding;
    }
    return next;
  }

  private readBrandingLogoAssetId(config: Record<string, unknown>) {
    const branding = config.branding;
    if (!branding || typeof branding !== "object" || Array.isArray(branding)) {
      return null;
    }
    const value = (branding as Record<string, unknown>).logoAssetId;
    return typeof value === "string" ? value : null;
  }

  private mediaDto(asset: Parameters<NonNullable<MediaService["toDto"]>>[0]) {
    return this.mediaService?.toDto(asset) ?? null;
  }

  private toJsonValueInput(value: Prisma.JsonValue) {
    return value as Prisma.InputJsonValue;
  }

  private toDuplicateFormName(name: string) {
    return `${name} (copy)`.slice(0, 255);
  }

  private async createUniqueFormSlug(
    projectId: string,
    source: string,
    currentFormId?: string,
  ) {
    const base = slugify(source) || "form";
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const slug =
        attempt === 0
          ? base
          : `${base}-${attempt + 1}`.slice(0, 255).replace(/-+$/g, "");
      const existing = await this.prisma.client.collectionForm.findFirst({
        where: {
          projectId,
          slug,
          ...(currentFormId ? { id: { not: currentFormId } } : {}),
        },
        select: { id: true },
      });

      if (!existing) return slug;
    }

    throw new BadRequestException("Could not allocate a unique form slug");
  }

  private toProjectedTestimonialRating(
    rating: CreateFormSubmissionBodyDto["rating"],
  ) {
    if (rating === null || rating === undefined) {
      return null;
    }

    return rating <= 5 ? rating : null;
  }

  private toSubmissionRatingScale(
    rating: CreateFormSubmissionBodyDto["rating"],
  ) {
    if (rating === null || rating === undefined) {
      return null;
    }

    return rating > 5 ? 10 : 5;
  }

  private toPublicSubmitConsentSnapshot(body: CreateFormSubmissionBodyDto) {
    return {
      isOAuthVerified: body.isOAuthVerified ?? false,
      oauthProvider: body.oauthProvider ?? null,
    };
  }

  private readHeader(request: PublicSubmitRequest, name: string) {
    const value = request.headers[name];
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  private toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private stringOrNull(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  private radiusTokenToNumber(value: unknown) {
    if (value === "sharp") return 0;
    if (value === "subtle") return 8;
    if (value === "pill") return 28;
    return 14;
  }

  private fontFamilyTokenToCss(value: unknown) {
    if (value === "serif") return "Georgia, Cambria, serif";
    if (value === "mono") {
      return "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    }
    if (value === "system") return "ui-sans-serif, system-ui, sans-serif";
    return "Inter, ui-sans-serif, system-ui, sans-serif";
  }

  private async tryReplayIdempotentSubmit(
    projectId: string,
    idempotencyKey: string,
    payloadHash: string,
  ) {
    try {
      await this.prisma.client.publicSubmitIdempotency.create({
        data: {
          projectId,
          surface: PublicSubmitSurface.FORM,
          idempotencyKey,
          payloadHash,
          responseStatusCode: 201,
          responseBody: {},
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      return null;
    } catch (error: unknown) {
      if (!this.isPrismaUniqueViolation(error)) {
        throw error;
      }

      const existing =
        await this.prisma.client.publicSubmitIdempotency.findUnique({
          where: publicSubmitIdempotencyWhere(
            projectId,
            PublicSubmitSurface.FORM,
            idempotencyKey,
          ),
        });

      if (!existing) {
        throw new InternalServerErrorException(
          "Public submit idempotency ledger is missing after collision",
        );
      }

      return replayCompletedPublicSubmit(existing, payloadHash);
    }
  }

  private async bustPublicFormsCache(slug: string) {
    await this.redisService.redis.del(this.getPublicFormsCacheKey(slug));
  }

  private getPublicFormsCacheKey(slug: string) {
    return `v2:forms:public:${slug}`;
  }

  private async bustPublicTestimonialsCache(slug: string) {
    let cursor = "0";

    try {
      do {
        const [nextCursor, keys] = await this.redisService.redis.scan(
          cursor,
          "MATCH",
          `v2:testimonials:public:${slug}:*`,
          "COUNT",
          100,
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.redisService.redis.del(...keys);
        }
      } while (cursor !== "0");
    } catch (error) {
      this.logger.warn(
        `Failed to bust public testimonial cache for slug ${slug}: ${String(error)}`,
      );
    }
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

function normalizeHostname(value: string) {
  const trimmed = value.trim().toLowerCase().replace(/\.$/, "");
  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`)
      .hostname;
  } catch {
    return trimmed;
  }
}

function normalizePath(path: string) {
  const normalized = path.trim().replace(/\/+$/g, "") || "/";
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 255)
    .replace(/-+$/g, "");
}

function startOfUtcDay(now: Date) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}
