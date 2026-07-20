"use client";

/**
 * FieldPalette — the "Add field" popover for the Form Studio.
 *
 * The controlled field system stays controlled: authors pick from the 14
 * forms-core types, each seeded with sensible defaults (role, privacy,
 * publish eligibility) so an added field behaves correctly in the consent +
 * widget pipeline without any manual wiring. Structure-only — no free-form
 * HTML, ever (2026-06-10 parametric decision).
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
  MicrophoneIcon,
  PaperclipIcon,
  ShieldCheckIcon,
  EyeSlashIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import {
  EMBED_MAX_FIELDS,
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

export const FIELD_TYPE_ICON: Record<FieldType, PhosphorIcon> = {
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
  videoUpload: VideoCameraIcon,
  audioUpload: MicrophoneIcon,
  fileUpload: PaperclipIcon,
  consent: ShieldCheckIcon,
  hidden: EyeSlashIcon,
};

interface CatalogEntry {
  type: FieldType;
  label: string;
  blurb: string;
}

const CATALOG: ReadonlyArray<{
  group: string;
  entries: ReadonlyArray<CatalogEntry>;
}> = [
  {
    group: "Feedback",
    entries: [
      { type: "longText", label: "Long text", blurb: "Multi-line answer" },
      { type: "shortText", label: "Short text", blurb: "One-line answer" },
      { type: "rating", label: "Rating", blurb: "Stars, numbers, or emoji" },
    ],
  },
  {
    group: "Respondent",
    entries: [
      { type: "name", label: "Name", blurb: "Who's answering" },
      { type: "email", label: "Email", blurb: "Always kept private" },
      { type: "company", label: "Company", blurb: "Where they work" },
      { type: "role", label: "Role", blurb: "Their job title" },
      { type: "website", label: "Website", blurb: "A link they provide" },
    ],
  },
  {
    group: "Choices",
    entries: [
      {
        type: "singleSelect",
        label: "Single select",
        blurb: "Pick one option",
      },
      { type: "multiSelect", label: "Multi select", blurb: "Pick several" },
    ],
  },
  {
    group: "Media",
    entries: [
      {
        type: "imageUpload",
        label: "Image upload",
        blurb: "Photo or headshot",
      },
      { type: "videoUpload", label: "Video", blurb: "Record or upload a clip" },
      { type: "audioUpload", label: "Audio", blurb: "A spoken answer" },
      { type: "fileUpload", label: "File upload", blurb: "Attachments" },
    ],
  },
  {
    // Consent is deliberately absent: it's platform furniture, seeded and
    // rendered automatically — not a field the owner manages (2026-07-17).
    group: "Advanced",
    entries: [
      { type: "hidden", label: "Hidden", blurb: "UTM / query capture" },
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

/** Claims a semantic role: yields the role only if no existing field holds it. */
type RoleClaim = (role: FormField["role"]) => FormField["role"];

/**
 * A field seed: static defaults, or — for author-identity types whose publish
 * defaults hinge on winning a role claim — a function of the claim.
 */
type FieldSeed =
  | Partial<FormField>
  | ((claim: RoleClaim) => Partial<FormField>);

/** Seed for a role-claiming type: publish defaults only when the claim wins. */
function claimedSeed(
  claim: RoleClaim,
  want: FormField["role"],
  extras: Partial<FormField>,
): Partial<FormField> {
  const role = claim(want);
  return {
    role,
    ...extras,
    publishable: role === want,
    widgetEligible: role === want,
  };
}

/** Default seed per field type (`id`/`type` are stamped on by `buildField`). */
const FIELD_SEEDS: Record<FieldType, FieldSeed> = {
  shortText: { label: "Short answer" },
  longText: { label: "Your answer", maxLength: 1000 },
  rating: (claim) =>
    claimedSeed(claim, "rating", {
      label: "Your rating",
      ratingScale: 5,
      ratingStyle: "stars",
    }),
  name: (claim) =>
    claimedSeed(claim, "authorName", {
      label: "Your name",
      placeholder: "Jane Doe",
    }),
  email: (claim) => ({
    role: claim("authorEmail"),
    label: "Email",
    placeholder: "you@company.com",
    private: true,
  }),
  company: (claim) => claimedSeed(claim, "authorCompany", { label: "Company" }),
  role: (claim) => claimedSeed(claim, "authorRole", { label: "Role / title" }),
  website: { label: "Website", placeholder: "https://" },
  singleSelect: {
    label: "Pick one",
    options: [
      { value: "option-1", label: "Option 1" },
      { value: "option-2", label: "Option 2" },
    ],
  },
  multiSelect: {
    label: "Pick all that apply",
    options: [
      { value: "option-1", label: "Option 1" },
      { value: "option-2", label: "Option 2" },
    ],
  },
  imageUpload: (claim) => ({
    role: claim("authorAvatar"),
    label: "Photo",
    fileTypes: ["image/png", "image/jpeg", "image/webp"],
    maxFileSize: 5_000_000,
    maxFileCount: 1,
  }),
  videoUpload: {
    label: "Record a quick video",
    description: "60 seconds is plenty — or write it out instead.",
    publishable: true,
    widgetEligible: true,
    fileTypes: ["video/mp4", "video/webm", "video/quicktime"],
    maxFileSize: 200_000_000,
    maxFileCount: 1,
    maxDurationSec: 120,
  },
  audioUpload: {
    label: "Leave a voice note",
    publishable: true,
    fileTypes: ["audio/mpeg", "audio/mp4", "audio/webm", "audio/wav"],
    maxFileSize: 50_000_000,
    maxFileCount: 1,
    maxDurationSec: 300,
  },
  fileUpload: {
    label: "Attachment",
    private: true,
    fileTypes: ["image/png", "image/jpeg", "application/pdf"],
    maxFileSize: 10_000_000,
    maxFileCount: 3,
  },
  consent: {
    role: "consent",
    label: "Consent",
    required: true,
    private: true,
    consentCopy: "I agree to let this business publish my response publicly.",
  },
  hidden: {
    label: "Hidden field",
    private: true,
    hiddenSource: "query",
    hiddenKey: "ref",
  },
};

/**
 * Seed a new field for a type. Author-identity types claim their semantic role
 * (and its publish defaults) only if no existing field holds it, so the
 * widget/consent pipeline keeps exactly one source per role.
 */
export function buildField(type: FieldType, doc: FormDefinitionDoc): FormField {
  const taken = new Set(doc.fields.map((f) => f.id));
  const roles = new Set(doc.fields.map((f) => f.role));
  const id = newFieldId(type, taken);
  const claim: RoleClaim = (role) => (roles.has(role) ? "custom" : role);
  const seed = FIELD_SEEDS[type];
  return formFieldSchema.parse({
    id,
    type,
    ...(typeof seed === "function" ? seed(claim) : seed),
  });
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
  trigger,
}: {
  doc: FormDefinitionDoc;
  onAdd: (field: FormField) => void;
  /** Custom trigger element; defaults to an "Add field" button. */
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = React.useState(false);
  const isEmbed = doc.delivery === "embed";
  const askCount = doc.fields.filter(
    (f) => f.type !== "hidden" && f.type !== "consent",
  ).length;
  const atCap = isEmbed && askCount >= EMBED_MAX_FIELDS;
  // Embedded forms are a smaller product: upload/capture types don't exist
  // there, and asks are capped — the palette teaches this at the source.
  const groups = isEmbed
    ? CATALOG.filter((group) => group.group !== "Media")
    : CATALOG;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
            <PlusIcon className="size-3.5" weight="bold" aria-hidden />
            Add field
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-1.5">
        <div className="max-h-[420px] overflow-y-auto">
          {atCap ? (
            <p className="mx-1 mt-1 rounded-md bg-amber-500/10 px-2 py-1.5 text-[11px] leading-snug text-muted-foreground">
              Embedded forms are limited to {EMBED_MAX_FIELDS} questions. Remove
              one to add another.
            </p>
          ) : null}
          {groups.map((group) => (
            <div key={group.group} className="mb-1 last:mb-0">
              <p className="px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {group.group}
              </p>
              {group.entries.map((entry) => {
                const Icon = FIELD_TYPE_ICON[entry.type];
                const disabled = atCap && entry.type !== "hidden";
                return (
                  <button
                    key={entry.type}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onAdd(buildField(entry.type, doc));
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
