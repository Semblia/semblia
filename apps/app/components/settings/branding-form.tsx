"use client";

/**
 * BrandingForm — the logo and brand colours that drive every public surface.
 *
 * Three defects this pass removed:
 *   • the footer received `dirty={canSave}`, so typing an invalid hex hid both
 *     the "unsaved changes" indicator *and* Discard — the user was stranded
 *     with edits they could neither save nor undo. Dirtiness and validity are
 *     now separate facts, which is what `SettingsFooter.canSave` is for.
 *   • an invalid colour failed silently; the reason now renders under the field
 *   • the preview contained a real `<button>`, so a decorative sample sat in
 *     the tab order. The preview is inert markup now.
 *
 * The project arrives as a server-fetched prop, so there is no client query and
 * no query-error state to own here — the route's error boundary covers that.
 */

import * as React from "react";
import { toast } from "sonner";
import type { V2ProjectDTO } from "@workspace/types";
import { GlobeIcon } from "@phosphor-icons/react";
import { FieldError } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { ColorPicker, isValidHexColor } from "@/components/ui/color-picker";
import { PageBody, SettingsSection, SettingsFooter } from "@/components/shared";
import { useUpdateProject } from "@/hooks/api";
import { projectInitials } from "@/lib/format";
import { MediaUploader } from "@/components/media/media-uploader";
import {
  canManageProject,
  normalizeProject,
  READ_ONLY_REASON,
  type NormalizedProject,
} from "./shared/normalize";

const HEX_HINT = "Enter a hex colour such as #1F6FEB, or clear the field.";

interface BrandingDraft {
  logo: V2ProjectDTO["logo"];
  brandColorPrimary: string;
  brandColorSecondary: string;
}

function hexFieldError(value: string): string | null {
  return isValidHexColor(value) ? null : HEX_HINT;
}

// The preview falls back to the app's own tokens when a colour is unset or
// half-typed, so it never renders a broken swatch mid-edit.
function previewColor(value: string, fallback: string): string {
  return isValidHexColor(value) && value.trim() ? value.trim() : fallback;
}

function isBrandingDirty(
  draft: BrandingDraft,
  project: V2ProjectDTO,
  norm: NormalizedProject,
): boolean {
  return (
    (draft.logo?.id ?? null) !== (project.logo?.id ?? null) ||
    draft.brandColorPrimary !== norm.brandColorPrimary ||
    draft.brandColorSecondary !== norm.brandColorSecondary
  );
}

function brandingPayload(draft: BrandingDraft) {
  return {
    logoAssetId: draft.logo?.id ?? null,
    brandColorPrimary: draft.brandColorPrimary.trim() || null,
    brandColorSecondary: draft.brandColorSecondary.trim() || null,
  };
}

/* One tint step, no border: a second bordered box inside the section card is
   the cards-on-cards defect. */
function SidebarAvatarPreview({
  logo,
  fallbackColor,
  name,
}: {
  logo: V2ProjectDTO["logo"];
  fallbackColor: string;
  name: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
      {logo?.url ? (
        // Brand marks are never cover-cropped.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo.url}
          alt=""
          className="size-10 rounded-md object-contain"
        />
      ) : (
        <span
          className="flex size-10 items-center justify-center rounded-md text-xs font-semibold text-white"
          style={{ backgroundColor: fallbackColor }}
          aria-hidden
        >
          {projectInitials(name)}
        </span>
      )}
      <div className="text-xs leading-tight">
        <p className="font-medium text-foreground">Live preview</p>
        <p className="text-muted-foreground">Sidebar avatar</p>
      </div>
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  hint: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <ColorPicker id={id} label={label} value={value} onChange={onChange} />
      {error ? (
        <FieldError className="text-xs">{error}</FieldError>
      ) : (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

/* Decorative sample of the public surface. `inert` keeps every descendant out
   of the tab order and the accessibility tree — `aria-hidden` alone would
   leave focusable children reachable. */
function BrandSamplePreview({
  name,
  primary,
  secondary,
}: {
  name: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div
      inert
      aria-hidden
      className="flex items-center gap-3 rounded-lg bg-muted/40 p-4"
    >
      <span
        className="flex size-10 items-center justify-center rounded-md text-xs font-semibold text-white"
        style={{ backgroundColor: primary }}
      >
        {projectInitials(name)}
      </span>
      <div className="flex flex-1 items-center gap-2">
        <span
          className="rounded-md px-2.5 py-1 text-xs font-medium text-white"
          style={{ backgroundColor: primary }}
        >
          Primary button
        </span>
        <span
          className="rounded-md border px-2.5 py-1 text-xs font-medium"
          style={{
            borderColor: secondary,
            color: secondary,
          }}
        >
          Secondary chip
        </span>
        <GlobeIcon className="ml-auto size-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}

/* Draft state, validation, and the save/discard lifecycle — everything about
   the branding edit that isn't markup. */
function useBrandingDraft(project: V2ProjectDTO) {
  const norm = React.useMemo(() => normalizeProject(project), [project]);

  const [logo, setLogo] = React.useState(project.logo);
  const [brandColorPrimary, setBrandColorPrimary] = React.useState(
    norm.brandColorPrimary,
  );
  const [brandColorSecondary, setBrandColorSecondary] = React.useState(
    norm.brandColorSecondary,
  );

  const updateProject = useUpdateProject(project.slug);
  const [saving, setSaving] = React.useState(false);

  const draft: BrandingDraft = { logo, brandColorPrimary, brandColorSecondary };
  const dirty = isBrandingDirty(draft, project, norm);

  const primaryError = hexFieldError(brandColorPrimary);
  const secondaryError = hexFieldError(brandColorSecondary);
  const canSave = dirty && !primaryError && !secondaryError;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await updateProject.mutateAsync(brandingPayload(draft));
      toast.success("Branding saved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't save branding",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    setLogo(project.logo);
    setBrandColorPrimary(norm.brandColorPrimary);
    setBrandColorSecondary(norm.brandColorSecondary);
  }

  return {
    logo,
    setLogo,
    brandColorPrimary,
    setBrandColorPrimary,
    brandColorSecondary,
    setBrandColorSecondary,
    dirty,
    canSave,
    primaryError,
    secondaryError,
    saving,
    handleSave,
    handleDiscard,
  };
}

export function BrandingForm({ project }: { project: V2ProjectDTO }) {
  const canManage = canManageProject(project);
  // Each gated section carries its own reason — a footer on the card above is
  // out of sight by the time the next one is on screen.
  const readOnlyFooter = canManage ? undefined : READ_ONLY_REASON;

  const form = useBrandingDraft(project);

  const primaryPreview = previewColor(form.brandColorPrimary, "var(--brand)");
  const secondaryPreview = previewColor(
    form.brandColorSecondary,
    "var(--muted-foreground)",
  );

  return (
    <>
      <PageBody padding="bare">
        <div className="pb-8">
          <SettingsSection
            id="logo"
            title="Logo"
            description="Shown in the sidebar, on your public collection page, and in embedded widgets. Square images render best."
            footer={readOnlyFooter}
          >
            <fieldset
              disabled={!canManage}
              className="grid min-w-0 gap-6 sm:grid-cols-[minmax(0,1fr)_15rem] sm:items-start"
            >
              <div className="space-y-2">
                <MediaUploader
                  purpose="PROJECT_LOGO"
                  projectSlug={project.slug}
                  value={form.logo}
                  onChange={form.setLogo}
                />
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WebP, or GIF · up to 5 MB.
                </p>
              </div>

              <SidebarAvatarPreview
                logo={form.logo}
                fallbackColor={primaryPreview}
                name={project.name}
              />
            </fieldset>
          </SettingsSection>

          <SettingsSection
            id="colors"
            title="Brand colours"
            description="Drive accents on your hosted collection page and embedded widget previews."
            footer={readOnlyFooter}
          >
            <fieldset disabled={!canManage} className="min-w-0 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <ColorField
                  id="b-primary"
                  label="Primary"
                  value={form.brandColorPrimary}
                  onChange={form.setBrandColorPrimary}
                  error={form.primaryError}
                  hint="Buttons, links, and focus rings."
                />
                <ColorField
                  id="b-secondary"
                  label="Secondary"
                  value={form.brandColorSecondary}
                  onChange={form.setBrandColorSecondary}
                  error={form.secondaryError}
                  hint="Subtle accents and dividers."
                />
              </div>

              <BrandSamplePreview
                name={project.name}
                primary={primaryPreview}
                secondary={secondaryPreview}
              />
            </fieldset>
          </SettingsSection>
        </div>
      </PageBody>

      {/* No save bar for a role that can't save: the fieldset keeps everything
          clean, so the bar could only ever render inert. */}
      {canManage && (
        <SettingsFooter
          dirty={form.dirty}
          canSave={form.canSave}
          saving={form.saving}
          onSave={form.handleSave}
          onDiscard={form.handleDiscard}
        />
      )}
    </>
  );
}
