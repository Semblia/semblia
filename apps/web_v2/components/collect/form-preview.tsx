"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  StarIcon,
  UploadIcon,
  VideoIcon,
  CheckCircle2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FIELD_ORDER,
  isFieldEnabled,
  isFieldRequired,
  type FieldKey,
  type FormConfig,
  type InputStyle,
  type ButtonStyle,
} from "@/lib/collect/types";
import { Watermark } from "@/components/collect/watermark";

const FONT_MAP: Record<FormConfig["branding"]["fontFamily"], string> = {
  inter: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  geist: "var(--font-geist-mono), ui-monospace, monospace",
  system: "ui-sans-serif, system-ui, sans-serif",
  serif: "ui-serif, Georgia, serif",
  mono: "var(--font-geist-mono), ui-monospace, monospace",
};

const RADIUS_MAP: Record<FormConfig["branding"]["cornerRadius"], string> = {
  sharp: "0px",
  subtle: "4px",
  rounded: "10px",
  pill: "9999px",
};

const SHADOW_MAP: Record<FormConfig["branding"]["shadow"], string> = {
  none: "none",
  subtle: "0 1px 3px 0 rgba(0,0,0,0.06)",
  medium:
    "0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
};

const HEADING_WEIGHT_MAP: Record<
  FormConfig["branding"]["headingWeight"],
  string
> = {
  light: "300",
  normal: "400",
  semibold: "600",
  bold: "700",
};

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required: boolean;
}) {
  return (
    <span className="flex items-center gap-1 text-[11px] font-medium">
      <span>{children}</span>
      {required && <span className="text-rose-500">*</span>}
    </span>
  );
}

function FieldSlot({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      {children}
      {hint && (
        <span className="text-[10px] text-[color:var(--form-fg)]/60">
          {hint}
        </span>
      )}
    </label>
  );
}

function inputStyleCSS(style: InputStyle): React.CSSProperties {
  switch (style) {
    case "outlined":
      return {
        backgroundColor: "var(--form-accent)",
        border:
          "1px solid color-mix(in srgb, var(--form-fg) 12%, transparent)",
        borderRadius: "var(--form-radius)",
      };
    case "filled":
      return {
        backgroundColor: "var(--form-accent)",
        border: "1px solid transparent",
        borderRadius: "var(--form-radius)",
      };
    case "underlined":
      return {
        backgroundColor: "transparent",
        border: "none",
        borderBottom:
          "1px solid color-mix(in srgb, var(--form-fg) 20%, transparent)",
        borderRadius: "0px",
      };
    case "minimal":
      return {
        backgroundColor: "transparent",
        border:
          "1px solid color-mix(in srgb, var(--form-fg) 6%, transparent)",
        borderRadius: "var(--form-radius)",
      };
  }
}

function TextInputPlaceholder({
  placeholder,
  inputStyle = "outlined",
}: {
  placeholder: string;
  inputStyle?: InputStyle;
}) {
  return (
    <div
      className="flex h-9 items-center px-3 text-[11px]"
      style={{
        ...inputStyleCSS(inputStyle),
        color: "color-mix(in srgb, var(--form-fg) 55%, transparent)",
      }}
    >
      {placeholder}
    </div>
  );
}

function TextareaPlaceholder({
  placeholder,
  inputStyle = "outlined",
}: {
  placeholder: string;
  inputStyle?: InputStyle;
}) {
  return (
    <div
      className="min-h-[76px] px-3 py-2 text-[11px] leading-relaxed"
      style={{
        ...inputStyleCSS(inputStyle),
        color: "color-mix(in srgb, var(--form-fg) 55%, transparent)",
      }}
    >
      {placeholder}
    </div>
  );
}

function RatingPlaceholder({ scale }: { scale: 5 | 10 }) {
  const [hovered, setHovered] = React.useState(-1);
  return (
    <div
      className="flex items-center gap-1"
      onMouseLeave={() => setHovered(-1)}
    >
      {Array.from({ length: scale }).map((_, i) => {
        const filled = hovered >= 0 ? i <= hovered : i < 4;
        return (
          <motion.div
            key={i}
            whileHover={{ scale: 1.2 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <StarIcon
              className="size-4 cursor-pointer"
              onMouseEnter={() => setHovered(i)}
              style={{
                color: filled
                  ? "var(--form-primary)"
                  : "color-mix(in srgb, var(--form-fg) 20%, transparent)",
              }}
              fill={filled ? "var(--form-primary)" : "transparent"}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

function AvatarPlaceholder({ inputStyle = "outlined" }: { inputStyle?: InputStyle }) {
  const borderStyle = (): React.CSSProperties => {
    switch (inputStyle) {
      case "outlined":
        return {
          backgroundColor: "var(--form-accent)",
          border:
            "1px dashed color-mix(in srgb, var(--form-fg) 20%, transparent)",
          borderRadius: "var(--form-radius)",
        };
      case "filled":
        return {
          backgroundColor: "var(--form-accent)",
          border: "1px dashed transparent",
          borderRadius: "var(--form-radius)",
        };
      case "underlined":
        return {
          backgroundColor: "transparent",
          borderBottom:
            "1px dashed color-mix(in srgb, var(--form-fg) 20%, transparent)",
        };
      case "minimal":
        return {
          backgroundColor: "transparent",
          border:
            "1px dashed color-mix(in srgb, var(--form-fg) 10%, transparent)",
          borderRadius: "var(--form-radius)",
        };
    }
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 text-[11px]"
      style={{
        ...borderStyle(),
        color: "color-mix(in srgb, var(--form-fg) 60%, transparent)",
      }}
    >
      <UploadIcon className="size-3.5" />
      Drop image or click to upload
    </div>
  );
}

function VideoUrlPlaceholder({ inputStyle = "outlined" }: { inputStyle?: InputStyle }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 text-[11px]"
      style={{
        ...inputStyleCSS(inputStyle),
        color: "color-mix(in srgb, var(--form-fg) 55%, transparent)",
      }}
    >
      <VideoIcon className="size-3.5" />
      https://… (Loom, YouTube, Vimeo)
    </div>
  );
}

function renderField(key: FieldKey, config: FormConfig): React.ReactNode {
  const required = isFieldRequired(config, key);
  const is = config.branding.inputStyle;
  switch (key) {
    case "name":
      return (
        <FieldSlot key={key} label="Full name" required>
          <TextInputPlaceholder placeholder="Ada Lovelace" inputStyle={is} />
        </FieldSlot>
      );
    case "email":
      return (
        <FieldSlot key={key} label="Email" required={required}>
          <TextInputPlaceholder placeholder="you@company.com" inputStyle={is} />
        </FieldSlot>
      );
    case "content":
      return (
        <FieldSlot key={key} label="Your testimonial" required>
          <TextareaPlaceholder placeholder="What did you love most?" inputStyle={is} />
        </FieldSlot>
      );
    case "rating":
      return (
        <FieldSlot key={key} label="Rating" required={required}>
          <RatingPlaceholder scale={config.fields.rating.scale} />
        </FieldSlot>
      );
    case "jobTitle":
      return (
        <FieldSlot key={key} label="Job title" required={required}>
          <TextInputPlaceholder placeholder="Product designer" inputStyle={is} />
        </FieldSlot>
      );
    case "company":
      return (
        <FieldSlot key={key} label="Company" required={required}>
          <TextInputPlaceholder placeholder="Acme Inc." inputStyle={is} />
        </FieldSlot>
      );
    case "avatar":
      return (
        <FieldSlot key={key} label="Profile photo" required={required}>
          <AvatarPlaceholder inputStyle={is} />
        </FieldSlot>
      );
    case "videoUrl":
      return (
        <FieldSlot key={key} label="Video URL" required={required}>
          <VideoUrlPlaceholder inputStyle={is} />
        </FieldSlot>
      );
    case "consent":
      if (config.fields.consent.mode === "declaration") {
        return (
          <p
            key={key}
            className="text-center text-[8px] leading-relaxed"
            style={{
              color:
                "color-mix(in srgb, var(--form-fg) 50%, transparent)",
            }}
          >
            {config.fields.consent.label}
          </p>
        );
      }
      return (
        <label
          key={key}
          className="flex items-start gap-2 text-[10px] leading-relaxed"
          style={{ color: "color-mix(in srgb, var(--form-fg) 75%, transparent)" }}
        >
          <span
            className="mt-0.5 inline-block size-3 shrink-0"
            style={{
              border:
                "1px solid color-mix(in srgb, var(--form-fg) 30%, transparent)",
              borderRadius: "calc(var(--form-radius) * 0.3)",
            }}
          />
          <span>{config.fields.consent.label}</span>
        </label>
      );
    default:
      return null;
  }
}

const fieldTransition = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
  transition: { opacity: { duration: 0.15 }, height: { duration: 0.2 } },
};

function ThankYouView({
  config,
}: {
  config: FormConfig;
}) {
  return (
    <motion.div
      key="thankyou"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-10 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 15,
          delay: 0.1,
        }}
      >
        <CheckCircle2Icon
          className="size-10"
          style={{ color: "var(--form-primary)" }}
        />
      </motion.div>
      <h2
        className="text-[17px] font-semibold leading-tight"
        style={{ color: "var(--form-fg)" }}
      >
        {config.content.thankYouTitle}
      </h2>
      <p
        className="max-w-[240px] text-[12px] leading-relaxed"
        style={{
          color: "color-mix(in srgb, var(--form-fg) 65%, transparent)",
        }}
      >
        {config.content.thankYouMessage}
      </p>
    </motion.div>
  );
}

function buttonStyleCSS(
  style: ButtonStyle
): React.CSSProperties {
  switch (style) {
    case "solid":
      return {
        backgroundColor: "var(--form-primary)",
        color: "#fff",
        border: "none",
      };
    case "outline":
      return {
        backgroundColor: "transparent",
        color: "var(--form-primary)",
        border: "1.5px solid var(--form-primary)",
      };
    case "soft":
      return {
        backgroundColor:
          "color-mix(in srgb, var(--form-primary) 14%, transparent)",
        color: "var(--form-primary)",
        border: "none",
      };
    case "ghost":
      return {
        backgroundColor: "transparent",
        color: "var(--form-primary)",
        border: "none",
      };
  }
}

export function FormPreview({
  config,
  density: _densityProp = "cozy",
  className,
  showPreviewToggle = false,
}: {
  config: FormConfig;
  density?: "cozy" | "compact";
  className?: string;
  showPreviewToggle?: boolean;
}) {
  const [view, setView] = React.useState<"form" | "thankyou">("form");

  const isDark =
    config.branding.mode === "dark" ||
    (config.branding.mode === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  const bg = isDark ? "#0f172a" : config.branding.colors.background;
  const fg = isDark ? "#f8fafc" : config.branding.colors.foreground;
  const accent = isDark ? "#1e293b" : config.branding.colors.accent;

  const visibleFields = FIELD_ORDER.filter((k) => isFieldEnabled(config, k));

  const dCfg = config.branding.density ?? "default";
  const headerAlign = config.branding.headerAlignment ?? "left";
  const hWeight = config.branding.headingWeight ?? "semibold";
  const shadow = config.branding.shadow ?? "subtle";
  const btnStyle = config.branding.buttonStyle ?? "solid";

  const rootPadding =
    dCfg === "compact"
      ? "px-3 py-3"
      : dCfg === "spacious"
        ? "px-7 py-8"
        : _densityProp === "compact"
          ? "px-4 py-4"
          : "px-5 py-6";

  const fieldGap =
    dCfg === "compact" ? "gap-2" : dCfg === "spacious" ? "gap-5" : "gap-3";

  const style = {
    "--form-primary": config.branding.colors.primary,
    "--form-bg": bg,
    "--form-fg": fg,
    "--form-accent": accent,
    "--form-radius": RADIUS_MAP[config.branding.cornerRadius],
    fontFamily: FONT_MAP[config.branding.fontFamily],
    backgroundColor: bg,
    color: fg,
    boxShadow: SHADOW_MAP[shadow],
  } as React.CSSProperties;

  return (
    <div
      data-slot="form-preview"
      data-density={dCfg}
      className={cn(
        "relative flex min-h-full flex-col",
        rootPadding,
        className
      )}
      style={style}
    >
      <AnimatePresence mode="wait">
        {view === "form" ? (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 flex-col"
          >
            <header
              className={cn(
                "mb-4 flex flex-col gap-3",
                headerAlign === "center"
                  ? "items-center text-center"
                  : "items-start"
              )}
            >
              {config.branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={config.branding.logoUrl}
                  alt="Logo"
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <div
                  className="flex size-8 items-center justify-center text-[10px] font-bold"
                  style={{
                    backgroundColor: "var(--form-primary)",
                    color: "#fff",
                    borderRadius: "calc(var(--form-radius) * 0.6)",
                  }}
                >
                  T
                </div>
              )}
              <div>
                <h2
                  className="text-[15px] leading-tight"
                  style={{
                    color: fg,
                    fontWeight: HEADING_WEIGHT_MAP[hWeight],
                  }}
                >
                  {config.content.headerTitle}
                </h2>
                <p
                  className="mt-1 text-[11px] leading-relaxed"
                  style={{
                    color: "color-mix(in srgb, var(--form-fg) 70%, transparent)",
                  }}
                >
                  {config.content.headerDescription}
                </p>
              </div>
            </header>

            {config.behavior.oauthProviders.length > 0 && (
              <div className="mb-4 flex flex-col gap-2">
                {config.behavior.oauthProviders.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="flex h-8 items-center justify-center gap-2 text-[11px] font-medium"
                    style={{
                      backgroundColor: "var(--form-accent)",
                      color: "var(--form-fg)",
                      border:
                        "1px solid color-mix(in srgb, var(--form-fg) 12%, transparent)",
                      borderRadius: "var(--form-radius)",
                    }}
                  >
                    {p === "google"
                      ? "Continue with Google"
                      : "Continue with GitHub"}
                  </button>
                ))}
                <div className="flex items-center gap-2 py-1">
                  <div
                    className="h-px flex-1"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--form-fg) 10%, transparent)",
                    }}
                  />
                  <span
                    className="text-[9px] uppercase tracking-widest"
                    style={{
                      color:
                        "color-mix(in srgb, var(--form-fg) 50%, transparent)",
                    }}
                  >
                    or
                  </span>
                  <div
                    className="h-px flex-1"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--form-fg) 10%, transparent)",
                    }}
                  />
                </div>
              </div>
            )}

            <div className={cn("flex flex-col", fieldGap)}>
              <AnimatePresence initial={false}>
                {visibleFields.map((k) => (
                  <motion.div
                    key={k}
                    layout="position"
                    {...fieldTransition}
                    className="overflow-hidden"
                  >
                    {renderField(k, config)}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <motion.button
              type="button"
              className="mt-5 flex h-9 items-center justify-center text-[12px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{
                ...buttonStyleCSS(btnStyle),
                borderRadius: "var(--form-radius)",
                "--tw-ring-color": "var(--form-primary)",
              } as React.CSSProperties}
              whileHover={{ filter: "brightness(1.08)" }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              onClick={() =>
                config.content.successAction.kind === "message"
                  ? setView("thankyou")
                  : undefined
              }
              layout
            >
              {config.content.submitButtonLabel}
            </motion.button>

            <p
              className="mt-3 text-center text-[9px]"
              style={{
                color: "color-mix(in srgb, var(--form-fg) 45%, transparent)",
              }}
            >
              {config.content.successAction.kind === "redirect"
                ? `You'll be redirected after submit.`
                : config.content.thankYouMessage}
            </p>
          </motion.div>
        ) : (
          <ThankYouView key="thankyou" config={config} />
        )}
      </AnimatePresence>

      {showPreviewToggle && (
        <div className="mt-auto flex justify-center pt-4">
          <button
            type="button"
            onClick={() =>
              setView((v) => (v === "form" ? "thankyou" : "form"))
            }
            className="rounded-full border px-3 py-1 text-[9px] font-medium backdrop-blur transition-colors hover:bg-black/5"
            style={{
              borderColor:
                "color-mix(in srgb, var(--form-fg) 15%, transparent)",
              color: "color-mix(in srgb, var(--form-fg) 60%, transparent)",
            }}
          >
            Preview: {view === "form" ? "Form" : "Thank you"} ↔{" "}
            {view === "form" ? "Thank you" : "Form"}
          </button>
        </div>
      )}

      {config.watermark.show && (
        <Watermark position={config.watermark.position} />
      )}
    </div>
  );
}
