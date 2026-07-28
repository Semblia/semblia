"use client";

/**
 * GeneralForm — the project's identity and classification.
 *
 * Restructured onto the shared system:
 *   • `SettingsSection` *is* the card, so nothing inside it draws a second
 *     border; grouping is stack gap and the section's own header band
 *   • every write here is guarded by MANAGE_PROJECT, so a view-only role gets
 *     inert fields and the reason in the section footer instead of a Save that
 *     returns 403
 *   • name and slug are validated against the API's own schemas before Save is
 *     offered, with the reason under the field — the slug in particular is both
 *     a DNS label and a dashboard route segment, and "Failed to save settings"
 *     told the user nothing about which rule they broke
 *
 * The project itself is server-fetched by the route and handed down as a prop,
 * so this surface owns no client query and therefore no query-error state; a
 * failure to load the project is caught by the route's error boundary.
 */

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { V2ProjectDTO, V2ProjectType } from "@workspace/types";
import { FieldError } from "@/components/ui/field";
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
import { PROJECT_TYPE_LABELS, humanizeLabel } from "@/lib/format";
import { settingsPath } from "@/lib/routes";
import {
  canManageProject,
  normalizeProject,
  validateProjectName,
  validateProjectSlug,
  PROJECT_NAME_MAX,
  READ_ONLY_REASON,
} from "./shared/normalize";
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

const SHORT_DESCRIPTION_MAX = 120;
const DESCRIPTION_MAX = 480;

export function GeneralForm({ project }: { project: V2ProjectDTO }) {
  const norm = React.useMemo(() => normalizeProject(project), [project]);
  const router = useRouter();
  const canManage = canManageProject(project);

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

  const nameError = validateProjectName(name);
  const slugError = validateProjectSlug(slug);

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
        router.replace(settingsPath(nextSlug));
      }
    } catch (err) {
      // Surface the API's own message — a slug collision and a network fault
      // need different responses from the user.
      toast.error(
        err instanceof Error ? err.message : "Couldn't save general settings",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    if (nameError || slugError) return;
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
      <PageBody measure padding="default">
        <div className="space-y-8 pb-8">
          <SettingsSection
            id="identity"
            title="Identity"
            description="The public name, URL slug, and elevator pitch for this project."
            footer={canManage ? undefined : READ_ONLY_REASON}
          >
            {/* A native disabled fieldset makes every descendant control inert
                in one step — no per-input prop threading, and nothing becomes
                dirty, so the save bar stays inactive on its own. */}
            <fieldset disabled={!canManage} className="min-w-0 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="g-name">Project name</Label>
                  <CharacterCount value={name.length} max={PROJECT_NAME_MAX} />
                </div>
                <Input
                  id="g-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={PROJECT_NAME_MAX}
                  aria-required="true"
                  aria-invalid={nameError ? true : undefined}
                  aria-describedby={nameError ? "g-name-error" : undefined}
                />
                {nameError && (
                  <FieldError id="g-name-error" className="text-xs">
                    {nameError}
                  </FieldError>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="g-slug">Slug</Label>
                <Input
                  id="g-slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="font-mono"
                  placeholder="my-project"
                  aria-invalid={slugError ? true : undefined}
                  aria-describedby={slugError ? "g-slug-error" : "g-slug-help"}
                />
                {slugError ? (
                  <FieldError id="g-slug-error" className="text-xs">
                    {slugError}
                  </FieldError>
                ) : (
                  <p
                    id="g-slug-help"
                    className="text-xs leading-relaxed text-muted-foreground"
                  >
                    Used in URLs:{" "}
                    <span className="font-mono">semblia.com/{slug}</span>.
                    Changing it breaks existing links.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="g-short">Short description</Label>
                  <CharacterCount
                    value={shortDescription.length}
                    max={SHORT_DESCRIPTION_MAX}
                  />
                </div>
                <Input
                  id="g-short"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  maxLength={SHORT_DESCRIPTION_MAX}
                  placeholder="One-line summary shown in lists and previews"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="g-desc">Description</Label>
                  <CharacterCount
                    value={description.length}
                    max={DESCRIPTION_MAX}
                  />
                </div>
                <Textarea
                  id="g-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={DESCRIPTION_MAX}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </fieldset>
          </SettingsSection>

          <SettingsSection
            id="classification"
            title="Classification"
            description="How this project is categorized internally and surfaced in filters."
            // Every gated section states its own reason: sections are separate
            // cards, and a user scrolled to this one can't see a footer on the
            // one above it.
            footer={canManage ? undefined : READ_ONLY_REASON}
          >
            <fieldset disabled={!canManage} className="min-w-0 space-y-5">
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
                        {/* A type the label map hasn't caught up with still
                            reads as words, never as its raw enum. */}
                        {PROJECT_TYPE_LABELS[key] ??
                          humanizeLabel(key.toLowerCase())}
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
                <p className="text-xs text-muted-foreground">
                  Internal tags for filtering. Not shown publicly.
                </p>
              </div>
            </fieldset>
          </SettingsSection>
        </div>
      </PageBody>

      {/* Save is offered only for a value the API will accept — an invalid name
          or slug keeps the bar visible (so Discard still works) but the primary
          action inert. A view-only role gets no bar at all: nothing here can go
          dirty, so a permanently dead Save/Discard pair would be chrome
          pretending to be a control. */}
      {canManage && (
        <SettingsFooter
          dirty={dirty}
          canSave={dirty && !nameError && !slugError}
          saving={saving}
          onSave={handleSave}
          onDiscard={handleDiscard}
        />
      )}

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

/** Counters are metadata, one type step below the label, always tabular. */
function CharacterCount({ value, max }: { value: number; max: number }) {
  return (
    <span
      className="shrink-0 text-xs tabular-nums text-muted-foreground"
      aria-label={`${value} of ${max} characters used`}
    >
      {value}/{max}
    </span>
  );
}
