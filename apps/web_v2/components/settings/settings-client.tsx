"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { MockProject, ProjectVisibility } from "@/lib/mock-data";
import {
  UserIcon,
  EyeIcon,
  LinkIcon,
  WarningOctagonIcon,
  PlusIcon,
  TrashIcon,
  GlobeIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { PageHeader, PageBody, PageToolbar } from "@/components/shared";
import { apiUpdateProject, type ProjectPatch } from "@/lib/api";

/* ─── Sub-nav sections ────────────────────────────────────────────────────── */

const SECTIONS = [
  { id: "identity", label: "Identity", icon: UserIcon },
  { id: "visibility", label: "Visibility", icon: EyeIcon },
  { id: "social", label: "Social", icon: LinkIcon },
  { id: "danger", label: "Danger zone", icon: WarningOctagonIcon },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/* ─── Section wrapper ─────────────────────────────────────────────────────── */

function Section({
  id,
  title,
  description,
  dirty,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  dirty: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-5">
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {dirty && (
              <Badge variant="secondary" className="text-[10px]">Unsaved</Badge>
            )}
          </div>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/* ─── Chip input (tags) ───────────────────────────────────────────────────── */

function TagInput({ values, onChange, suggestions }: { values: string[]; onChange: (v: string[]) => void; suggestions?: string[] }) {
  const [input, setInput] = React.useState("");

  function add(tag: string) {
    const t = tag.trim().toLowerCase();
    if (!t || values.includes(t)) return;
    onChange([...values, t]);
    setInput("");
  }

  const suggested = suggestions?.filter((s) => !values.includes(s) && s.includes(input.toLowerCase())).slice(0, 6) ?? [];

  return (
    <div className="space-y-2">
      <div className="flex min-h-9 flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm focus-within:ring-1 focus-within:ring-ring">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-[11px]">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="text-muted-foreground hover:text-foreground">
              <XIcon className="size-2.5" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(input); }
            if (e.key === "Backspace" && !input && values.length) onChange(values.slice(0, -1));
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

const SOCIAL_PLATFORMS = ["Twitter / X", "LinkedIn", "Instagram", "YouTube", "GitHub", "Other"] as const;

type SocialLink = { platform: string; url: string };

function SocialLinksEditor({
  value,
  onChange,
}: {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const links: SocialLink[] = Object.entries(value).map(([platform, url]) => ({ platform, url }));

  function update(idx: number, patch: Partial<SocialLink>) {
    const next = links.map((l, i) => (i === idx ? { ...l, ...patch } : l));
    onChange(Object.fromEntries(next.map((l) => [l.platform, l.url])));
  }

  function remove(idx: number) {
    const next = links.filter((_, i) => i !== idx);
    onChange(Object.fromEntries(next.map((l) => [l.platform, l.url])));
  }

  function add() {
    const next = [...links, { platform: "Other", url: "" }];
    onChange(Object.fromEntries(next.map((l) => [l.platform, l.url])));
  }

  return (
    <div className="space-y-2">
      {links.map((link, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Select value={link.platform} onValueChange={(v) => update(idx, { platform: v })}>
            <SelectTrigger className="w-36 shrink-0 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOCIAL_PLATFORMS.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={link.url}
            onChange={(e) => update(idx, { url: e.target.value })}
            placeholder="https://…"
            className="flex-1 text-xs"
          />
          <button
            type="button"
            onClick={() => remove(idx)}
            className="shrink-0 text-muted-foreground hover:text-destructive"
            aria-label="Remove link"
          >
            <TrashIcon className="size-4" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={add}>
        <PlusIcon className="size-3.5" /> Add link
      </Button>
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
      onOpenChange={(o) => { if (!o) onCancel(); }}
      intent="warning"
      title="Change project slug?"
      description={
        <>
          Changing from <code className="font-mono text-xs">{oldSlug}</code> to{" "}
          <code className="font-mono text-xs">{newSlug}</code> will break existing
          links. Embedded widgets keep working.
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
    <Dialog open={open} onOpenChange={(o) => { if (!o) setTyped(""); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete project?</DialogTitle>
          <DialogDescription>
            This permanently deletes the project, forms, widgets, and testimonials.
            Type <code className="font-mono text-xs">{slug}</code> to confirm.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={slug}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { setTyped(""); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!match}
            onClick={() => { if (match) onConfirm(); }}
          >
            Delete project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main settings client ────────────────────────────────────────────────── */

export function SettingsClient({ project }: { project: MockProject }) {
  // Identity
  const [name, setName] = React.useState(project.name);
  const [slug, setSlug] = React.useState(project.slug);
  const [description, setDescription] = React.useState(project.description ?? "");

  // Visibility
  const [visibility, setVisibility] = React.useState<ProjectVisibility>(project.visibility);
  const [autoModeration, setAutoModeration] = React.useState(project.autoModeration);
  const [autoApproveVerified, setAutoApproveVerified] = React.useState(project.autoApproveVerified);
  const [profanityLevel, setProfanityLevel] = React.useState(project.profanityFilterLevel ?? "OFF");

  // Social
  const [websiteUrl, setWebsiteUrl] = React.useState(project.websiteUrl ?? "");
  const [socialLinks, setSocialLinks] = React.useState<Record<string, string>>(project.socialLinks ?? {});
  const [tags, setTags] = React.useState<string[]>(project.tags);

  // UI state
  const [saving, setSaving] = React.useState(false);
  const [slugConfirm, setSlugConfirm] = React.useState(false);
  const [pendingSlug, setPendingSlug] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<SectionId>("identity");

  // Dirty checks per section
  const identityDirty = name !== project.name || slug !== project.slug || description !== (project.description ?? "");
  const visibilityDirty =
    visibility !== project.visibility ||
    autoModeration !== project.autoModeration ||
    autoApproveVerified !== project.autoApproveVerified ||
    profanityLevel !== (project.profanityFilterLevel ?? "OFF");
  const socialDirty =
    websiteUrl !== (project.websiteUrl ?? "") ||
    JSON.stringify(socialLinks) !== JSON.stringify(project.socialLinks ?? {}) ||
    JSON.stringify(tags) !== JSON.stringify(project.tags);

  const anyDirty = identityDirty || visibilityDirty || socialDirty;

  // Scroll spy
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as SectionId);
          }
        }
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  function handleSlugChange(raw: string) {
    const kebab = raw.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
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
      const patch: ProjectPatch = {
        name: name.trim(),
        slug: newSlug ?? slug,
        description: description.trim() || undefined,
        visibility,
        autoModeration,
        autoApproveVerified,
        profanityFilterLevel: profanityLevel,
        websiteUrl: websiteUrl.trim() || undefined,
        socialLinks,
        tags,
      };
      await apiUpdateProject(project.slug, patch);
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

  function handleDelete() {
    setDeleteOpen(false);
    toast.success("Project deleted (mock — no actual deletion)");
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Settings"
        description={project.name}
      />

      {anyDirty && (
        <PageToolbar
          trailing={
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Unsaved changes</span>
              <Button variant="outline" size="sm" onClick={() => {
                setName(project.name);
                setSlug(project.slug);
                setDescription(project.description ?? "");
                setVisibility(project.visibility);
                setAutoModeration(project.autoModeration);
                setAutoApproveVerified(project.autoApproveVerified);
                setProfanityLevel(project.profanityFilterLevel ?? "OFF");
                setWebsiteUrl(project.websiteUrl ?? "");
                setSocialLinks(project.socialLinks ?? {});
                setTags(project.tags);
              }}>Discard</Button>
              <Button size="sm" disabled={saving} onClick={handleSave}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          }
        />
      )}

      <PageBody padding="bare" className="overflow-y-auto">
        <div className="flex gap-8 px-6 py-6">
          {/* Left sub-nav — lg+ only */}
          <nav className="hidden w-44 shrink-0 lg:block" aria-label="Settings sections">
            <div className="sticky top-6 space-y-0.5">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                    activeSection === id
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    id === "danger" && "mt-4 text-destructive hover:text-destructive",
                  )}
                >
                  <Icon className="size-3.5 shrink-0" weight={activeSection === id ? "bold" : "regular"} />
                  {label}
                </a>
              ))}
            </div>
          </nav>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-10 pb-20">
            {/* ── Identity ── */}
            <Section id="identity" title="Identity" description="Name and public identity of the project." dirty={identityDirty}>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="s-name">Project name</Label>
                    <span className="text-[11px] text-muted-foreground">{name.length}/60</span>
                  </div>
                  <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s-slug">Slug</Label>
                  <Input
                    id="s-slug"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="font-mono"
                    placeholder="my-project"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Used in URLs: <span className="font-mono">tresta.app/{slug}</span>. Changing the slug breaks existing links.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="s-desc">Description</Label>
                    <span className="text-[11px] text-muted-foreground">{description.length}/240</span>
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
            </Section>

            {/* ── Visibility + moderation ── */}
            <Section id="visibility" title="Visibility &amp; moderation" description="Control who can see submissions and how they're reviewed." dirty={visibilityDirty}>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <RadioGroup
                    value={visibility}
                    onValueChange={(v) => setVisibility(v as ProjectVisibility)}
                    className="space-y-2"
                  >
                    {(
                      [
                        { value: "PUBLIC", label: "Public", desc: "Anyone can view approved testimonials." },
                        { value: "PRIVATE", label: "Private", desc: "Only you can see this project." },
                        { value: "INVITE_ONLY", label: "Unlisted", desc: "Accessible by direct link only." },
                      ] as const
                    ).map(({ value, label, desc }) => (
                      <div key={value} className="flex items-start gap-3">
                        <RadioGroupItem value={value} id={`vis-${value}`} className="mt-0.5" />
                        <label htmlFor={`vis-${value}`} className="cursor-pointer space-y-0.5">
                          <span className="text-sm font-medium">{label}</span>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Auto-moderation</p>
                    <p className="text-xs text-muted-foreground">Filter submissions before they reach review.</p>
                  </div>
                  <Switch checked={autoModeration} onCheckedChange={setAutoModeration} />
                </div>

                <div className={cn("flex items-center justify-between gap-4 rounded-lg border border-border p-3", !autoModeration && "opacity-50")}>
                  <div>
                    <p className="text-sm font-medium">Auto-approve verified</p>
                    <p className="text-xs text-muted-foreground">Skip review for OAuth-verified submissions.</p>
                  </div>
                  <Switch
                    checked={autoApproveVerified}
                    onCheckedChange={setAutoApproveVerified}
                    disabled={!autoModeration}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Profanity filter</Label>
                  <Select value={profanityLevel} onValueChange={setProfanityLevel}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OFF">Off</SelectItem>
                      <SelectItem value="LENIENT">Light</SelectItem>
                      <SelectItem value="MODERATE">Moderate</SelectItem>
                      <SelectItem value="STRICT">Strict</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Section>

            {/* ── Social + website + tags ── */}
            <Section id="social" title="Social &amp; website" description="Links shown on your public project page." dirty={socialDirty}>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="s-website">Website</Label>
                  <div className="relative">
                    <GlobeIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="s-website"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Social links</Label>
                  <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />
                </div>

                <div className="space-y-1.5">
                  <Label>Tags</Label>
                  <TagInput
                    values={tags}
                    onChange={setTags}
                    suggestions={["saas", "startup", "b2b", "product", "portfolio", "agency", "open-source", "mobile"]}
                  />
                </div>
              </div>
            </Section>

            {/* ── Danger zone ── */}
            <Section id="danger" title="Danger zone" dirty={false}>
              <div className="rounded-lg border border-destructive/40 divide-y divide-destructive/20">
                {/* Transfer ownership (stub) */}
                <div className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-sm font-medium">Transfer ownership</p>
                    <p className="text-xs text-muted-foreground">Move this project to another workspace member.</p>
                  </div>
                  <Button variant="outline" size="sm" disabled title="Coming soon">Transfer</Button>
                </div>

                {/* Delete project */}
                <div className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-sm font-medium text-destructive">Delete project</p>
                    <p className="text-xs text-muted-foreground">
                      Permanently deletes the project, forms, widgets, and testimonials.
                    </p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                    Delete
                  </Button>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </PageBody>

      <SlugChangeDialog
        open={slugConfirm}
        oldSlug={project.slug}
        newSlug={pendingSlug ?? ""}
        onConfirm={handleSlugConfirm}
        onCancel={() => { setSlugConfirm(false); setPendingSlug(null); setSlug(project.slug); }}
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
