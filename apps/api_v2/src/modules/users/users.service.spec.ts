import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";

// Prevent Prisma from initializing during import
vi.mock("@workspace/database/prisma", () => ({ prisma: {} }));

import { UsersService } from "./users.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();
const mockUpdate = vi.fn();

const prismaMock = {
  client: {
    user: {
      findUnique: mockFindUnique,
      update: mockUpdate,
      upsert: mockUpsert,
    },
  },
} as unknown as PrismaService;

const mockUser = {
  id: "user_abc",
  email: "test@example.com",
  firstName: "Alice",
  lastName: "Smith",
  avatar: null,
  plan: "FREE" as const,
  onboardingCompletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("UsersService", () => {
  let service: UsersService;

  beforeEach(() => {
    service = new UsersService(prismaMock);
    vi.clearAllMocks();
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

    it("throws NotFoundException when user does not exist", async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(service.getMe("user_missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("upsertFromClerk", () => {
    it("upserts user data from Clerk payload", async () => {
      mockUpsert.mockResolvedValue(mockUser);

      await service.upsertFromClerk({
        id: "user_abc",
        emailAddresses: [{ emailAddress: "test@example.com" }],
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

    it("skips upsert when no email address present", async () => {
      await service.upsertFromClerk({
        id: "user_abc",
        emailAddresses: [],
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
        data: { onboardingCompletedAt: expect.any(Date) },
        select: expect.objectContaining({
          id: true,
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
});
