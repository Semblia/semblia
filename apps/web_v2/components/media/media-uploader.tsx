"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  UploadSimpleIcon,
  TrashIcon,
  ArrowClockwiseIcon,
} from "@phosphor-icons/react";
import type {
  V2CreateUploadIntentBody,
  V2MediaAssetDTO,
  V2MediaAssetPurpose,
  V2UploadIntentDTO,
} from "@workspace/types";
import { Button } from "@/components/ui/button";
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
  "PROJECT_LOGO" | "FORM_BRANDING_LOGO"
>;

type AccountScopedPurpose = Extract<
  V2MediaAssetPurpose,
  "ACCOUNT_DEFAULTS_LOGO"
>;

type PublicScopedPurpose = Extract<
  V2MediaAssetPurpose,
  "TESTIMONIAL_AUTHOR_AVATAR" | "TESTIMONIAL_VIDEO" | "TESTIMONIAL_MEDIA"
>;

type MediaUploaderProps =
  | {
      purpose: ProjectScopedPurpose;
      projectSlug: string;
      formId?: string;
      value: V2MediaAssetDTO | null;
      onChange: (asset: V2MediaAssetDTO | null) => void;
      disabled?: boolean;
      accept?: string;
      className?: string;
      previewClassName?: string;
      label?: string;
      placeholder?: React.ReactNode;
    }
  | {
      purpose: AccountScopedPurpose;
      value: V2MediaAssetDTO | null;
      onChange: (asset: V2MediaAssetDTO | null) => void;
      disabled?: boolean;
      accept?: string;
      className?: string;
      previewClassName?: string;
      label?: string;
      placeholder?: React.ReactNode;
    }
  | {
      purpose: PublicScopedPurpose;
      publicSlug: string;
      value: V2MediaAssetDTO | null;
      onChange: (asset: V2MediaAssetDTO | null) => void;
      disabled?: boolean;
      accept?: string;
      className?: string;
      previewClassName?: string;
      label?: string;
      placeholder?: React.ReactNode;
    };

function isPublicScoped(
  p: MediaUploaderProps,
): p is Extract<MediaUploaderProps, { purpose: PublicScopedPurpose }> {
  return (
    p.purpose === "TESTIMONIAL_AUTHOR_AVATAR" ||
    p.purpose === "TESTIMONIAL_VIDEO" ||
    p.purpose === "TESTIMONIAL_MEDIA"
  );
}

export function MediaUploader(props: MediaUploaderProps) {
  const {
    value,
    onChange,
    disabled,
    accept = DEFAULT_IMAGE_ACCEPT,
    className,
    previewClassName,
    label,
    placeholder,
  } = props;

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const createIntent = useCreateUploadIntent();
  const createPublicIntent = useCreatePublicUploadIntent(
    isPublicScoped(props) ? props.publicSlug : "",
  );
  const confirmUploadMutation = useConfirmUpload();
  const deleteAsset = useDeleteMediaAsset();

  async function handleSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (inputRef.current) inputRef.current.value = "";
    setUploading(true);
    setProgress(0);
    try {
      const body = buildIntentBody(props, file);
      const intent: V2UploadIntentDTO = isPublicScoped(props)
        ? await createPublicIntent.mutateAsync(body)
        : await createIntent.mutateAsync(body);

      await uploadWithProgress(intent, file, setProgress);

      if (isPublicScoped(props)) {
        // Public flow has no confirm step — the asset is linked at submit time.
        // Synthesize a minimal DTO so the preview renders immediately.
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
        const asset = await confirmUploadMutation.mutateAsync({
          assetId: intent.assetId,
          body: { byteSize: file.size },
        });
        onChange(asset);
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function handleRemove() {
    if (!value) return;
    try {
      if (!isPublicScoped(props)) {
        await deleteAsset.mutateAsync(value.id);
      }
      onChange(null);
    } catch {
      toast.error("Failed to remove asset");
    }
  }

  const previewUrl = value?.url ?? null;
  const isImage = (value?.contentType ?? accept).startsWith("image");

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30",
          previewClassName,
        )}
        aria-hidden
      >
        {previewUrl && isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="size-full object-cover" />
        ) : previewUrl ? (
          <span className="text-[10px] text-muted-foreground">Uploaded</span>
        ) : (
          (placeholder ?? (
            <UploadSimpleIcon className="size-5 text-muted-foreground" />
          ))
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {label && (
          <span className="text-[11px] font-medium text-muted-foreground">
            {label}
          </span>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleSelect}
            disabled={disabled || uploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <>
                <ArrowClockwiseIcon className="mr-1.5 size-3.5 animate-spin" />
                {progress > 0 ? `${progress}%` : "Uploading"}
              </>
            ) : value ? (
              "Replace"
            ) : (
              "Upload"
            )}
          </Button>
          {value && !uploading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={handleRemove}
            >
              <TrashIcon className="mr-1 size-3.5" /> Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function buildIntentBody(
  props: MediaUploaderProps,
  file: File,
): V2CreateUploadIntentBody {
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
    default:
      return { purpose: props.purpose, ...common };
  }
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
