import {
  Inject,
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  FormIntent,
  FormStatus,
  MemberRole,
  Prisma,
  UserOnboardingStep,
} from "@workspace/database/prisma";
import type { V2LastUsedProjectDTO } from "@workspace/types";
import { PrismaService } from "../prisma/prisma.service.js";
import { ClerkService } from "../clerk/clerk.service.js";
import {
  ProjectAccessService,
  type ResolvedProjectAccess,
} from "../../common/authz/project-access.service.js";
import type { ActorContext } from "../../common/authz/actor-context.js";
import type {
  ClerkUserPayloadDto,
  OnboardingDataPatchDto,
  SetLastUsedProjectBodyDto,
  UpdateOnboardingProgressBodyDto,
  UpdateUserProfileBodyDto,
} from "./users.dto.js";

const USER_RECONCILIATION_WAIT_MS = 20_000;
const USER_RECONCILIATION_RETRY_AFTER_MS = 2_000;

const INTENT_NAMES: Record<string, string> = {
  TESTIMONIAL: "Testimonials",
  REVIEW: "Reviews",
  PRODUCT_FEEDBACK: "Product Feedback",
  CUSTOMER_STORY: "Customer Stories",
  CUSTOM: "Feedback",
};

@Injectable()
export class UsersService {
  private static readonly USER_SELECT = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    avatar: true,
    plan: true,
    onboardingStep: true,
    onboardingData: true,
    onboardingCompletedAt: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  private readonly logger = new Logger(UsersService.name);

  private readonly reconciliationWaiters = new Map<string, Set<() => void>>();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ClerkService) private readonly clerkService: ClerkService,
    @Inject(ProjectAccessService)
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async getMe(clerkUserId: string) {
    const user = await this.findCurrentUser(clerkUserId);
    if (user) return user;

    const syncedUser = await this.syncCurrentUserFromClerk(clerkUserId);
    if (syncedUser) return syncedUser;

    const waiter = this.createReconciliationWaiter(clerkUserId);
    try {
      const userAfterWaiterRegistration =
        await this.findCurrentUser(clerkUserId);
      if (userAfterWaiterRegistration) return userAfterWaiterRegistration;

      await waiter.promise;
    } finally {
      waiter.cancel();
    }

    const reconciledUser = await this.findCurrentUser(clerkUserId);
    if (reconciledUser) return reconciledUser;

    const syncedAfterWait = await this.syncCurrentUserFromClerk(clerkUserId);
    if (syncedAfterWait) return syncedAfterWait;

    throw new ServiceUnavailableException({
      message: "Account setup is still in progress",
      details: {
        code: "ACCOUNT_RECONCILING",
        retryAfterMs: USER_RECONCILIATION_RETRY_AFTER_MS,
      },
    });
  }

  async updateProfile(clerkUserId: string, body: UpdateUserProfileBodyDto) {
    const data: UpdateUserProfileBodyDto = {};

    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.avatar !== undefined) data.avatar = body.avatar;

    try {
      return await this.prisma.client.user.update({
        where: { id: clerkUserId },
        data,
        select: UsersService.USER_SELECT,
      });
    } catch (error: unknown) {
      if (this.isPrismaNotFoundError(error)) {
        throw new NotFoundException("User not found");
      }

      throw error;
    }
  }

  async getLastUsedProject(
    clerkUserId: string,
    actor: ActorContext | null,
  ): Promise<V2LastUsedProjectDTO> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: clerkUserId },
      select: {
        lastUsedProject: {
          select: {
            id: true,
            slug: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException("User not found");
    if (!user.lastUsedProject) return { project: null };

    const access = await this.resolveProjectAccessOrNull(
      clerkUserId,
      actor,
      user.lastUsedProject.slug,
    );

    return {
      project: access
        ? {
            id: access.project.id,
            slug: access.project.slug,
          }
        : null,
    };
  }

  async setLastUsedProject(
    clerkUserId: string,
    actor: ActorContext | null,
    body: SetLastUsedProjectBodyDto,
  ): Promise<V2LastUsedProjectDTO> {
    if (!actor || actor.actorType !== "user") {
      throw new ForbiddenException("A user session is required");
    }

    const access = await this.projectAccessService.resolveBySlug(
      actor,
      body.slug,
    );

    await this.prisma.client.user.update({
      where: { id: clerkUserId },
      data: {
        lastUsedProjectId: access.project.id,
      },
      select: { id: true },
    });

    return {
      project: {
        id: access.project.id,
        slug: access.project.slug,
      },
    };
  }

  async completeOnboarding(clerkUserId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: clerkUserId },
      select: UsersService.USER_SELECT,
    });

    if (!user) throw new NotFoundException("User not found");
    if (user.onboardingCompletedAt) return user;

    const onboardingData = this.asRecord(user.onboardingData);
    const intentData = this.asRecord(onboardingData.intent);
    const intents = intentData.intents;
    const primaryIntent =
      Array.isArray(intents) && typeof intents[0] === "string"
        ? intents[0]
        : undefined;

    const updatedUser = await this.prisma.client.user.update({
      where: { id: clerkUserId },
      data: {
        onboardingStep: UserOnboardingStep.COMPLETED,
        onboardingCompletedAt: new Date(),
      },
      select: UsersService.USER_SELECT,
    });

    if (primaryIntent) {
      try {
        const intentName = Object.prototype.hasOwnProperty.call(
          INTENT_NAMES,
          primaryIntent,
        )
          ? INTENT_NAMES[primaryIntent]
          : undefined;
        const formIntent = FormIntent[primaryIntent as keyof typeof FormIntent];

        if (intentName && formIntent) {
          const membership = await this.prisma.client.projectMember.findFirst({
            where: { userId: clerkUserId, role: MemberRole.OWNER },
            orderBy: { createdAt: "asc" },
            select: { projectId: true },
          });

          if (membership) {
            const seedForm = await this.prisma.client.form.findFirst({
              where: {
                projectId: membership.projectId,
                slug: "testimonials",
                status: FormStatus.DRAFT,
              },
              select: { id: true, intent: true },
            });

            if (seedForm && seedForm.intent !== formIntent) {
              await this.prisma.client.form.update({
                where: { id: seedForm.id },
                data: {
                  intent: formIntent,
                  name: intentName,
                },
              });
            }
          }
        }
      } catch (error: unknown) {
        this.logger.warn(
          "Failed to apply onboarding intent to seed form",
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return updatedUser;
  }

  async updateOnboardingProgress(
    clerkUserId: string,
    body: UpdateOnboardingProgressBodyDto,
  ) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: clerkUserId },
      select: {
        onboardingData: true,
      },
    });

    if (!user) throw new NotFoundException("User not found");

    return this.prisma.client.user.update({
      where: { id: clerkUserId },
      data: {
        onboardingStep: body.step,
        onboardingData: this.mergeOnboardingData(
          user.onboardingData,
          body.data,
        ),
      },
      select: UsersService.USER_SELECT,
    });
  }

  async upsertFromClerk(payload: ClerkUserPayloadDto) {
    const user = await this.upsertClerkUserMirror(payload);
    if (user) {
      this.notifyReconciliationWaiters(payload.id);
    }
    return user;
  }

  private async syncCurrentUserFromClerk(clerkUserId: string) {
    let payload: ClerkUserPayloadDto | null;
    try {
      payload = await this.clerkService.getUserPayload(clerkUserId);
    } catch (error: unknown) {
      if (this.isClerkNotFoundError(error)) {
        throw new UnauthorizedException(
          "Authenticated Clerk user no longer exists",
        );
      }
      return null;
    }

    if (!payload) return null;
    return this.upsertClerkUserMirror(payload);
  }

  private async resolveProjectAccessOrNull(
    clerkUserId: string,
    actor: ActorContext | null,
    slug: string,
  ): Promise<ResolvedProjectAccess | null> {
    try {
      return await this.projectAccessService.resolveBySlug(
        actor ?? clerkUserId,
        slug,
      );
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        return null;
      }

      throw error;
    }
  }

  private async upsertClerkUserMirror(payload: ClerkUserPayloadDto) {
    const primaryEmail = payload.primaryEmailAddressId
      ? payload.emailAddresses.find(
          (emailAddress) => emailAddress.id === payload.primaryEmailAddressId,
        )?.emailAddress
      : undefined;
    const email = primaryEmail ?? payload.emailAddresses[0]?.emailAddress;
    if (!email) return null;

    return this.prisma.client.user.upsert({
      where: { id: payload.id },
      create: {
        id: payload.id,
        email,
        firstName: payload.firstName ?? undefined,
        lastName: payload.lastName ?? undefined,
        avatar: payload.imageUrl ?? undefined,
      },
      update: {
        email,
        firstName: payload.firstName ?? undefined,
        lastName: payload.lastName ?? undefined,
        avatar: payload.imageUrl ?? undefined,
      },
      select: UsersService.USER_SELECT,
    });
  }

  private findCurrentUser(clerkUserId: string) {
    return this.prisma.client.user.findUnique({
      where: { id: clerkUserId },
      select: UsersService.USER_SELECT,
    });
  }

  private createReconciliationWaiter(clerkUserId: string) {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let wake: (() => void) | undefined;

    const cleanup = () => {
      if (timeout) clearTimeout(timeout);

      const waiters = this.reconciliationWaiters.get(clerkUserId);
      if (waiters && wake) {
        waiters.delete(wake);
        if (waiters.size === 0) {
          this.reconciliationWaiters.delete(clerkUserId);
        }
      }
    };

    const promise = new Promise<void>((resolve) => {
      wake = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };

      const waiters =
        this.reconciliationWaiters.get(clerkUserId) ?? new Set<() => void>();
      waiters.add(wake);
      this.reconciliationWaiters.set(clerkUserId, waiters);
      timeout = setTimeout(wake, USER_RECONCILIATION_WAIT_MS);
    });

    return {
      promise,
      cancel: () => {
        if (settled) return;
        settled = true;
        cleanup();
      },
    };
  }

  private notifyReconciliationWaiters(clerkUserId: string) {
    const waiters = this.reconciliationWaiters.get(clerkUserId);
    if (!waiters) return;

    for (const wake of [...waiters]) {
      wake();
    }
  }

  private isPrismaNotFoundError(error: unknown): error is { code: string } {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    );
  }

  private isClerkNotFoundError(error: unknown) {
    if (typeof error !== "object" || error === null) return false;
    const record = error as Record<string, unknown>;
    const status = record.status ?? record.statusCode;
    return status === 404 || status === 410;
  }

  private mergeOnboardingData(
    existing: Prisma.JsonValue | null,
    patch?: OnboardingDataPatchDto,
  ) {
    if (!patch) {
      return this.asJsonObjectInput(existing);
    }

    const next: Record<string, unknown> = {
      ...this.asRecord(existing),
    };

    for (const [section, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      next[section] = {
        ...this.asRecord(next[section]),
        ...this.withoutUndefined(value),
      };
    }

    return next as Prisma.InputJsonObject;
  }

  private asJsonObjectInput(value: Prisma.JsonValue | null) {
    return this.asRecord(value) as Prisma.InputJsonObject;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private withoutUndefined(value: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== undefined),
    );
  }
}
