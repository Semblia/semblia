"use client";

import * as React from "react";
import { toast } from "sonner";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  UploadSimpleIcon,
  TrashIcon,
  ArrowClockwiseIcon,
  CheckIcon,
  WarningIcon,
  ImageSquareIcon,
  PlayCircleIcon,
  ArrowUpIcon,
} from "@phosphor-icons/react";
import type {
  V2CreateUploadIntentBody,
  V2MediaAssetDTO,
  V2MediaAssetPurpose,
  V2PublicCreateUploadIntentBody,
  V2UploadIntentDTO,
} from "@workspace/types";
import { cn } from "@/lib/utils";
import {
  useConfirmUpload,
  useCreatePublicUploadIntent,
  useCreateUploadIntent,
  useDeleteMediaAsset,
} from "@/hooks/api/use-media-api";

const DEFAULT_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

type ProjectScopedPurpose = Extract<
  V2MediaAssetPurpose,
  "PROJECT_LOGO" | "FORM_BRANDING_LOGO" | "SUBMISSION_ATTACHMENT"
>;

type AccountScopedPurpose = Extract<
  V2MediaAssetPurpose,
  "ACCOUNT_DEFAULTS_LOGO"
>;

type PublicScopedPurpose = Extract<
  V2MediaAssetPurpose,
  "SUBMISSION_ATTACHMENT"
>;

type CommonProps = {
  value: V2MediaAssetDTO | null;
  onChange: (asset: V2MediaAssetDTO | null) => void;
  disabled?: boolean;
  accept?: string;
  className?: string;
  /** Override the dropzone height. Defaults to "md". */
  size?: "sm" | "md" | "lg";
  /**
   * How the preview image fits inside the dropzone.
   * - "contain" (default): preserves the asset's aspect ratio. Best for
   *   logos and transparent images.
   * - "cover": fills the zone, cropping if needed. Best for photos/avatars.
   */
  fit?: "contain" | "cover";
  /** Optional inline label rendered above the zone. */
  label?: string;
  /** Optional helper line rendered below the zone. */
  helper?: string;
};

type MediaUploaderProps =
  | ({
      purpose: ProjectScopedPurpose;
      projectSlug: string;
      formId?: string;
    } & CommonProps)
  | ({ purpose: AccountScopedPurpose } & CommonProps)
  | ({ purpose: PublicScopedPurpose; publicSlug: string } & CommonProps);

type UploadPhase =
  | "idle"
  | "reading"
  | "uploading"
  | "confirming"
  | "success"
  | "error";

function isPublicScoped(
  p: MediaUploaderProps,
): p is Extract<MediaUploaderProps, { purpose: PublicScopedPurpose }> {
  return "publicSlug" in p;
}

// Dropzone shape — card, not banner. Each size pairs a `max-w-` cap with an
// `aspect-` so the zone is logo-shaped at any container width instead of
// stretching into a wide strip that dwarfs the asset.
const SIZE_CLASS: Record<NonNullable<CommonProps["size"]>, string> = {
  sm: "max-w-[14rem] aspect-[4/3]",
  md: "max-w-[22rem] aspect-[4/3]",
  lg: "max-w-[28rem] aspect-video",
};

function formatBytes(bytes: number | null | undefined) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extFromMime(mime: string): string {
  const after = mime.split("/")[1] ?? "";
  return after.toUpperCase();
}

export function MediaUploader(props: MediaUploaderProps) {
  const {
    value,
    onChange,
    disabled,
    accept = DEFAULT_IMAGE_ACCEPT,
    className,
    size = "md",
    fit = "contain",
    label,
    helper,
  } = props;

  const reduceMotion = useReducedMotion();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dragCounter = React.useRef(0);

  const [phase, setPhase] = React.useState<UploadPhase>("idle");
  const [progress, setProgress] = React.useState(0);
  const [dragOver, setDragOver] = React.useState(false);
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const createIntent = useCreateUploadIntent();
  const createPublicIntent = useCreatePublicUploadIntent(
    isPublicScoped(props) ? props.publicSlug : "",
  );
  const confirmUploadMutation = useConfirmUpload();
  const deleteAsset = useDeleteMediaAsset();

  // ── Cleanup local object URLs when they are replaced or unmounted ───────────
  React.useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const acceptsVideo = accept.toLowerCase().includes("video/");

  const displayImage = React.useMemo(() => {
    if (localPreview) return localPreview;
    if (value?.url) return value.url;
    return null;
  }, [localPreview, value?.url]);

  const placeholderIcon = acceptsVideo ? PlayCircleIcon : ImageSquareIcon;

  async function processFile(file: File) {
    if (disabled) return;
    if (acceptsVideo && !file.type.startsWith("video/")) {
      setErrorMsg("Please select a video file.");
      setPhase("error");
      toast.error("Please select a video file.");
      return;
    }
    if (!acceptsVideo && !file.type.startsWith("image/")) {
      setErrorMsg("Please select an image file.");
      setPhase("error");
      toast.error("Please select an image file.");
      return;
    }

    setErrorMsg(null);
    setProgress(0);
    setPendingFile(file);

    // Generate an immediate local preview.
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setLocalPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    }

    setPhase("reading");

    try {
      const intent: V2UploadIntentDTO = isPublicScoped(props)
        ? await createPublicIntent.mutateAsync(buildIntentBody(props, file))
        : await createIntent.mutateAsync(buildIntentBody(props, file));

      setPhase("uploading");
      await uploadWithProgress(intent, file, setProgress);

      if (isPublicScoped(props)) {
        // Public flow has no confirm step — the asset is linked at submit time.
        setPhase("success");
        onChange({
          id: intent.assetId,
          url: null,
          contentType: file.type,
          byteSize: file.size,
          purpose: props.purpose,
          visibility: "PUBLIC",
          status: "PENDING",
          createdAt: new Date().toISOString(),
        });
      } else {
        setPhase("confirming");
        const asset = await confirmUploadMutation.mutateAsync({
          assetId: intent.assetId,
          body: { byteSize: file.size },
        });
        setPhase("success");
        onChange(asset);
      }

      // Settle back to idle so the resting hover overlay can take over.
      window.setTimeout(() => {
        setPhase("idle");
        setPendingFile(null);
      }, 900);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Upload failed";
      setErrorMsg(message);
      setPhase("error");
      toast.error(message);
    }
  }

  function handleFileInput(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    void processFile(file);
  }

  async function handleRemove(event?: React.MouseEvent) {
    event?.stopPropagation();
    if (!value) return;
    try {
      if (!isPublicScoped(props)) {
        await deleteAsset.mutateAsync(value.id);
      }
      onChange(null);
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
        setLocalPreview(null);
      }
    } catch {
      toast.error("Failed to remove asset");
    }
  }

  // ── Drag and drop handlers ─────────────────────────────────────────────────
  function handleDragEnter(event: React.DragEvent) {
    if (disabled || isBusy) return;
    event.preventDefault();
    dragCounter.current += 1;
    if (event.dataTransfer.items?.length) setDragOver(true);
  }
  function handleDragOver(event: React.DragEvent) {
    if (disabled || isBusy) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }
  function handleDragLeave(event: React.DragEvent) {
    if (disabled || isBusy) return;
    event.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragOver(false);
    }
  }
  function handleDrop(event: React.DragEvent) {
    if (disabled || isBusy) return;
    event.preventDefault();
    dragCounter.current = 0;
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
  }

  function handleZoneClick() {
    if (disabled || isBusy) return;
    inputRef.current?.click();
  }
  function handleZoneKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleZoneClick();
    }
  }

  const isBusy =
    phase === "reading" || phase === "uploading" || phase === "confirming";
  const hasAsset = Boolean(value);
  const hasImage = Boolean(displayImage);
  const isImageContent = (
    pendingFile?.type ??
    value?.contentType ??
    accept
  ).startsWith("image");

  const sizeMeta = pendingFile
    ? formatBytes(pendingFile.size)
    : formatBytes(value?.byteSize ?? null);
  const typeMeta = pendingFile
    ? extFromMime(pendingFile.type)
    : value?.contentType
      ? extFromMime(value.contentType)
      : "";
  const filenameMeta = pendingFile?.name ?? null;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <span className="text-[11px] font-medium text-muted-foreground">
          {label}
        </span>
      )}

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={
          hasAsset
            ? "Replace uploaded media"
            : acceptsVideo
              ? "Upload a video"
              : "Upload an image"
        }
        aria-busy={isBusy}
        aria-disabled={disabled}
        onClick={handleZoneClick}
        onKeyDown={handleZoneKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-phase={phase}
        data-dragover={dragOver || undefined}
        className={cn(
          "group/uploader relative w-full overflow-hidden rounded-xl border border-dashed border-border bg-muted/20 outline-none transition-[background,border-color,box-shadow,transform] duration-200 ease-out",
          SIZE_CLASS[size],
          !disabled &&
            !hasImage &&
            "hover:border-foreground/30 hover:bg-muted/40",
          hasImage && "border-solid border-border bg-card",
          dragOver &&
            "border-solid border-[color:var(--brand)] bg-[color:var(--brand-muted)]/40 shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand)_18%,transparent)]",
          phase === "success" &&
            "border-solid border-[color:var(--brand)]/60 shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand)_22%,transparent)]",
          phase === "error" &&
            "border-solid border-destructive/60 shadow-[0_0_0_3px_color-mix(in_oklab,var(--destructive)_18%,transparent)]",
          disabled && "cursor-not-allowed opacity-60",
          !disabled &&
            "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring/40",
        )}
      >
        {/* ── Background: image / video preview ───────────────────────────── */}
        <AnimatePresence>
          {hasImage && (
            <motion.div
              key={displayImage}
              initial={
                reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 1.02 }
              }
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.01 }}
              transition={{
                duration: reduceMotion ? 0 : 0.25,
                ease: "easeOut",
              }}
              className="absolute inset-0"
            >
              {/* Letterbox backdrop — subtle so transparent logos read cleanly */}
              {fit === "contain" && (
                <div
                  className="absolute inset-0 bg-muted/30"
                  aria-hidden
                  style={{
                    backgroundImage:
                      "linear-gradient(45deg, color-mix(in oklab, var(--muted-foreground) 8%, transparent) 25%, transparent 25%), linear-gradient(-45deg, color-mix(in oklab, var(--muted-foreground) 8%, transparent) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, color-mix(in oklab, var(--muted-foreground) 8%, transparent) 75%), linear-gradient(-45deg, transparent 75%, color-mix(in oklab, var(--muted-foreground) 8%, transparent) 75%)",
                    backgroundSize: "14px 14px",
                    backgroundPosition: "0 0, 0 7px, 7px -7px, -7px 0px",
                  }}
                />
              )}
              {isImageContent ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayImage ?? undefined}
                  alt=""
                  className={cn(
                    "relative size-full transition-[filter,opacity] duration-300",
                    fit === "contain" ? "object-contain p-4" : "object-cover",
                    isBusy && "opacity-80 saturate-75",
                  )}
                />
              ) : (
                <video
                  src={displayImage ?? undefined}
                  className={cn(
                    "relative size-full",
                    fit === "contain" ? "object-contain" : "object-cover",
                    isBusy && "opacity-80 saturate-75",
                  )}
                  muted
                  playsInline
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {!hasImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
            <motion.span
              animate={
                reduceMotion
                  ? undefined
                  : dragOver
                    ? { y: -4, scale: 1.08 }
                    : { y: 0, scale: 1 }
              }
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className={cn(
                "flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground/70 shadow-sm",
                dragOver &&
                  "border-[color:var(--brand)]/60 bg-[color:var(--brand-muted)]/60 text-[color:var(--brand)]",
              )}
              aria-hidden
            >
              {React.createElement(placeholderIcon, {
                className: "size-5",
                weight: "duotone",
              })}
            </motion.span>
            <div className="space-y-0.5">
              <p className="text-[13px] font-medium text-foreground">
                {dragOver
                  ? "Drop to upload"
                  : acceptsVideo
                    ? "Drop a video or click to browse"
                    : "Drop an image or click to browse"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {acceptsVideo ? "MP4, WebM, MOV" : "PNG, JPG, WebP, or GIF"}
              </p>
            </div>
          </div>
        )}

        {/* ── Busy overlay (reading / uploading / confirming) ────────────── */}
        <AnimatePresence>
          {isBusy && (
            <motion.div
              key="busy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex flex-col justify-between p-3"
            >
              {/* Top-right percentage chip */}
              <div className="flex items-start justify-between gap-2">
                <ProgressChip
                  phase={phase}
                  progress={progress}
                  reduceMotion={!!reduceMotion}
                  filename={filenameMeta}
                  size={sizeMeta}
                  type={typeMeta}
                />
              </div>

              {/* Bottom progress bar */}
              <ProgressBar
                phase={phase}
                progress={progress}
                reduceMotion={!!reduceMotion}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Success badge ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {phase === "success" && (
            <motion.div
              key="success-badge"
              initial={
                reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }
              }
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 360, damping: 22 }}
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-[color:var(--brand)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--brand-foreground)] shadow-sm"
              aria-hidden
            >
              <CheckIcon className="size-3.5" weight="bold" />
              Uploaded
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Resting overlay (image present, idle) ─────────────────────── */}
        {hasImage && !isBusy && phase !== "success" && (
          <>
            {/* Meta pill — always visible, top-right, frosted */}
            <div className="pointer-events-none absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-md border border-border/60 bg-card/90 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur-md">
              {typeMeta && (
                <span className="uppercase tracking-wide text-foreground/80">
                  {typeMeta}
                </span>
              )}
              {typeMeta && sizeMeta && (
                <span className="text-muted-foreground/60">·</span>
              )}
              {sizeMeta && <span>{sizeMeta}</span>}
            </div>

            {/* Filename + actions — appear on hover/focus, bottom-floating */}
            <div
              className={cn(
                "pointer-events-none absolute inset-x-2.5 bottom-2.5 flex items-end justify-between gap-2 opacity-0 transition-opacity duration-150",
                "group-hover/uploader:opacity-100 group-focus-within/uploader:opacity-100",
              )}
            >
              {filenameMeta && (
                <span className="min-w-0 max-w-[55%] truncate rounded-md border border-border/60 bg-card/90 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur-md">
                  {filenameMeta}
                </span>
              )}
              <div className="pointer-events-auto ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleZoneClick();
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/90 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-card"
                  disabled={disabled}
                >
                  <ArrowClockwiseIcon className="size-3" weight="bold" />
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-card/90 px-2 py-1 text-[11px] font-medium text-destructive shadow-sm backdrop-blur-md transition-colors hover:bg-card"
                  disabled={disabled}
                  aria-label="Remove uploaded media"
                >
                  <TrashIcon className="size-3" weight="bold" />
                  Remove
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Error overlay ─────────────────────────────────────────────── */}
        {phase === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/85 px-4 text-center backdrop-blur-sm">
            <WarningIcon
              className="size-6 text-destructive"
              weight="duotone"
              aria-hidden
            />
            <div className="space-y-0.5">
              <p className="text-[13px] font-medium text-foreground">
                Upload failed
              </p>
              {errorMsg && (
                <p className="text-[11px] text-muted-foreground">{errorMsg}</p>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (pendingFile) void processFile(pendingFile);
                  else handleZoneClick();
                }}
                className="rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm hover:bg-muted/40"
              >
                <ArrowUpIcon className="mr-1 inline size-3" weight="bold" />
                Try again
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setPhase("idle");
                  setPendingFile(null);
                  setErrorMsg(null);
                  if (localPreview && !value?.url) {
                    URL.revokeObjectURL(localPreview);
                    setLocalPreview(null);
                  }
                }}
                className="rounded-md px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ── Empty-state secondary CTA (when idle, no image) ───────────── */}
        {!hasImage && phase === "idle" && !disabled && (
          <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-md border border-border bg-card/90 px-2 py-1 text-[10.5px] font-medium text-muted-foreground shadow-sm transition-opacity duration-200 group-hover/uploader:opacity-100 opacity-70">
            <UploadSimpleIcon className="size-3" weight="bold" />
            Browse
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={handleFileInput}
          disabled={disabled || isBusy}
          tabIndex={-1}
          aria-hidden
        />
      </div>

      {helper && <p className="text-[11px] text-muted-foreground">{helper}</p>}
    </div>
  );
}

// ─── Progress bar at the bottom of the zone ─────────────────────────────────
function ProgressBar({
  phase,
  progress,
  reduceMotion,
}: {
  phase: UploadPhase;
  progress: number;
  reduceMotion: boolean;
}) {
  const isIndeterminate = phase === "reading" || phase === "confirming";
  const width = phase === "confirming" ? 100 : progress;

  return (
    <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/30 backdrop-blur-sm">
      {isIndeterminate ? (
        <motion.div
          className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-[color:var(--brand)]"
          animate={reduceMotion ? undefined : { x: ["-100%", "320%"] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          aria-hidden
        />
      ) : (
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-[color:var(--brand)]"
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{
            type: reduceMotion ? "tween" : "spring",
            stiffness: 220,
            damping: 28,
            duration: reduceMotion ? 0.15 : undefined,
          }}
          aria-hidden
        />
      )}
    </div>
  );
}

// ─── Chip showing filename + percentage in top-left ─────────────────────────
function ProgressChip({
  phase,
  progress,
  reduceMotion,
  filename,
  size,
  type,
}: {
  phase: UploadPhase;
  progress: number;
  reduceMotion: boolean;
  filename: string | null;
  size: string;
  type: string;
}) {
  const label =
    phase === "reading"
      ? "Preparing"
      : phase === "confirming"
        ? "Finalizing"
        : `${progress}%`;

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex max-w-full items-center gap-2 rounded-lg border border-white/20 bg-black/55 px-2 py-1.5 text-white shadow-sm backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <span className="flex size-5 shrink-0 items-center justify-center">
        <ArrowClockwiseIcon
          className={cn(
            "size-3.5 text-white",
            phase !== "success" && "animate-spin",
          )}
          weight="bold"
          aria-hidden
        />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[11.5px] font-medium">
          {filename ?? "Uploading"}
        </p>
        <p className="truncate text-[10px] text-white/75">
          {[type, size].filter(Boolean).join(" · ")}
        </p>
      </div>
      <span
        className={cn(
          "ml-1 shrink-0 rounded-md bg-white/15 px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums text-white",
        )}
      >
        {label}
      </span>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Body construction + raw XHR upload (preserved from the prior implementation)
// ────────────────────────────────────────────────────────────────────────────

function buildIntentBody(
  props: Extract<MediaUploaderProps, { purpose: PublicScopedPurpose }>,
  file: File,
): V2PublicCreateUploadIntentBody;
function buildIntentBody(
  props: Exclude<MediaUploaderProps, { purpose: PublicScopedPurpose }>,
  file: File,
): V2CreateUploadIntentBody;
function buildIntentBody(
  props: MediaUploaderProps,
  file: File,
): V2CreateUploadIntentBody | V2PublicCreateUploadIntentBody {
  const common = {
    contentType: file.type || "application/octet-stream",
    byteSize: file.size,
  } as const;

  switch (props.purpose) {
    case "PROJECT_LOGO":
      return {
        purpose: "PROJECT_LOGO",
        projectSlug: props.projectSlug,
        ...common,
      };
    case "FORM_BRANDING_LOGO":
      if (!props.formId) {
        throw new Error("FORM_BRANDING_LOGO requires formId");
      }
      return {
        purpose: "FORM_BRANDING_LOGO",
        projectSlug: props.projectSlug,
        formId: props.formId,
        ...common,
      };
    case "ACCOUNT_DEFAULTS_LOGO":
      return { purpose: "ACCOUNT_DEFAULTS_LOGO", ...common };
    case "SUBMISSION_ATTACHMENT":
      if (isPublicScoped(props)) {
        return { purpose: "SUBMISSION_ATTACHMENT", ...common };
      }
      return {
        purpose: "SUBMISSION_ATTACHMENT",
        projectSlug: props.projectSlug,
        ...(props.formId ? { formId: props.formId } : {}),
        ...common,
      };
    default:
      return assertNever(props);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported media uploader props: ${String(value)}`);
}

function uploadWithProgress(
  intent: V2UploadIntentDTO,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", intent.uploadUrl);
    for (const [key, value] of Object.entries(intent.requiredHeaders ?? {})) {
      xhr.setRequestHeader(key, value);
    }
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    });
    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.send(file);
  });
}
