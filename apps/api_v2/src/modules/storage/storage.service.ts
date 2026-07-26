import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  MediaAssetPurpose,
  MediaAssetVisibility,
} from "@workspace/database/prisma";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/webm",
  "audio/mp4",
];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const CSV_TYPES = ["text/csv", "text/csv; charset=utf-8"];
const SPREADSHEET_TYPES = [
  ...CSV_TYPES,
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const CONTENT_TYPE_EXTENSIONS: Readonly<Record<string, string>> = {
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "text/csv": "csv",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

@Injectable()
export class StorageService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  keyFor(input: {
    assetId: string;
    purpose: MediaAssetPurpose;
    visibility: MediaAssetVisibility;
    contentType: string;
    projectId?: string | null;
    userId?: string | null;
    formId?: string | null;
  }) {
    const root =
      input.visibility === MediaAssetVisibility.PUBLIC ? "public" : "private";
    const ext = this.extensionFor(input.contentType);

    switch (input.purpose) {
      case MediaAssetPurpose.PROJECT_LOGO:
        return `${root}/projects/${this.required(input.projectId, "projectId")}/logos/${input.assetId}.${ext}`;
      case MediaAssetPurpose.ACCOUNT_DEFAULTS_LOGO:
        return `${root}/users/${this.required(input.userId, "userId")}/account-defaults/logo/${input.assetId}.${ext}`;
      case MediaAssetPurpose.FORM_BRANDING_LOGO:
        return `${root}/forms/${this.required(input.formId, "formId")}/branding/logo/${input.assetId}.${ext}`;
      case MediaAssetPurpose.SUBMISSION_ATTACHMENT:
        return `${root}/projects/${this.required(input.projectId, "projectId")}/submissions/attachments/${input.assetId}.${ext}`;
      case MediaAssetPurpose.EXPORT_ARTIFACT:
        return `${root}/projects/${this.required(input.projectId, "projectId")}/exports/${input.assetId}.${ext}`;
      case MediaAssetPurpose.IMPORT_SOURCE:
        return `private/projects/${this.required(input.projectId, "projectId")}/imports/${input.assetId}.${ext}`;
    }
  }

  allowedContentTypes(purpose: MediaAssetPurpose) {
    switch (purpose) {
      case MediaAssetPurpose.SUBMISSION_ATTACHMENT:
        return [...IMAGE_TYPES, ...AUDIO_TYPES, ...VIDEO_TYPES];
      case MediaAssetPurpose.EXPORT_ARTIFACT:
        return CSV_TYPES;
      case MediaAssetPurpose.IMPORT_SOURCE:
        return SPREADSHEET_TYPES;
      default:
        return IMAGE_TYPES;
    }
  }

  maxBytesFor(purpose: MediaAssetPurpose) {
    switch (purpose) {
      case MediaAssetPurpose.SUBMISSION_ATTACHMENT:
        return this.numberEnv("S3_MAX_VIDEO_BYTES", 100 * 1024 * 1024);
      case MediaAssetPurpose.EXPORT_ARTIFACT:
        return this.numberEnv("S3_MAX_EXPORT_BYTES", 25 * 1024 * 1024);
      case MediaAssetPurpose.IMPORT_SOURCE:
        return 10 * 1024 * 1024;
      default:
        return this.numberEnv("S3_MAX_IMAGE_BYTES", 5 * 1024 * 1024);
    }
  }

  visibilityFor(purpose: MediaAssetPurpose) {
    return purpose === MediaAssetPurpose.EXPORT_ARTIFACT ||
      purpose === MediaAssetPurpose.SUBMISSION_ATTACHMENT ||
      purpose === MediaAssetPurpose.IMPORT_SOURCE
      ? MediaAssetVisibility.PRIVATE
      : MediaAssetVisibility.PUBLIC;
  }

  publicUrlFor(storageKey: string) {
    const base = this.configService.get<string>("S3_PUBLIC_CDN_BASE_URL");
    if (!base) return null;
    return `${base.replace(/\/+$/, "")}/${storageKey}`;
  }

  private extensionFor(contentType: string) {
    const mediaType = contentType.split(";", 1)[0]?.trim().toLowerCase();
    return (mediaType && CONTENT_TYPE_EXTENSIONS[mediaType]) || "bin";
  }

  private numberEnv(name: string, fallback: number) {
    const value = this.configService.get<string | number>(name);
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private required(value: string | null | undefined, name: string) {
    if (!value) throw new Error(`${name} is required for storage key`);
    return value;
  }
}
