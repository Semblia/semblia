"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { V2ProjectDTO, V2ProjectType } from "@workspace/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageBody, SettingsSection, SettingsFooter } from "@/components/shared";
import { useUpdateProject } from "@/hooks/api";
import { PROJECT_TYPE_LABELS } from "@/lib/format";
import { normalizeProject } from "./shared/normalize";
import { SlugChangeDialog } from "./shared/slug-change-dialog";
import { TagInput } from "./shared/tag-input";

const PROJECT_TYPE_KEYS: V2ProjectType[] = [
  "SAAS_APP",
  "PORTFOLIO",
  "MOBILE_APP",
  "CONSULTING_SERVICE",
  "E_COMMERCE",
  "AGENCY",
  "FREELANCE",
  "PRODUCT",
  "COURSE",
  "COMMUNITY",
  "OTHER",
];

const SUGGESTED_TAGS = [
  "saas",
  "startup",
  "b2b",
  "product",
  "portfolio",
  "agency",
  "open-source",
  "mobile",
];

export function GeneralForm({ project }: { project: V2ProjectDTO }) {
  const norm = React.useMemo(() => normalizeProject(project), [project]);
  const router = useRouter();

  const [name, setName] = React.useState(norm.name);
  const [slug, setSlug] = React.useState(norm.slug);
  const [shortDescription, setShortDescription] = React.useState(
    norm.shortDescription,
  );
  const [description, setDescription] = React.useState(norm.description);
  const [projectType, setProjectType] = React.useState<V2ProjectType | null>(
    norm.projectType,
  );
  const [tags, setTags] = React.useState<string[]>(norm.tags);

  const updateProject = useUpdateProject(project.slug);
  const [saving, setSaving] = React.useState(false);
  const [slugConfirm, setSlugConfirm] = React.useState(false);
  const [pendingSlug, setPendingSlug] = React.useState<string | null>(null);

  const dirty =
    name !== norm.name ||
    slug !== norm.slug ||
    shortDescription !== norm.shortDescription ||
    description !== norm.description ||
    projectType !== norm.projectType ||
    JSON.stringify(tags) !== JSON.stringify(norm.tags);

  function handleSlugChange(raw: string) {
    const kebab = raw
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-");
    setSlug(kebab);
  }

  async function doSave(nextSlug?: string) {
    setSaving(true);
    try {
      await updateProject.mutateAsync({
        name: name.trim(),
        slug: nextSlug ?? slug,
        shortDescription: shortDescription.trim() || null,
        description: description.trim() || null,
        projectType,
        tags,
      });
      toast.success("General settings saved");
      if (nextSlug && nextSlug !== project.slug) {
        router.replace(`/projects/${nextSlug}/settings`);
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    if (slug !== project.slug) {
      setPendingSlug(slug);
      setSlugConfirm(true);
      return;
    }
    void doSave();
  }

  function handleDiscard() {
    setName(norm.name);
    setSlug(norm.slug);
    setShortDescription(norm.shortDescription);
    setDescription(norm.description);
    setProjectType(norm.projectType);
    setTags([...norm.tags]);
  }

  function handleSlugConfirm() {
    setSlugConfirm(false);
    if (pendingSlug) {
      void doSave(pendingSlug);
      setPendingSlug(null);
    }
  }

  return (
    <>
      <PageBody padding="default">
        <div className="space-y-8 pb-8">
          <SettingsSection
            id="identity"
            title="Identity"
            description="The public name, URL slug, and elevator pitch for this project."
          >
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="g-name">Project name</Label>
                  <span
                    className="text-[11px] tabular-nums text-muted-foreground"
                    aria-label={`${name.length} of 60 characters used`}
                  >
                    {name.length}/60
                  </span>
                </div>
                <Input
                  id="g-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  aria-required="true"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="g-slug">Slug</Label>
                <Input
                  id="g-slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="font-mono"
                  placeholder="my-project"
                  aria-describedby="g-slug-help"
                />
                <p
                  id="g-slug-help"
                  className="text-[11px] leading-relaxed text-muted-foreground"
                >
                  Used in URLs:{" "}
                  <span className="font-mono">semblia.com/{slug}</span>.
                  Changing it breaks existing links.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="g-short">Short description</Label>
                  <span
                    className="text-[11px] tabular-nums text-muted-foreground"
                    aria-label={`${shortDescription.length} of 120 characters used`}
                  >
                    {shortDescription.length}/120
                  </span>
                </div>
                <Input
                  id="g-short"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  maxLength={120}
                  placeholder="One-line summary shown in lists and previews"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="g-desc">Description</Label>
                  <span
                    className="text-[11px] tabular-nums text-muted-foreground"
                    aria-label={`${description.length} of 480 characters used`}
                  >
                    {description.length}/480
                  </span>
                </div>
                <Textarea
                  id="g-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={480}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="classification"
            title="Classification"
            description="How this project is categorized internally and surfaced in filters."
          >
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="g-type">Project type</Label>
                <Select
                  value={projectType ?? "OTHER"}
                  onValueChange={(v) => setProjectType(v as V2ProjectType)}
                >
                  <SelectTrigger id="g-type" className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPE_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>
                        {PROJECT_TYPE_LABELS[key] ?? key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <TagInput
                  values={tags}
                  onChange={setTags}
                  suggestions={SUGGESTED_TAGS}
                />
                <p className="text-[11px] text-muted-foreground">
                  Internal tags for filtering. Not shown publicly.
                </p>
              </div>
            </div>
          </SettingsSection>
        </div>
      </PageBody>

      <SettingsFooter
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />

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
    </>
  );
}
