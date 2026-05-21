import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@workspace/database/prisma";
import type {
  V2AccountBrandDefaultsDTO,
  V2AccountDefaultsDTO,
  V2AccountModerationDefaultsDTO,
  V2AccountVisibilityAccessDefaultsDTO,
  V2FormConfigDTO,
} from "@workspace/types";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  accountDefaultsSchema,
  type UpdateAccountDefaultsBodyDto,
} from "./account-defaults.dto.js";

type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export const DEFAULT_ACCOUNT_FORM_CONFIG: V2FormConfigDTO = {
  content: {
    headerTitle: "Share your experience",
    headerDescription:
      "Your honest feedback helps others make better decisions.",
    submitButtonLabel: "Submit testimonial",
    thankYouTitle: "Thank you!",
    thankYouMessage: "Your testimonial has been received.",
    successAction: { kind: "message" },
  },
  fields: {
    email: { enabled: true, required: false },
    rating: { enabled: true, required: false, scale: 5 },
    jobTitle: { enabled: true, required: false },
    company: { enabled: true, required: false },
    avatar: { enabled: true, required: false },
    videoUrl: { enabled: false, required: false },
    consent: {
      enabled: true,
      mode: "declaration",
      label: "By submitting, you agree to let us share your testimonial.",
    },
  },
  branding: {
    logoUrl: null,
    colors: {
      primary: "#6366f1",
      background: "#ffffff",
      foreground: "#0f172a",
      accent: "#f8fafc",
    },
    fontFamily: "inter",
    cornerRadius: "rounded",
    mode: "light",
    inputStyle: "outlined",
    buttonStyle: "solid",
    shadow: "subtle",
    density: "default",
    headerAlignment: "left",
    headingWeight: "semibold",
  },
  behavior: {
    allowAnonymous: true,
    oauthProviders: ["google"],
    notifyOnSubmission: true,
    moderation: "auto",
    allowFingerprintOptOut: true,
  },
  watermark: {
    show: true,
    position: "bottom-right",
  },
  delivery: {
    customDomain: null,
    pathSuffix: "",
    embedScriptEnabled: true,
  },
};

export const DEFAULT_ACCOUNT_MODERATION: V2AccountModerationDefaultsDTO = {
  autoModeration: true,
  autoApproveVerified: false,
  profanityFilterLevel: "MODERATE",
};

export const DEFAULT_ACCOUNT_VISIBILITY_ACCESS: V2AccountVisibilityAccessDefaultsDTO =
  {
    visibility: "PRIVATE",
    isActive: true,
  };

export const DEFAULT_ACCOUNT_BRAND: V2AccountBrandDefaultsDTO = {
  brandColorPrimary: null,
  brandColorSecondary: null,
  logoUrl: null,
};

const EMPTY_ACCOUNT_DEFAULTS: V2AccountDefaultsDTO = {
  form: null,
  moderation: null,
  visibilityAccess: null,
  brand: null,
};

@Injectable()
export class AccountDefaultsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getDefaults(userId: string): Promise<V2AccountDefaultsDTO> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { defaults: true },
    });

    if (!user) throw new NotFoundException("User not found");
    return parseAccountDefaults(user.defaults);
  }

  async patchDefaults(
    userId: string,
    patch: UpdateAccountDefaultsBodyDto,
  ): Promise<V2AccountDefaultsDTO> {
    const current = await this.getDefaults(userId);
    const next = mergeAccountDefaults(current, patch);

    const updated = await this.prisma.client.user.update({
      where: { id: userId },
      data: { defaults: next as unknown as Prisma.InputJsonValue },
      select: { defaults: true },
    });

    return parseAccountDefaults(updated.defaults);
  }
}

export function parseAccountDefaults(value: unknown): V2AccountDefaultsDTO {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...EMPTY_ACCOUNT_DEFAULTS };
  }

  return accountDefaultsSchema.parse({
    ...EMPTY_ACCOUNT_DEFAULTS,
    ...(value as Record<string, unknown>),
  });
}

export function mergeAccountDefaults(
  current: V2AccountDefaultsDTO,
  patch: UpdateAccountDefaultsBodyDto,
): V2AccountDefaultsDTO {
  return {
    form:
      patch.form === undefined
        ? current.form
        : patch.form === null
          ? null
          : deepMerge(current.form ?? DEFAULT_ACCOUNT_FORM_CONFIG, patch.form),
    moderation:
      patch.moderation === undefined
        ? current.moderation
        : patch.moderation === null
          ? null
          : {
              ...(current.moderation ?? DEFAULT_ACCOUNT_MODERATION),
              ...patch.moderation,
            },
    visibilityAccess:
      patch.visibilityAccess === undefined
        ? current.visibilityAccess
        : patch.visibilityAccess === null
          ? null
          : {
              ...(current.visibilityAccess ??
                DEFAULT_ACCOUNT_VISIBILITY_ACCESS),
              ...patch.visibilityAccess,
            },
    brand:
      patch.brand === undefined
        ? current.brand
        : patch.brand === null
          ? null
          : {
              ...(current.brand ?? DEFAULT_ACCOUNT_BRAND),
              ...patch.brand,
            },
  };
}

function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
  if (
    patch === null ||
    typeof patch !== "object" ||
    Array.isArray(patch) ||
    base === null ||
    typeof base !== "object" ||
    Array.isArray(base)
  ) {
    return patch as T;
  }

  const out: Record<string, unknown> = {
    ...(base as Record<string, unknown>),
  };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const current = out[key];
    out[key] =
      current &&
      typeof current === "object" &&
      !Array.isArray(current) &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
        ? deepMerge(current, value as DeepPartial<typeof current>)
        : value;
  }

  return out as T;
}
