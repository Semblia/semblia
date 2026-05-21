import { RequestMethod } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma/prisma.service.js";
import { AccountDefaultsController } from "./account-defaults.controller.js";
import {
  DEFAULT_ACCOUNT_FORM_CONFIG,
  AccountDefaultsService,
} from "./account-defaults.service.js";

const PATH_METADATA = "path";
const METHOD_METADATA = "method";

const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();

const prismaMock = {
  client: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
  },
} as unknown as PrismaService;

describe("AccountDefaultsController", () => {
  it("declares current-user account defaults routes", () => {
    expect(Reflect.getMetadata(PATH_METADATA, AccountDefaultsController)).toBe(
      "account/defaults",
    );
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        AccountDefaultsController.prototype.getDefaults,
      ),
    ).toBe("/");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        AccountDefaultsController.prototype.getDefaults,
      ),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        AccountDefaultsController.prototype.patchDefaults,
      ),
    ).toBe("/");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        AccountDefaultsController.prototype.patchDefaults,
      ),
    ).toBe(RequestMethod.PATCH);
  });
});

describe("AccountDefaultsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null groups when the user has never saved defaults", async () => {
    mockUserFindUnique.mockResolvedValue({ defaults: null });

    const service = new AccountDefaultsService(prismaMock);
    await expect(service.getDefaults("user_1")).resolves.toEqual({
      form: null,
      moderation: null,
      visibilityAccess: null,
      brand: null,
    });
  });

  it("merges partial group patches without dropping existing groups", async () => {
    mockUserFindUnique.mockResolvedValue({
      defaults: {
        form: DEFAULT_ACCOUNT_FORM_CONFIG,
        moderation: {
          autoModeration: true,
          autoApproveVerified: false,
          profanityFilterLevel: "MODERATE",
        },
        visibilityAccess: {
          visibility: "PRIVATE",
          isActive: true,
        },
        brand: {
          brandColorPrimary: "#111111",
          brandColorSecondary: null,
        },
      },
      accountDefaultsLogoAssetId: null,
      accountDefaultsLogoAsset: null,
    });
    mockUserUpdate.mockResolvedValue({
      defaults: {
        form: DEFAULT_ACCOUNT_FORM_CONFIG,
        moderation: {
          autoModeration: false,
          autoApproveVerified: false,
          profanityFilterLevel: "STRICT",
        },
        visibilityAccess: {
          visibility: "PRIVATE",
          isActive: true,
        },
        brand: {
          brandColorPrimary: "#111111",
          brandColorSecondary: null,
        },
      },
      accountDefaultsLogoAssetId: null,
      accountDefaultsLogoAsset: null,
    });

    const service = new AccountDefaultsService(prismaMock);
    const result = await service.patchDefaults("user_1", {
      moderation: {
        autoModeration: false,
        profanityFilterLevel: "STRICT",
      },
    });

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        defaults: {
          form: DEFAULT_ACCOUNT_FORM_CONFIG,
          moderation: {
            autoModeration: false,
            autoApproveVerified: false,
            profanityFilterLevel: "STRICT",
          },
          visibilityAccess: {
            visibility: "PRIVATE",
            isActive: true,
          },
          brand: {
            brandColorPrimary: "#111111",
            brandColorSecondary: null,
          },
        },
        accountDefaultsLogoAssetId: null,
      },
      select: {
        defaults: true,
        accountDefaultsLogoAssetId: true,
        accountDefaultsLogoAsset: true,
      },
    });
    expect(result.moderation?.autoModeration).toBe(false);
    expect(result.form).toEqual(DEFAULT_ACCOUNT_FORM_CONFIG);
  });
});
