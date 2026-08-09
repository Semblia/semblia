import { beforeEach, describe, expect, it, vi } from "vitest";
import { InternalServerErrorException } from "@nestjs/common";
import { SigningSecretService } from "./signing-secret.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { ConfigService } from "@nestjs/config";
import type { NotificationsService } from "../notifications/notifications.service.js";

const mockProjectUpdate = vi.fn();
const mockProjectFindUnique = vi.fn();
const mockProjectSigningSecretFindFirst = vi.fn();
const mockProjectSigningSecretAggregate = vi.fn();
const mockProjectSigningSecretUpdateMany = vi.fn();
const mockProjectSigningSecretCreate = vi.fn();
const mockTransaction = vi.fn();
const mockConfigGet = vi.fn();
const mockCreateForProjectManagers = vi.fn();

const prismaMock = {
  client: {
    $transaction: mockTransaction,
    project: {
      update: mockProjectUpdate,
      findUnique: mockProjectFindUnique,
    },
    projectSigningSecret: {
      findFirst: mockProjectSigningSecretFindFirst,
      aggregate: mockProjectSigningSecretAggregate,
      updateMany: mockProjectSigningSecretUpdateMany,
      create: mockProjectSigningSecretCreate,
    },
  },
} as unknown as PrismaService;

const configServiceMock = {
  get: mockConfigGet,
} as unknown as ConfigService;

const notificationsServiceMock = {
  createForProjectManagers: mockCreateForProjectManagers,
} as unknown as NotificationsService;

const base64Key = Buffer.alloc(32, 9).toString("base64");

describe("SigningSecretService", () => {
  let service: SigningSecretService;

  beforeEach(() => {
    service = new SigningSecretService(
      prismaMock,
      configServiceMock,
      notificationsServiceMock,
    );
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (callback) =>
      callback(prismaMock.client),
    );
    mockConfigGet.mockReturnValue(base64Key);
    mockProjectSigningSecretAggregate.mockResolvedValue({
      _max: { version: 0 },
    });
    mockProjectSigningSecretCreate.mockImplementation(({ data }) =>
      Promise.resolve({ id: "secret_1", ...data }),
    );
  });

  it("generates a normalized signing secret and keeps project columns as a shim", async () => {
    await service.generateOrRotate("project_1");

    expect(mockProjectSigningSecretUpdateMany).toHaveBeenCalledWith({
      where: { projectId: "project_1", status: "ACTIVE" },
      data: {
        status: "REVOKED",
        revokedAt: expect.any(Date),
      },
    });
    expect(mockProjectSigningSecretCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        version: 1,
        secretEncrypted: expect.any(String),
        status: "ACTIVE",
      }),
    });
    expect(mockProjectUpdate).toHaveBeenCalledWith({
      where: { id: "project_1" },
      data: expect.objectContaining({
        signingSecretEncrypted: expect.any(String),
        signingSecretRotatedAt: expect.any(Date),
      }),
    });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockCreateForProjectManagers).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        type: "SECURITY_ALERT",
        metadata: expect.objectContaining({
          projectId: "project_1",
          action: "signing_secret.rotated",
        }),
      }),
    );

    const result = await service.generateOrRotate("project_1");
    expect(result.plaintext).toEqual(expect.any(String));
    expect(result.rotatedAt).toEqual(expect.any(Date));
  });

  it("roundtrips the encrypted blob through getDecrypted", async () => {
    mockProjectUpdate.mockResolvedValue(undefined);

    const generated = await service.generateOrRotate("project_1");
    expect(mockProjectSigningSecretCreate.mock.calls[0]).toBeDefined();
    const encrypted =
      mockProjectSigningSecretCreate.mock.calls[0]![0].data.secretEncrypted;
    mockProjectSigningSecretFindFirst.mockResolvedValue({
      id: "secret_1",
      secretEncrypted: encrypted,
    });

    await expect(service.getDecrypted("project_1")).resolves.toBe(
      generated.plaintext,
    );
  });

  it("rotates by replacing the stored encrypted blob", async () => {
    await service.generateOrRotate("project_1");
    expect(mockProjectSigningSecretCreate.mock.calls[0]).toBeDefined();
    const firstEncrypted =
      mockProjectSigningSecretCreate.mock.calls[0]![0].data.secretEncrypted;

    mockProjectSigningSecretAggregate.mockResolvedValue({
      _max: { version: 1 },
    });
    await service.generateOrRotate("project_1");
    expect(mockProjectSigningSecretCreate.mock.calls[1]).toBeDefined();
    const secondEncrypted =
      mockProjectSigningSecretCreate.mock.calls[1]![0].data.secretEncrypted;

    expect(secondEncrypted).not.toBe(firstEncrypted);
  });

  it("clears both signing secret columns", async () => {
    await service.clear("project_1");

    expect(mockProjectUpdate).toHaveBeenCalledWith({
      where: { id: "project_1" },
      data: {
        signingSecretEncrypted: null,
        signingSecretRotatedAt: null,
      },
    });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockCreateForProjectManagers).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        type: "SECURITY_ALERT",
        metadata: expect.objectContaining({
          projectId: "project_1",
          action: "signing_secret.cleared",
        }),
      }),
    );
  });

  it("throws when the env key is missing", async () => {
    mockConfigGet.mockReturnValue(undefined);

    await expect(service.generateOrRotate("project_1")).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
