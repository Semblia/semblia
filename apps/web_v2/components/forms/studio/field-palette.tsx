"use client";

/**
 * FieldPalette — the "Add a question" popover for the Form Studio.
 *
 * Guided blocks, not a schema browser: authors pick outcomes ("Video upload",
 * "Website / social link") and each block seeds a forms-core field with the
 * right role, privacy, and publish defaults so the consent + widget pipeline
 * keeps working without any manual wiring. Semblia owns the mechanics —
 * storage keys, raw types, and privacy plumbing never surface here.
 * Structure-only — no free-form HTML, ever (2026-06-10 parametric decision).
 */

import * as React from "react";
import {
  PlusIcon,
  TextTIcon,
  TextAlignLeftIcon,
  StarIcon,
  UserIcon,
  EnvelopeSimpleIcon,
  BuildingsIcon,
  IdentificationBadgeIcon,
  GlobeSimpleIcon,
  RadioButtonIcon,
  ChecksIcon,
  ImageIcon,
  VideoCameraIcon,
  PaperclipIcon,
  ShieldCheckIcon,
  EyeSlashIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import {
  formFieldSchema,
  type FieldType,
  type FormDefinitionDoc,
  type FormField,
} from "@workspace/forms-core";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * A palette block is what the author picks; most map 1:1 onto a field type,
 * but "videoUpload" is a friendly face over a `fileUpload` seeded with video
 * mime types (the storage pipeline already accepts mp4/webm/quicktime).
 */
export type PaletteBlock = FieldType | "videoUpload";

const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const FIELD_TYPE_ICON: Record<FieldType, PhosphorIcon> = {
  shortText: TextTIcon,
  longText: TextAlignLeftIcon,
  rating: StarIcon,
  name: UserIcon,
  email: EnvelopeSimpleIcon,
  company: BuildingsIcon,
  role: IdentificationBadgeIcon,
  website: GlobeSimpleIcon,
  singleSelect: RadioButtonIcon,
  multiSelect: ChecksIcon,
  imageUpload: ImageIcon,
  fileUpload: PaperclipIcon,
  consent: ShieldCheckIcon,
  hidden: EyeSlashIcon,
};

const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  shortText: "Short text",
  longText: "Long answer",
  rating: "Rating",
  name: "Name",
  email: "Email",
  company: "Company",
  role: "Role",
  website: "Website / social link",
  singleSelect: "Pick one",
  multiSelect: "Pick several",
  imageUpload: "Image upload",
  fileUpload: "File upload",
  consent: "Consent checkbox",
  hidden: "Hidden field",
};

/** Is this fileUpload field really our "Video upload" block? */
function isVideoField(field: FormField): boolean {
  return (
    field.type === "fileUpload" &&
    (field.fileTypes ?? []).length > 0 &&
    (field.fileTypes ?? []).every((t) => t.startsWith("video/"))
  );
}

/**
 * Presentation for a field in the editor list — resolves the friendly face
 * (video uploads read as "Video upload", not "File upload").
 */
export function fieldDisplayMeta(field: FormField): {
  icon: PhosphorIcon;
  label: string;
} {
  if (isVideoField(field)) {
    return { icon: VideoCameraIcon, label: "Video upload" };
  }
  return {
    icon: FIELD_TYPE_ICON[field.type] ?? TextTIcon,
    label: FIELD_TYPE_LABEL[field.type] ?? "Question",
  };
}

interface CatalogEntry {
  block: PaletteBlock;
  label: string;
  blurb: string;
  icon: PhosphorIcon;
}

const CATALOG: ReadonlyArray<{
  group: string;
  entries: ReadonlyArray<CatalogEntry>;
}> = [
  {
    group: "Answers",
    entries: [
      {
        block: "longText",
        label: "Long answer",
        blurb: "Their story, in their words",
        icon: TextAlignLeftIcon,
      },
      {
        block: "shortText",
        label: "Short text",
        blurb: "A one-line answer",
        icon: TextTIcon,
      },
      {
        block: "rating",
        label: "Rating",
        blurb: "Stars, numbers, or emoji",
        icon: StarIcon,
      },
    ],
  },
  {
    group: "About the author",
    entries: [
      {
        block: "name",
        label: "Name",
        blurb: "Who's answering",
        icon: UserIcon,
      },
      {
        block: "email",
        label: "Email",
        blurb: "Always kept private",
        icon: EnvelopeSimpleIcon,
      },
      {
        block: "company",
        label: "Company",
        blurb: "Where they work",
        icon: BuildingsIcon,
      },
      {
        block: "role",
        label: "Role",
        blurb: "Their job title",
        icon: IdentificationBadgeIcon,
      },
      {
        block: "website",
        label: "Website / social link",
        blurb: "A link they provide",
        icon: GlobeSimpleIcon,
      },
    ],
  },
  {
    group: "Choices",
    entries: [
      {
        block: "singleSelect",
        label: "Pick one",
        blurb: "Choose a single option",
        icon: RadioButtonIcon,
      },
      {
        block: "multiSelect",
        label: "Pick several",
        blurb: "Choose all that apply",
        icon: ChecksIcon,
      },
    ],
  },
  {
    group: "Media",
    entries: [
      {
        block: "imageUpload",
        label: "Image upload",
        blurb: "Photo or headshot",
        icon: ImageIcon,
      },
      {
        block: "videoUpload",
        label: "Video upload",
        blurb: "A short video testimonial",
        icon: VideoCameraIcon,
      },
    ],
  },
  {
    group: "Permission",
    entries: [
      {
        block: "consent",
        label: "Consent checkbox",
        blurb: "Permission to publish",
        icon: ShieldCheckIcon,
      },
    ],
  },
];

/** Readable, collision-free id: `long-text`, `long-text-2`, … */
function newFieldId(type: FieldType, taken: ReadonlySet<string>): string {
  const base = type.replace(/([A-Z])/g, "-$1").toLowerCase();
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * Seed a new field for a palette block. Author-identity types claim their
 * semantic role (and its publish defaults) only if no existing field holds it,
 * so the widget/consent pipeline keeps exactly one source per role.
 */
export function buildField(
  block: PaletteBlock,
  doc: FormDefinitionDoc,
): FormField {
  const type: FieldType = block === "videoUpload" ? "fileUpload" : block;
  const taken = new Set(doc.fields.map((f) => f.id));
  const roles = new Set(doc.fields.map((f) => f.role));
  const id = newFieldId(type, taken);
  const claim = (role: FormField["role"]) =>
    roles.has(role) ? "custom" : role;

  const seed: Partial<FormField> & Pick<FormField, "id" | "type"> = (() => {
    switch (block) {
      case "shortText":
        return { id, type, label: "Short answer" };
      case "longText":
        return { id, type, label: "Your answer", maxLength: 1000 };
      case "rating": {
        const role = claim("rating");
        return {
          id,
          type,
          role,
          label: "Your rating",
          ratingScale: 5,
          ratingStyle: "stars",
          publishable: role === "rating",
          widgetEligible: role === "rating",
        };
      }
      case "name": {
        const role = claim("authorName");
        return {
          id,
          type,
          role,
          label: "Your name",
          placeholder: "Jane Doe",
          publishable: role === "authorName",
          widgetEligible: role === "authorName",
        };
      }
      case "email":
        return {
          id,
          type,
          role: claim("authorEmail"),
          label: "Email",
          placeholder: "you@company.com",
          private: true,
        };
      case "company": {
        const role = claim("authorCompany");
        return {
          id,
          type,
          role,
          label: "Company",
          publishable: role === "authorCompany",
          widgetEligible: role === "authorCompany",
        };
      }
      case "role": {
        const role = claim("authorRole");
        return {
          id,
          type,
          role,
          label: "Role / title",
          publishable: role === "authorRole",
          widgetEligible: role === "authorRole",
        };
      }
      case "website":
        return { id, type, label: "Website", placeholder: "https://" };
      case "singleSelect":
        return {
          id,
          type,
          label: "Pick one",
          options: [
            { value: "option-1", label: "Option 1" },
            { value: "option-2", label: "Option 2" },
          ],
        };
      case "multiSelect":
        return {
          id,
          type,
          label: "Pick all that apply",
          options: [
            { value: "option-1", label: "Option 1" },
            { value: "option-2", label: "Option 2" },
          ],
        };
      case "imageUpload":
        return {
          id,
          type,
          role: claim("authorAvatar"),
          label: "Photo",
          fileTypes: ["image/png", "image/jpeg", "image/webp"],
          maxFileSize: 5_000_000,
          maxFileCount: 1,
        };
      case "videoUpload":
        return {
          id,
          type,
          label: "Video testimonial",
          fileTypes: VIDEO_TYPES,
          maxFileSize: 25_000_000,
          maxFileCount: 1,
          publishable: true,
          widgetEligible: true,
        };
      case "fileUpload":
        return {
          id,
          type,
          label: "Attachment",
          private: true,
          fileTypes: ["image/png", "image/jpeg", "application/pdf"],
          maxFileSize: 10_000_000,
          maxFileCount: 3,
        };
      case "consent":
        return {
          id,
          type,
          role: "consent",
          label: "Consent",
          required: true,
          private: true,
          consentCopy:
            "I agree to let this business publish my response publicly.",
        };
      case "hidden":
        return {
          id,
          type,
          label: "Hidden field",
          private: true,
          hiddenSource: "query",
          hiddenKey: "ref",
        };
    }
  })();

  return formFieldSchema.parse(seed);
}

/**
 * Copy a field under a fresh id. Semantic roles are NOT copied (two fields
 * claiming `authorName` would double-source the display pipeline); the copy
 * collects as a custom field.
 */
export function duplicateField(
  field: FormField,
  doc: FormDefinitionDoc,
): FormField {
  const taken = new Set(doc.fields.map((f) => f.id));
  return formFieldSchema.parse({
    ...field,
    id: newFieldId(field.type, taken),
    label: field.label ? `${field.label} copy` : field.label,
    role: "custom",
    publishable: false,
    widgetEligible: false,
  });
}

export function FieldPalette({
  doc,
  onAdd,
}: {
  doc: FormDefinitionDoc;
  onAdd: (field: FormField) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const hasConsent = doc.fields.some((f) => f.type === "consent");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
          <PlusIcon className="size-3.5" weight="bold" aria-hidden />
          Add question
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-1.5">
        <div className="max-h-[420px] overflow-y-auto">
          {CATALOG.map((group) => (
            <div key={group.group} className="mb-1 last:mb-0">
              <p className="px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {group.group}
              </p>
              {group.entries.map((entry) => {
                const Icon = entry.icon;
                const disabled = entry.block === "consent" && hasConsent;
                return (
                  <button
                    key={entry.block}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onAdd(buildField(entry.block, doc));
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors",
                      "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      "disabled:pointer-events-none disabled:opacity-40",
                    )}
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground">
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-foreground">
                        {entry.label}
                        {disabled && (
                          <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                            already added
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {entry.blurb}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
