import type { V2ProjectDTO } from "@workspace/types";

/**
 * Legacy form-config shape stored on `Project.formConfig` in older records.
 * Newer projects use the structured `FormConfig` below; `migrateLegacy` lifts
 * legacy records into the new shape.
 */
export interface LegacyFormConfig {
  headerTitle: string;
  headerDescription: string;
  thankYouMessage: string;
  enableRating: boolean;
  enableJobTitle: boolean;
  enableCompany: boolean;
  enableAvatar: boolean;
  enableVideoUrl: boolean;
  enableGoogleVerification: boolean;
  requireRating: boolean;
  requireJobTitle: boolean;
  requireCompany: boolean;
  requireAvatar: boolean;
  requireVideoUrl: boolean;
  requireGoogleVerification: boolean;
  allowAnonymousSubmissions: boolean;
  notifyOnSubmission: boolean;
  allowFingerprintOptOut: boolean;
}

export type FieldKey =
  | "name"
  | "email"
  | "content"
  | "rating"
  | "jobTitle"
  | "company"
  | "avatar"
  | "videoUrl"
  | "consent";

export type FontFamily = "inter" | "geist" | "system" | "serif" | "mono";
export type CornerRadius = "sharp" | "subtle" | "rounded" | "pill";
export type DisplayMode = "light" | "dark" | "system";
export type InputStyle = "outlined" | "filled" | "underlined" | "minimal";
export type ButtonStyle = "solid" | "outline" | "soft" | "ghost";
export type Shadow = "none" | "subtle" | "medium";
export type Density = "compact" | "default" | "spacious";
export type HeaderAlignment = "left" | "center";
export type HeadingWeight = "light" | "normal" | "semibold" | "bold";
export type WatermarkPosition =
  | "bottom-left"
  | "bottom-right"
  | "bottom-center";
export type OAuthProvider = "google" | "github";
export type ModerationMode = "auto" | "manual";
export type ConsentMode = "declaration" | "checkbox";

export type SuccessAction =
  | { kind: "message" }
  | { kind: "redirect"; url: string };

export interface FormConfig {
  content: {
    headerTitle: string;
    headerDescription: string;
    submitButtonLabel: string;
    thankYouTitle: string;
    thankYouMessage: string;
    successAction: SuccessAction;
  };
  fields: {
    email: { enabled: boolean; required: boolean };
    rating: { enabled: boolean; required: boolean; scale: 5 | 10 };
    jobTitle: { enabled: boolean; required: boolean };
    company: { enabled: boolean; required: boolean };
    avatar: { enabled: boolean; required: boolean };
    videoUrl: { enabled: boolean; required: boolean };
    consent: { enabled: boolean; mode: ConsentMode; label: string };
  };
  branding: {
    logoAssetId: string | null;
    logo: import("@workspace/types").V2MediaAssetDTO | null;
    colors: {
      primary: string;
      background: string;
      foreground: string;
      accent: string;
    };
    fontFamily: FontFamily;
    cornerRadius: CornerRadius;
    mode: DisplayMode;
    inputStyle: InputStyle;
    buttonStyle: ButtonStyle;
    shadow: Shadow;
    density: Density;
    headerAlignment: HeaderAlignment;
    headingWeight: HeadingWeight;
  };
  behavior: {
    allowAnonymous: boolean;
    oauthProviders: OAuthProvider[];
    notifyOnSubmission: boolean;
    moderation: ModerationMode;
    allowFingerprintOptOut: boolean;
  };
  watermark: {
    show: boolean;
    position: WatermarkPosition;
  };
  delivery: {
    customDomain: string | null;
    pathSuffix: string;
    embedScriptEnabled: boolean;
  };
}

export const DEFAULT_CONFIG: FormConfig = {
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

function isNewFormConfigShape(value: unknown): value is FormConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.content === "object" &&
    record.content !== null &&
    typeof record.fields === "object" &&
    record.fields !== null &&
    typeof record.branding === "object" &&
    record.branding !== null
  );
}

export function buildInitialConfig(project: V2ProjectDTO): FormConfig {
  const primary =
    project.brandColorPrimary ?? DEFAULT_CONFIG.branding.colors.primary;
  const accent =
    project.brandColorSecondary ?? DEFAULT_CONFIG.branding.colors.accent;

  const raw = project.formConfig as unknown;
  const isNew = isNewFormConfigShape(raw);
  const legacy = !isNew ? (raw as LegacyFormConfig | null) : null;
  const fromConfig = isNew ? (raw as FormConfig) : null;

  const base: FormConfig = fromConfig
    ? fromConfig
    : legacy
      ? migrateLegacy(legacy)
      : structuredClone(DEFAULT_CONFIG);

  return {
    ...base,
    content: {
      ...base.content,
      headerTitle:
        fromConfig?.content.headerTitle ??
        legacy?.headerTitle ??
        `Share your ${project.name} experience`,
      headerDescription:
        fromConfig?.content.headerDescription ??
        legacy?.headerDescription ??
        `Tell us how ${project.name} helped you.`,
      thankYouMessage:
        fromConfig?.content.thankYouMessage ??
        legacy?.thankYouMessage ??
        base.content.thankYouMessage,
    },
    branding: {
      ...base.branding,
      logoAssetId: project.logo?.id ?? base.branding.logoAssetId,
      logo: project.logo ?? base.branding.logo,
      colors: {
        ...base.branding.colors,
        primary,
        accent,
      },
    },
    delivery: {
      ...base.delivery,
      pathSuffix: project.slug,
    },
  };
}

export function migrateLegacy(legacy: LegacyFormConfig | null): FormConfig {
  if (!legacy) return structuredClone(DEFAULT_CONFIG);
  const base = structuredClone(DEFAULT_CONFIG);
  return {
    ...base,
    content: {
      ...base.content,
      headerTitle: legacy.headerTitle,
      headerDescription: legacy.headerDescription,
      thankYouMessage: legacy.thankYouMessage,
    },
    fields: {
      email: base.fields.email,
      rating: {
        enabled: legacy.enableRating,
        required: legacy.requireRating,
        scale: 5,
      },
      jobTitle: {
        enabled: legacy.enableJobTitle,
        required: legacy.requireJobTitle,
      },
      company: {
        enabled: legacy.enableCompany,
        required: legacy.requireCompany,
      },
      avatar: {
        enabled: legacy.enableAvatar,
        required: legacy.requireAvatar,
      },
      videoUrl: {
        enabled: legacy.enableVideoUrl,
        required: legacy.requireVideoUrl,
      },
      consent: base.fields.consent,
    },
    behavior: {
      ...base.behavior,
      allowAnonymous: legacy.allowAnonymousSubmissions,
      notifyOnSubmission: legacy.notifyOnSubmission,
      allowFingerprintOptOut: legacy.allowFingerprintOptOut,
      oauthProviders: legacy.enableGoogleVerification ? ["google"] : [],
    },
  };
}

export const FIELD_ORDER: FieldKey[] = [
  "name",
  "email",
  "content",
  "rating",
  "jobTitle",
  "company",
  "avatar",
  "videoUrl",
  "consent",
];

export const FIELD_LABELS: Record<FieldKey, string> = {
  name: "Name",
  email: "Email",
  content: "Your testimonial",
  rating: "Rating",
  jobTitle: "Job title",
  company: "Company",
  avatar: "Profile photo",
  videoUrl: "Video URL",
  consent: "Consent",
};

export function isFieldEnabled(config: FormConfig, key: FieldKey): boolean {
  if (key === "name" || key === "content") return true;
  const f = config.fields[key as Exclude<FieldKey, "name" | "content">];
  return f.enabled;
}

export function isFieldRequired(config: FormConfig, key: FieldKey): boolean {
  if (key === "name" || key === "content") return true;
  if (key === "consent") {
    return (
      config.fields.consent.enabled && config.fields.consent.mode === "checkbox"
    );
  }
  const f =
    config.fields[key as Exclude<FieldKey, "name" | "content" | "consent">];
  return "required" in f ? f.required : false;
}

export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

export function deepMerge<T>(target: T, patch: DeepPartial<T>): T {
  if (patch === null || patch === undefined) return target;
  if (
    typeof target !== "object" ||
    target === null ||
    Array.isArray(target) ||
    typeof patch !== "object" ||
    Array.isArray(patch)
  ) {
    return patch as T;
  }
  const out: Record<string, unknown> = {
    ...(target as Record<string, unknown>),
  };
  for (const key of Object.keys(patch) as Array<keyof T>) {
    const pv = patch[key];
    if (pv === undefined) continue;
    const tv = (target as Record<string, unknown>)[key as string];
    if (
      typeof tv === "object" &&
      tv !== null &&
      !Array.isArray(tv) &&
      typeof pv === "object" &&
      pv !== null &&
      !Array.isArray(pv)
    ) {
      out[key as string] = deepMerge(tv, pv as DeepPartial<typeof tv>);
    } else {
      out[key as string] = pv;
    }
  }
  return out as T;
}

export function deepEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ak = Object.keys(a as object);
  const bk = Object.keys(b as object);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (
      !deepEqual(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
      )
    ) {
      return false;
    }
  }
  return true;
}
