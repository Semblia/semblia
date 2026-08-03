"use client";

/**
 * SocialForm — the website and profile links shown on the public project page.
 *
 * The defect this pass fixes: Save was gated on the website URL alone, so a
 * malformed LinkedIn or custom-platform URL still offered a Save that the
 * project PATCH rejects. Validity is now the union of every field's own rule —
 * the same rules the fields display — and the blocked reason is stated in the
 * section footer rather than left to a red toast after the click.
 *
 * The project arrives as a server-fetched prop, so this surface owns no client
 * query and therefore no query-error state; the route's error boundary covers
 * a failure to load the project itself.
 */

import * as React from "react";
import { toast } from "sonner";
import type { V2ProjectDTO } from "@workspace/types";
import { GlobeIcon } from "@phosphor-icons/react";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageBody, SettingsSection, SettingsFooter } from "@/components/shared";
import { useUpdateProject } from "@/hooks/api";
import {
  canManageProject,
  normalizeProject,
  socialLinksToRecord,
  validateWebsiteUrl,
  READ_ONLY_REASON,
  type SocialLinks,
} from "./shared/normalize";
import {
  SocialLinksEditor,
  collectSocialLinkErrors,
} from "./shared/social-links-editor";

/* One note per concept, in priority order: a role that can't write at all is
   told that first; otherwise the footer names what is blocking Save instead of
   leaving the user to hunt for the red field. Without the first guard the
   whole links card renders inert with no reason anywhere inside it. */
function linksSectionFooter(
  canManage: boolean,
  linkErrors: string[],
): string | undefined {
  if (!canManage) return READ_ONLY_REASON;
  if (linkErrors.length === 0) return undefined;
  if (linkErrors.length === 1) {
    return `Fix this link before saving — ${linkErrors[0]}.`;
  }
  // Naming the count but only one error left the other fields to be hunted for.
  return `Fix these ${linkErrors.length} links before saving — ${linkErrors.join("; ")}.`;
}

function socialPayload(websiteUrl: string, socialLinks: SocialLinks) {
  return {
    websiteUrl: websiteUrl.trim() || null,
    socialLinks: socialLinksToRecord(socialLinks),
  };
}

function WebsiteUrlField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}) {
  return (
    <>
      <Label htmlFor="s-website">Website URL</Label>
      <div className="relative">
        <GlobeIcon
          className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="s-website"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com"
          className="pl-8"
          type="url"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "s-website-error" : undefined}
        />
      </div>
      {error && (
        <FieldError id="s-website-error" className="text-xs">
          {error}
        </FieldError>
      )}
    </>
  );
}

export function SocialForm({ project }: { project: V2ProjectDTO }) {
  const norm = React.useMemo(() => normalizeProject(project), [project]);
  const canManage = canManageProject(project);
  const readOnlyFooter = canManage ? undefined : READ_ONLY_REASON;

  const [websiteUrl, setWebsiteUrl] = React.useState(norm.websiteUrl);
  const [socialLinks, setSocialLinks] = React.useState<SocialLinks>(
    norm.socialLinks,
  );

  const updateProject = useUpdateProject(project.slug);
  const [saving, setSaving] = React.useState(false);

  const dirty =
    websiteUrl !== norm.websiteUrl ||
    JSON.stringify(socialLinks) !== JSON.stringify(norm.socialLinks);

  const websiteError = validateWebsiteUrl(websiteUrl);
  const linkErrors = React.useMemo(
    () => collectSocialLinkErrors(socialLinks),
    [socialLinks],
  );
  const canSave = dirty && !websiteError && linkErrors.length === 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await updateProject.mutateAsync(socialPayload(websiteUrl, socialLinks));
      toast.success("Social settings saved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't save social settings",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    setWebsiteUrl(norm.websiteUrl);
    setSocialLinks(norm.socialLinks);
  }

  return (
    <>
      <PageBody padding="bare">
        <div className="pb-8">
          <SettingsSection
            id="website"
            title="Website"
            description="The canonical URL for the project — shown on the public testimonial page."
            footer={readOnlyFooter}
          >
            <fieldset disabled={!canManage} className="min-w-0 space-y-2">
              <WebsiteUrlField
                value={websiteUrl}
                onChange={setWebsiteUrl}
                error={websiteError}
              />
            </fieldset>
          </SettingsSection>

          <SettingsSection
            id="links"
            title="Social links"
            description="Linked profiles surface as icons on the project's public page."
            footer={linksSectionFooter(canManage, linkErrors)}
          >
            <fieldset disabled={!canManage} className="min-w-0">
              <SocialLinksEditor
                value={socialLinks}
                onChange={setSocialLinks}
              />
            </fieldset>
          </SettingsSection>
        </div>
      </PageBody>

      {/* A view-only role can't dirty a disabled fieldset, so the bar would be
          permanently inert chrome. */}
      {canManage && (
        <SettingsFooter
          dirty={dirty}
          canSave={canSave}
          saving={saving}
          onSave={handleSave}
          onDiscard={handleDiscard}
        />
      )}
    </>
  );
}
