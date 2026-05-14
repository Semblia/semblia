"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { V2ProjectDTO, V2ProjectVisibility } from "@workspace/types";
import {
  PlusIcon,
  TrashIcon,
  GlobeIcon,
  XIcon,
  IdentificationCard,
  Eye,
  ShareNetwork,
  Warning,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  PageHeader,
  PageBody,
  PageToolbar,
  PageTabs,
  SettingsSection,
  SettingsFooter,
  ToggleRow,
} from "@/components/shared";
import { useUpdateProject, useDeleteProject } from "@/hooks/api";

// ── UI-internal social link types ─────────────────────────────────────────────
// These stay local because the form has preconfigured platforms + custom links,
// while V2ProjectDTO.socialLinks is a flat Record<string, string>.

interface CustomSocialLink {
  platformName: string;
  platformUrl: string;
  profileUrl: string;
}

interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  github?: string;
  youtube?: string;
  instagram?: string;
  facebook?: string;
  custom?: CustomSocialLink[];
}

// ── Normalization helpers ─────────────────────────────────────────────────────

const KNOWN_PLATFORMS: PlatformKey[] = [
  "twitter",
  "linkedin",
  "github",
  "youtube",
  "instagram",
  "facebook",
];

/** Convert flat API record → rich UI SocialLinks. */
function recordToSocialLinks(
  record: Record<string, string> | null,
): SocialLinks {
  if (!record) return {};
  const result: SocialLinks = {};
  const custom: CustomSocialLink[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (KNOWN_PLATFORMS.includes(key as PlatformKey)) {
      (result as Record<string, string>)[key] = value;
    } else {
      custom.push({ platformName: key, platformUrl: "", profileUrl: value });
    }
  }
  if (custom.length > 0) result.custom = custom;
  return result;
}

/** Convert rich UI SocialLinks → flat API record. */
function socialLinksToRecord(links: SocialLinks): Record<string, string> {
  const record: Record<string, string> = {};
  for (const key of KNOWN_PLATFORMS) {
    const val = links[key];
    if (val) record[key] = val;
  }
  for (const c of links.custom ?? []) {
    if (c.platformName && c.profileUrl) {
      record[c.platformName] = c.profileUrl;
    }
  }
  return record;
}

/** Normalize V2ProjectDTO nullable fields into stable form state values. */
function normalizeProject(p: V2ProjectDTO) {
  return {
    name: p.name,
    slug: p.slug,
    description: p.description ?? "",
    visibility: p.visibility,
    autoModeration: p.autoModeration,
    autoApproveVerified: p.autoApproveVerified,
    profanityFilterLevel: p.profanityFilterLevel ?? "OFF",
    websiteUrl: p.websiteUrl ?? "",
    socialLinks: recordToSocialLinks(p.socialLinks),
    tags: p.tags ?? [],
  } as const;
}

/* ─── Sub-nav sections ────────────────────────────────────────────────────── */

const TABS = [
  { id: "identity", label: "Identity", icon: IdentificationCard },
  { id: "visibility", label: "Visibility", icon: Eye },
  { id: "social", label: "Social", icon: ShareNetwork },
  { id: "danger", label: "Danger zone", icon: Warning },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ─── Field group card ────────────────────────────────────────────────────── */

function FieldGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

/* ─── Chip input (tags) ───────────────────────────────────────────────────── */

function TagInput({
  values,
  onChange,
  suggestions,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
}) {
  const [input, setInput] = React.useState("");

  function add(tag: string) {
    const t = tag.trim().toLowerCase();
    if (!t || values.includes(t)) return;
    onChange([...values, t]);
    setInput("");
  }

  const suggested =
    suggestions
      ?.filter((s) => !values.includes(s) && s.includes(input.toLowerCase()))
      .slice(0, 6) ?? [];

  return (
    <div className="space-y-2">
      <div className="flex min-h-9 flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm focus-within:ring-1 focus-within:ring-ring">
        {values.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-[11px]"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-2.5" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(input);
            }
            if (e.key === "Backspace" && !input && values.length)
              onChange(values.slice(0, -1));
          }}
          placeholder={values.length === 0 ? "Add tags…" : undefined}
          className="min-w-[100px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {suggested.length > 0 && input && (
        <div className="flex flex-wrap gap-1">
          {suggested.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-foreground"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Social links ────────────────────────────────────────────────────────── */

type PlatformKey =
  | "twitter"
  | "linkedin"
  | "github"
  | "youtube"
  | "instagram"
  | "facebook";

interface PlatformConfig {
  key: PlatformKey;
  label: string;
  placeholder: string;
  /** Hostname patterns — profile URL must start with one of these */
  patterns: string[];
  /** SVG path for 16×16 viewBox brand icon */
  icon: React.ReactNode;
}

const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    key: "twitter",
    label: "Twitter / X",
    placeholder: "https://x.com/yourhandle",
    patterns: ["x.com", "twitter.com"],
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    placeholder: "https://linkedin.com/in/yourname",
    patterns: ["linkedin.com"],
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    key: "github",
    label: "GitHub",
    placeholder: "https://github.com/yourname",
    patterns: ["github.com"],
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "https://youtube.com/@yourchannel",
    patterns: ["youtube.com", "youtu.be"],
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/yourhandle",
    patterns: ["instagram.com"],
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 1 1-2.882 0 1.441 1.441 0 0 1 2.882 0z" />
      </svg>
    ),
  },
  {
    key: "facebook",
    label: "Facebook",
    placeholder: "https://facebook.com/yourpage",
    patterns: ["facebook.com", "fb.com"],
    icon: (
      <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
];

/** Validate a URL matches one of the allowed domain patterns */
function validateSocialUrl(url: string, patterns: string[]): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const matches = patterns.some((p) => host === p || host.endsWith(`.${p}`));
    if (!matches) {
      return `URL must be on ${patterns.join(" or ")}`;
    }
    return null;
  } catch {
    return "Enter a valid URL (e.g. https://…)";
  }
}

function PreconfiguredSocialField({
  config,
  value,
  onChange,
}: {
  config: PlatformConfig;
  value: string;
  onChange: (v: string) => void;
}) {
  const error = validateSocialUrl(value, config.patterns);
  const hasError = !!error && value.length > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <div className="flex w-12 shrink-0 flex-col items-center gap-0.5">
          <span className="flex size-8 items-center justify-center rounded-md border border-border bg-muted/50 text-muted-foreground">
            {config.icon}
          </span>
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config.placeholder}
          type="url"
          className={cn(
            "h-8 flex-1 text-[13px]",
            hasError &&
              "border-destructive/60 focus-visible:ring-destructive/30",
          )}
        />
      </div>
      {hasError && (
        <p className="pl-[3.75rem] text-[11px] text-destructive">{error}</p>
      )}
    </div>
  );
}

function CustomLinksEditor({
  links,
  onChange,
}: {
  links: CustomSocialLink[];
  onChange: (v: CustomSocialLink[]) => void;
}) {
  function update(idx: number, patch: Partial<CustomSocialLink>) {
    onChange(links.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function remove(idx: number) {
    onChange(links.filter((_, i) => i !== idx));
  }

  function add() {
    onChange([...links, { platformName: "", platformUrl: "", profileUrl: "" }]);
  }

  function getDomain(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  function validateProfileUrl(link: CustomSocialLink): string | null {
    if (!link.profileUrl) return null;
    if (!link.platformUrl) return "Set the platform URL first";
    const domain = getDomain(link.platformUrl);
    if (!domain) return "Platform URL is invalid";
    return validateSocialUrl(link.profileUrl, [domain]);
  }

  return (
    <div className="space-y-3">
      {links.map((link, idx) => {
        const domain = getDomain(link.platformUrl);
        const faviconUrl = domain
          ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
          : null;
        const profileError = validateProfileUrl(link);
        const hasProfileError = !!profileError && link.profileUrl.length > 0;

        return (
          <div
            key={idx}
            className="relative rounded-lg border border-border bg-muted/20 p-3 space-y-2.5 transition-colors hover:bg-muted/30"
          >
            {/* Row 1: favicon + name + trash */}
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                {faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={faviconUrl}
                    alt=""
                    width={16}
                    height={16}
                    className="size-4 rounded-[2px]"
                  />
                ) : (
                  <GlobeIcon className="size-3.5 text-muted-foreground" />
                )}
              </span>
              <Input
                value={link.platformName}
                onChange={(e) => update(idx, { platformName: e.target.value })}
                placeholder="Platform name (e.g. Dribbble)"
                className="h-7 flex-1 text-[12.5px]"
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Remove ${link.platformName || "custom link"}`}
              >
                <TrashIcon className="size-3.5" />
              </button>
            </div>
            {/* Row 2: platform URL */}
            <Input
              value={link.platformUrl}
              onChange={(e) => update(idx, { platformUrl: e.target.value })}
              placeholder="Platform URL (e.g. https://dribbble.com)"
              type="url"
              className="h-7 text-[12.5px]"
            />
            {/* Row 3: profile link */}
            <Input
              value={link.profileUrl}
              onChange={(e) => update(idx, { profileUrl: e.target.value })}
              placeholder="Your profile link"
              type="url"
              className={cn(
                "h-7 text-[12.5px]",
                hasProfileError &&
                  "border-destructive/60 focus-visible:ring-destructive/30",
              )}
            />
            {hasProfileError && (
              <p className="text-[11px] text-destructive">{profileError}</p>
            )}
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={add}
      >
        <PlusIcon className="size-3.5" /> Add custom link
      </Button>
    </div>
  );
}

function SocialLinksEditor({
  value,
  onChange,
}: {
  value: SocialLinks;
  onChange: (v: SocialLinks) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Preconfigured platforms */}
      <div className="space-y-4">
        {PLATFORM_CONFIGS.map((cfg) => (
          <PreconfiguredSocialField
            key={cfg.key}
            config={cfg}
            value={value[cfg.key] ?? ""}
            onChange={(url) =>
              onChange({
                ...value,
                [cfg.key]: url || undefined,
              })
            }
          />
        ))}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-[11px] font-medium text-muted-foreground">
            Other platforms
          </span>
        </div>
      </div>

      {/* Custom links */}
      <CustomLinksEditor
        links={value.custom ?? []}
        onChange={(custom) => onChange({ ...value, custom })}
      />
    </div>
  );
}

/* ─── Slug confirm dialog ─────────────────────────────────────────────────── */

function SlugChangeDialog({
  open,
  oldSlug,
  newSlug,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  oldSlug: string;
  newSlug: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
      intent="warning"
      title="Change project slug?"
      description={
        <>
          Changing from <code className="font-mono text-xs">{oldSlug}</code> to{" "}
          <code className="font-mono text-xs">{newSlug}</code> will break
          existing links. Embedded widgets keep working.
        </>
      }
      confirmLabel="Change slug"
      cancelLabel="Keep current"
      onConfirm={onConfirm}
    />
  );
}

/* ─── Delete project dialog ───────────────────────────────────────────────── */

function DeleteProjectDialog({
  open,
  onOpenChange,
  slug,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = React.useState("");
  const match = typed === slug;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setTyped("");
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete project?</DialogTitle>
          <DialogDescription>
            This permanently deletes the project, forms, widgets, and
            testimonials. Type <code className="font-mono text-xs">{slug}</code>{" "}
            to confirm.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={slug}
          autoFocus
        />
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTyped("");
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!match}
            onClick={() => {
              if (match) onConfirm();
            }}
          >
            Delete project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main settings client ────────────────────────────────────────────────── */

export function SettingsClient({ project }: { project: V2ProjectDTO }) {
  const norm = React.useMemo(() => normalizeProject(project), [project]);

  // Identity
  const [name, setName] = React.useState(norm.name);
  const [slug, setSlug] = React.useState(norm.slug);
  const [description, setDescription] = React.useState(norm.description);

  // Visibility
  const [visibility, setVisibility] = React.useState<V2ProjectVisibility>(
    norm.visibility,
  );
  const [autoModeration, setAutoModeration] = React.useState(
    norm.autoModeration,
  );
  const [autoApproveVerified, setAutoApproveVerified] = React.useState(
    norm.autoApproveVerified,
  );
  const [profanityLevel, setProfanityLevel] = React.useState(
    norm.profanityFilterLevel,
  );

  // Social
  const [websiteUrl, setWebsiteUrl] = React.useState(norm.websiteUrl);
  const [socialLinks, setSocialLinks] = React.useState<SocialLinks>(
    norm.socialLinks,
  );
  const [tags, setTags] = React.useState<string[]>(norm.tags);

  // Mutations
  const updateProject = useUpdateProject(project.slug);
  const deleteProjectMut = useDeleteProject(project.slug);

  // UI state
  const [saving, setSaving] = React.useState(false);
  const [slugConfirm, setSlugConfirm] = React.useState(false);
  const [pendingSlug, setPendingSlug] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // Tab routing
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const rawTab = searchParams.get("tab") ?? "identity";
  const activeTab = (
    TABS.some((t) => t.id === rawTab) ? rawTab : "identity"
  ) as TabId;

  function setTab(id: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // Dirty checks per section — compare against normalized baseline
  const identityDirty =
    name !== norm.name ||
    slug !== norm.slug ||
    description !== norm.description;
  const visibilityDirty =
    visibility !== norm.visibility ||
    autoModeration !== norm.autoModeration ||
    autoApproveVerified !== norm.autoApproveVerified ||
    profanityLevel !== norm.profanityFilterLevel;
  const socialDirty =
    websiteUrl !== norm.websiteUrl ||
    JSON.stringify(socialLinks) !== JSON.stringify(norm.socialLinks) ||
    JSON.stringify(tags) !== JSON.stringify(norm.tags);

  const anyDirty = identityDirty || visibilityDirty || socialDirty;

  function handleSlugChange(raw: string) {
    const kebab = raw
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-");
    setSlug(kebab);
  }

  async function handleSave() {
    // If slug changed, show confirm first
    if (slug !== project.slug) {
      setPendingSlug(slug);
      setSlugConfirm(true);
      return;
    }
    await doSave();
  }

  async function doSave(newSlug?: string) {
    setSaving(true);
    try {
      await updateProject.mutateAsync({
        name: name.trim(),
        slug: newSlug ?? slug,
        description: description.trim() || undefined,
        visibility,
        autoModeration,
        autoApproveVerified,
        profanityFilterLevel: profanityLevel,
        websiteUrl: websiteUrl.trim() || undefined,
        socialLinks: socialLinksToRecord(socialLinks),
        tags,
      });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function handleSlugConfirm() {
    setSlugConfirm(false);
    if (pendingSlug) {
      void doSave(pendingSlug);
      setPendingSlug(null);
    }
  }

  function handleDiscard() {
    setName(norm.name);
    setSlug(norm.slug);
    setDescription(norm.description);
    setVisibility(norm.visibility);
    setAutoModeration(norm.autoModeration);
    setAutoApproveVerified(norm.autoApproveVerified);
    setProfanityLevel(norm.profanityFilterLevel);
    setWebsiteUrl(norm.websiteUrl);
    setSocialLinks(norm.socialLinks);
    setTags([...norm.tags]);
  }

  async function handleDelete() {
    setDeleteOpen(false);
    try {
      await deleteProjectMut.mutateAsync();
      toast.success("Project deleted");
      router.push("/projects");
    } catch {
      toast.error("Failed to delete project");
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Settings" description={project.name} />

      <div className="flex flex-1 flex-col">
        <PageToolbar
          className="py-0"
          leading={
            <PageTabs<TabId>
              aria-label="Settings sections"
              options={TABS.map(({ id, label, icon }) => ({ id, label, icon }))}
              value={activeTab}
              onChange={(v) => setTab(v)}
            />
          }
        />

        <PageBody padding="default">
          <div className="space-y-8 pb-8" key={activeTab}>
            {activeTab === "identity" && (
              <SettingsSection
                id="identity"
                title="Identity"
                description="Name and public identity of the project."
              >
                <FieldGroup>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="s-name">Project name</Label>
                        <span
                          className="text-[11px] tabular-nums text-muted-foreground"
                          aria-label={`${name.length} of 60 characters used`}
                        >
                          {name.length}/60
                        </span>
                      </div>
                      <Input
                        id="s-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={60}
                        aria-required="true"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="s-slug">Slug</Label>
                      <Input
                        id="s-slug"
                        value={slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        className="font-mono"
                        placeholder="my-project"
                        aria-describedby="slug-help"
                      />
                      <p
                        id="slug-help"
                        className="text-[11px] leading-relaxed text-muted-foreground"
                      >
                        Used in URLs:{" "}
                        <span className="font-mono">tresta.app/{slug}</span>.
                        Changing the slug breaks existing links.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="s-desc">Description</Label>
                        <span
                          className="text-[11px] tabular-nums text-muted-foreground"
                          aria-label={`${description.length} of 240 characters used`}
                        >
                          {description.length}/240
                        </span>
                      </div>
                      <Textarea
                        id="s-desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={240}
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </FieldGroup>
              </SettingsSection>
            )}

            {activeTab === "visibility" && (
              <SettingsSection
                id="visibility"
                title="Visibility & moderation"
                description="Control who can see submissions and how they're reviewed."
              >
                <div className="space-y-5">
                  <FieldGroup>
                    <fieldset className="space-y-3">
                      <legend className="text-sm font-medium text-foreground">
                        Visibility
                      </legend>
                      <RadioGroup
                        value={visibility}
                        onValueChange={(v) =>
                          setVisibility(v as V2ProjectVisibility)
                        }
                        className="space-y-2.5"
                      >
                        {(
                          [
                            {
                              value: "PUBLIC",
                              label: "Public",
                              desc: "Anyone can view approved testimonials.",
                            },
                            {
                              value: "PRIVATE",
                              label: "Private",
                              desc: "Only you can see this project.",
                            },
                            {
                              value: "INVITE_ONLY",
                              label: "Unlisted",
                              desc: "Accessible by direct link only.",
                            },
                          ] as const
                        ).map(({ value, label, desc }) => (
                          <div key={value} className="flex items-start gap-3">
                            <RadioGroupItem
                              value={value}
                              id={`vis-${value}`}
                              className="mt-0.5"
                            />
                            <label
                              htmlFor={`vis-${value}`}
                              className="cursor-pointer space-y-0.5"
                            >
                              <span className="text-sm font-medium">
                                {label}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {desc}
                              </p>
                            </label>
                          </div>
                        ))}
                      </RadioGroup>
                    </fieldset>
                  </FieldGroup>

                  <div className="overflow-hidden rounded-lg border border-border">
                    <div className="divide-y divide-border">
                      <ToggleRow
                        title="Auto-moderation"
                        description="Filter submissions before they reach review."
                        checked={autoModeration}
                        onChange={setAutoModeration}
                      />
                      <ToggleRow
                        title="Auto-approve verified"
                        description="Skip review for OAuth-verified submissions."
                        checked={autoApproveVerified}
                        onChange={setAutoApproveVerified}
                        disabled={!autoModeration}
                      />
                    </div>
                  </div>

                  <FieldGroup>
                    <div className="space-y-2">
                      <Label htmlFor="s-profanity">Profanity filter</Label>
                      <Select
                        value={profanityLevel}
                        onValueChange={setProfanityLevel}
                      >
                        <SelectTrigger id="s-profanity" className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OFF">Off</SelectItem>
                          <SelectItem value="LENIENT">Light</SelectItem>
                          <SelectItem value="MODERATE">Moderate</SelectItem>
                          <SelectItem value="STRICT">Strict</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Automatically flags submissions containing profanity.
                      </p>
                    </div>
                  </FieldGroup>
                </div>
              </SettingsSection>
            )}

            {activeTab === "social" && (
              <SettingsSection
                id="social"
                title="Social & website"
                description="Links shown on your public project page."
              >
                <FieldGroup>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="s-website">Website</Label>
                      <div className="relative">
                        <GlobeIcon
                          className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <Input
                          id="s-website"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          placeholder="https://example.com"
                          className="pl-8"
                          type="url"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Social links</Label>
                      <SocialLinksEditor
                        value={socialLinks}
                        onChange={setSocialLinks}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <TagInput
                        values={tags}
                        onChange={setTags}
                        suggestions={[
                          "saas",
                          "startup",
                          "b2b",
                          "product",
                          "portfolio",
                          "agency",
                          "open-source",
                          "mobile",
                        ]}
                      />
                    </div>
                  </div>
                </FieldGroup>
              </SettingsSection>
            )}

            {activeTab === "danger" && (
              <SettingsSection
                id="danger"
                title="Danger zone"
                description="Irreversible actions that affect your entire project."
              >
                <div className="overflow-hidden rounded-xl border border-destructive/30 bg-destructive/[0.03] dark:bg-destructive/[0.06]">
                  <div className="divide-y divide-destructive/15">
                    {/* Transfer ownership (stub) */}
                    <div className="flex items-center justify-between gap-4 p-5">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Transfer ownership
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Move this project to another workspace member.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        aria-label="Transfer ownership (coming soon)"
                        className="shrink-0"
                      >
                        Transfer
                      </Button>
                    </div>

                    {/* Delete project */}
                    <div className="flex items-center justify-between gap-4 p-5">
                      <div>
                        <p className="text-sm font-medium text-destructive">
                          Delete project
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Permanently deletes the project, forms, widgets, and
                          testimonials.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteOpen(true)}
                        className="shrink-0 tactile"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </SettingsSection>
            )}
          </div>
        </PageBody>

        {/* Sticky save footer — outside PageBody for clean viewport-bottom stickiness */}
        <SettingsFooter
          dirty={anyDirty}
          saving={saving}
          onSave={handleSave}
          onDiscard={handleDiscard}
        />
      </div>

      <SlugChangeDialog
        open={slugConfirm}
        oldSlug={project.slug}
        newSlug={pendingSlug ?? ""}
        onConfirm={handleSlugConfirm}
        onCancel={() => {
          setSlugConfirm(false);
          setPendingSlug(null);
          setSlug(project.slug);
        }}
      />

      <DeleteProjectDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        slug={project.slug}
        onConfirm={handleDelete}
      />
    </div>
  );
}
