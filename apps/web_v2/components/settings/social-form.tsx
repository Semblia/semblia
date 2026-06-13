"use client";

import * as React from "react";
import { toast } from "sonner";
import type { V2ProjectDTO } from "@workspace/types";
import { GlobeIcon } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageBody, SettingsSection, SettingsFooter } from "@/components/shared";
import { useUpdateProject } from "@/hooks/api";
import {
  normalizeProject,
  socialLinksToRecord,
  type SocialLinks,
} from "./shared/normalize";
import { SocialLinksEditor } from "./shared/social-links-editor";

export function SocialForm({ project }: { project: V2ProjectDTO }) {
  const norm = React.useMemo(() => normalizeProject(project), [project]);

  const [websiteUrl, setWebsiteUrl] = React.useState(norm.websiteUrl);
  const [socialLinks, setSocialLinks] = React.useState<SocialLinks>(
    norm.socialLinks,
  );

  const updateProject = useUpdateProject(project.slug);
  const [saving, setSaving] = React.useState(false);

  const dirty =
    websiteUrl !== norm.websiteUrl ||
    JSON.stringify(socialLinks) !== JSON.stringify(norm.socialLinks);

  const websiteValid = (() => {
    if (!websiteUrl) return true;
    try {
      const u = new URL(websiteUrl);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  })();

  async function handleSave() {
    if (!websiteValid) return;
    setSaving(true);
    try {
      await updateProject.mutateAsync({
        websiteUrl: websiteUrl.trim() || null,
        socialLinks: socialLinksToRecord(socialLinks),
      });
      toast.success("Social settings saved");
    } catch {
      toast.error("Failed to save social settings");
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
      <PageBody contained padding="default">
        <div className="space-y-8 pb-8">
          <SettingsSection
            id="website"
            title="Website"
            description="The canonical URL for the project — shown on the public testimonial page."
          >
            <div className="space-y-2">
              <Label htmlFor="s-website">Website URL</Label>
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
              {!websiteValid && (
                <p className="text-[11px] text-destructive">
                  Enter a valid http(s) URL or leave blank.
                </p>
              )}
            </div>
          </SettingsSection>

          <SettingsSection
            id="links"
            title="Social links"
            description="Linked profiles surface as icons on the project's public page."
          >
            <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />
          </SettingsSection>
        </div>
      </PageBody>

      <SettingsFooter
        dirty={dirty && websiteValid}
        saving={saving}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </>
  );
}
