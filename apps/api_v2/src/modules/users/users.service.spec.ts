import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";

// Prevent Prisma from initializing during import
vi.mock("@workspace/database/prisma", () => ({ prisma: {} }));

import { UsersService } from "./users.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();

const prismaMock = {
  client: { user: { findUnique: mockFindUnique, upsert: mockUpsert } },
} as unknown as PrismaService;

const mockUser = {
  id: "user_abc",
  email: "test@example.com",
  firstName: "Alice",
  lastName: "Smith",
  avatar: null,
  plan: "FREE" as const,
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
});
