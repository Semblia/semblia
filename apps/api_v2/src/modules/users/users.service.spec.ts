import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";

// Prevent Prisma from initializing during import
vi.mock("@workspace/database/prisma", () => ({
  prisma: {},
  UserOnboardingStep: {
    COMPLETED: "COMPLETED",
  },
}));

import { UsersService } from "./users.service.js";
import type { ClerkService } from "../clerk/clerk.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();
const mockUpdate = vi.fn();
const mockGetUserPayload = vi.fn();

const prismaMock = {
  client: {
    user: {
      findUnique: mockFindUnique,
      update: mockUpdate,
      upsert: mockUpsert,
    },
  },
} as unknown as PrismaService;

const clerkServiceMock = {
  getUserPayload: mockGetUserPayload,
};

const mockUser = {
  id: "user_abc",
  email: "test@example.com",
  firstName: "Alice",
  lastName: "Smith",
  avatar: null,
  plan: "FREE" as const,
  onboardingStep: "PROFILE" as const,
  onboardingData: null,
  onboardingCompletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("UsersService", () => {
  let service: UsersService;

  beforeEach(() => {
    service = new UsersService(
      prismaMock,
      clerkServiceMock as unknown as ClerkService,
    );
    vi.clearAllMocks();
    mockGetUserPayload.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getMe", () => {
    it("returns the user when found", async () => {
      mockFindUnique.mockResolvedValue(mockUser);

      const result = await service.getMe("user_abc");

      expect(result).toEqual(mockUser);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "user_abc" },
        select: expect.objectContaining({ id: true, email: true }),
      });
    });

    it("waits for Clerk webhook reconciliation before returning the current user", async () => {
      mockFindUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);
      mockUpsert.mockResolvedValue(mockUser);

      const getMePromise = service.getMe("user_abc");
      await flushMicrotasks();

      expect(mockFindUnique).toHaveBeenCalledTimes(2);

      await service.upsertFromClerk({
        id: "user_abc",
        emailAddresses: [{ emailAddress: "test@example.com" }],
        primaryEmailAddressId: undefined,
        firstName: "Alice",
        lastName: "Smith",
        imageUrl: null,
      });

      await expect(getMePromise).resolves.toEqual(mockUser);
      expect(mockFindUnique).toHaveBeenCalledTimes(3);
    });

    it("reconciles the local user from Clerk when the webhook mirror is missing", async () => {
      vi.useFakeTimers();
      mockFindUnique.mockResolvedValueOnce(null);
      mockGetUserPayload.mockResolvedValueOnce({
        id: "user_abc",
        emailAddresses: [{ emailAddress: "test@example.com" }],
        primaryEmailAddressId: undefined,
        firstName: "Alice",
        lastName: "Smith",
        imageUrl: null,
      });
      mockUpsert.mockResolvedValue(mockUser);

      const getMePromise = service.getMe("user_abc");
      await flushMicrotasks();
      await vi.advanceTimersByTimeAsync(20_000);

      await expect(getMePromise).resolves.toEqual(mockUser);
      expect(mockGetUserPayload).toHaveBeenCalledWith("user_abc");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user_abc" },
          select: expect.objectContaining({ id: true, email: true }),
        }),
      );
    });

    it("rejects stale sessions for Clerk users that no longer exist", async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      mockGetUserPayload.mockRejectedValueOnce({ status: 404 });

      await expect(service.getMe("user_deleted")).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("returns a setup-pending service error when reconciliation does not arrive within the wait window", async () => {
      vi.useFakeTimers();
      mockFindUnique.mockResolvedValue(null);

      const getMePromise = service
        .getMe("user_missing")
        .catch((error) => error);
      await flushMicrotasks();
      await vi.advanceTimersByTimeAsync(20_000);

      const error = await getMePromise;

      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as ServiceUnavailableException).getResponse()).toEqual({
        message: "Account setup is still in progress",
        details: {
          code: "ACCOUNT_RECONCILING",
          retryAfterMs: 2_000,
        },
      });
    });
  });

  describe("upsertFromClerk", () => {
    it("upserts user data from Clerk payload", async () => {
      mockUpsert.mockResolvedValue(mockUser);

      await service.upsertFromClerk({
        id: "user_abc",
        emailAddresses: [{ emailAddress: "test@example.com" }],
        primaryEmailAddressId: undefined,
        firstName: "Alice",
        lastName: "Smith",
        imageUrl: null,
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user_abc" },
          create: expect.objectContaining({ email: "test@example.com" }),
          update: expect.objectContaining({ email: "test@example.com" }),
        }),
      );
    });

    it("uses Clerk's primary email when it is present", async () => {
      mockUpsert.mockResolvedValue(mockUser);

      await service.upsertFromClerk({
        id: "user_abc",
        emailAddresses: [
          { id: "idn_secondary", emailAddress: "secondary@example.com" },
          { id: "idn_primary", emailAddress: "primary@example.com" },
        ],
        primaryEmailAddressId: "idn_primary",
        firstName: "Alice",
        lastName: "Smith",
        imageUrl: null,
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ email: "primary@example.com" }),
          update: expect.objectContaining({ email: "primary@example.com" }),
        }),
      );
    });

    it("skips upsert when no email address present", async () => {
      await service.upsertFromClerk({
        id: "user_abc",
        emailAddresses: [],
        primaryEmailAddressId: undefined,
        firstName: null,
        lastName: null,
        imageUrl: null,
      });

      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });

  describe("updateProfile", () => {
    it("returns the updated user", async () => {
      const updatedUser = {
        ...mockUser,
        firstName: "Alicia",
        avatar: "https://example.com/avatar.png",
      };
      mockUpdate.mockResolvedValue(updatedUser);

      const result = await service.updateProfile("user_abc", {
        firstName: "Alicia",
        avatar: "https://example.com/avatar.png",
      });

      expect(result).toEqual(updatedUser);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "user_abc" },
        data: {
          firstName: "Alicia",
          avatar: "https://example.com/avatar.png",
        },
        select: expect.objectContaining({
          id: true,
          email: true,
          onboardingStep: true,
          onboardingData: true,
          onboardingCompletedAt: true,
        }),
      });
    });

    it("throws NotFoundException when prisma returns P2025", async () => {
      mockUpdate.mockRejectedValue({ code: "P2025" });

      await expect(
        service.updateProfile("user_missing", { firstName: "Alicia" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("completeOnboarding", () => {
    it("updates onboardingCompletedAt when onboarding is incomplete", async () => {
      const completedUser = {
        ...mockUser,
        onboardingCompletedAt: new Date("2026-04-29T12:00:00.000Z"),
      };
      mockFindUnique.mockResolvedValueOnce(mockUser);
      mockUpdate.mockResolvedValue(completedUser);

      const result = await service.completeOnboarding("user_abc");

      expect(result).toEqual(completedUser);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "user_abc" },
        select: expect.objectContaining({
          id: true,
          onboardingCompletedAt: true,
        }),
      });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "user_abc" },
        data: {
          onboardingStep: "COMPLETED",
          onboardingCompletedAt: expect.any(Date),
        },
        select: expect.objectContaining({
          id: true,
          onboardingStep: true,
          onboardingCompletedAt: true,
        }),
      });
    });

    it("returns the user without updating when onboarding is already complete", async () => {
      const completedUser = {
        ...mockUser,
        onboardingCompletedAt: new Date("2026-04-29T12:00:00.000Z"),
      };
      mockFindUnique.mockResolvedValueOnce(completedUser);

      const result = await service.completeOnboarding("user_abc");

      expect(result).toEqual(completedUser);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when user is missing", async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      await expect(service.completeOnboarding("user_missing")).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("updateOnboardingProgress", () => {
    it("persists the current onboarding step and merges section data", async () => {
      const existing = {
        onboardingData: {
          profile: { firstName: "Alice" },
        },
      };
      const updatedUser = {
        ...mockUser,
        onboardingStep: "REFERRAL" as const,
        onboardingData: {
          profile: { firstName: "Alice" },
          referral: { source: "search" },
        },
      };
      mockFindUnique.mockResolvedValueOnce(existing);
      mockUpdate.mockResolvedValueOnce(updatedUser);

      const result = await service.updateOnboardingProgress("user_abc", {
        step: "REFERRAL",
        data: {
          referral: { source: "search" },
        },
      });

      expect(result).toEqual(updatedUser);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "user_abc" },
        select: { onboardingData: true },
      });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "user_abc" },
        data: {
          onboardingStep: "REFERRAL",
          onboardingData: {
            profile: { firstName: "Alice" },
            referral: { source: "search" },
          },
        },
        select: expect.objectContaining({
          id: true,
          onboardingStep: true,
          onboardingData: true,
        }),
      });
    });

    it("throws NotFoundException when user is missing", async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateOnboardingProgress("user_missing", {
          step: "PROJECT",
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
