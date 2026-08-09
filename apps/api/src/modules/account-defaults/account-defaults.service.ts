import type {
  V2AccountBrandDefaultsDTO,
  V2AccountDefaultsDTO,
  V2AccountModerationDefaultsDTO,
  V2AccountVisibilityAccessDefaultsDTO,
  V2FormConfigDTO,
} from "@workspace/types";
import { accountDefaultsSchema } from "./account-defaults.dto.js";

// ── Platform-governed project defaults ─────────────────────────────────────────
//
// As of 2026-06-13 project defaults are governed by Semblia, not by users: the
// user-facing `/v2/account/defaults` read/write surface was removed. These
// constants remain the canonical default *values* applied when a project is
// created, and `parseAccountDefaults` validates any persisted shape. The legacy
// `User.defaults` column is no longer read or written and is slated for a
// dedicated schema-cleanup pass.

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
    logoAssetId: null,
    logo: null,
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
  logoAssetId: null,
  logo: null,
};

const EMPTY_ACCOUNT_DEFAULTS: V2AccountDefaultsDTO = {
  form: null,
  moderation: null,
  visibilityAccess: null,
  brand: null,
};

export function parseAccountDefaults(value: unknown): V2AccountDefaultsDTO {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...EMPTY_ACCOUNT_DEFAULTS };
  }

  return accountDefaultsSchema.parse({
    ...EMPTY_ACCOUNT_DEFAULTS,
    ...(value as Record<string, unknown>),
  });
}
