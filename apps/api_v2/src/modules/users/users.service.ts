import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UserOnboardingStep } from "@workspace/database/prisma";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  ClerkUserPayloadDto,
  OnboardingDataPatchDto,
  UpdateOnboardingProgressBodyDto,
  UpdateUserProfileBodyDto,
} from "./users.dto.js";

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

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getMe(clerkUserId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: clerkUserId },
      select: UsersService.USER_SELECT,
    });

    if (!user) throw new NotFoundException("User not found");
    return user;
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

  async completeOnboarding(clerkUserId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: clerkUserId },
      select: UsersService.USER_SELECT,
    });

    if (!user) throw new NotFoundException("User not found");
    if (user.onboardingCompletedAt) return user;

    return this.prisma.client.user.update({
      where: { id: clerkUserId },
      data: {
        onboardingStep: UserOnboardingStep.COMPLETED,
        onboardingCompletedAt: new Date(),
      },
      select: UsersService.USER_SELECT,
    });
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
    const primaryEmail = payload.primaryEmailAddressId
      ? payload.emailAddresses.find(
          (emailAddress) => emailAddress.id === payload.primaryEmailAddressId,
        )?.emailAddress
      : undefined;
    const email = primaryEmail ?? payload.emailAddresses[0]?.emailAddress;
    if (!email) return;

    await this.prisma.client.user.upsert({
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
    });
  }

  private isPrismaNotFoundError(error: unknown): error is { code: string } {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    );
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
