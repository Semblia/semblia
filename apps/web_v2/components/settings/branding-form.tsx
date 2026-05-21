"use client";

import * as React from "react";
import { toast } from "sonner";
import type { V2ProjectDTO } from "@workspace/types";
import { GlobeIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageBody, SettingsSection, SettingsFooter } from "@/components/shared";
import { useUpdateProject } from "@/hooks/api";
import { projectInitials } from "@/lib/format";
import { MediaUploader } from "@/components/media/media-uploader";
import { normalizeProject } from "./shared/normalize";

const HEX_RE = /^#([0-9a-fA-F]{3}){1,2}$/;

function isValidHexColor(value: string): boolean {
  return value === "" || HEX_RE.test(value.trim());
}

function ColorField({
  id,
  label,
  helper,
  value,
  onChange,
}: {
  id: string;
  label: string;
  helper?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = isValidHexColor(value);
  const safeColor = valid && value ? value : "#9ca3af";
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} color picker`}
          value={safeColor}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded-md border border-input bg-background"
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#FF6B35"
          className={cn(
            "h-8 max-w-[10rem] font-mono text-[13px]",
            !valid && "border-destructive/60 focus-visible:ring-destructive/30",
          )}
        />
        <span
          className="h-6 w-6 shrink-0 rounded-full border border-border"
          style={{ backgroundColor: safeColor }}
          aria-hidden
        />
      </div>
      {!valid && (
        <p className="text-[11px] text-destructive">
          Enter a 3- or 6-digit hex color (e.g. #FF6B35).
        </p>
      )}
      {valid && helper && (
        <p className="text-[11px] text-muted-foreground">{helper}</p>
      )}
    </div>
  );
}

export function BrandingForm({ project }: { project: V2ProjectDTO }) {
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

  const dirty =
    (logo?.id ?? null) !== (project.logo?.id ?? null) ||
    brandColorPrimary !== norm.brandColorPrimary ||
    brandColorSecondary !== norm.brandColorSecondary;

  const canSave =
    dirty &&
    isValidHexColor(brandColorPrimary) &&
    isValidHexColor(brandColorSecondary);

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await updateProject.mutateAsync({
        logoAssetId: logo?.id ?? null,
        brandColorPrimary: brandColorPrimary.trim() || null,
        brandColorSecondary: brandColorSecondary.trim() || null,
      });
      toast.success("Branding saved");
    } catch {
      toast.error("Failed to save branding");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    setLogo(project.logo);
    setBrandColorPrimary(norm.brandColorPrimary);
    setBrandColorSecondary(norm.brandColorSecondary);
  }

  const previewColor =
    isValidHexColor(brandColorPrimary) && brandColorPrimary
      ? brandColorPrimary
      : "var(--brand)";

  return (
    <>
      <PageBody padding="default">
        <div className="space-y-8 pb-8">
          <SettingsSection
            id="logo"
            title="Logo"
            description="Used in the sidebar, public collection page, and embedded widgets."
          >
            <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-2">
                <Label>Project logo</Label>
                <MediaUploader
                  purpose="PROJECT_LOGO"
                  projectSlug={project.slug}
                  value={logo}
                  onChange={setLogo}
                />
                <p className="text-[11px] text-muted-foreground">
                  PNG, JPG, WebP, or GIF. Square images render best.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                {logo?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logo.url}
                    alt=""
                    className="size-10 rounded-md object-cover"
                  />
                ) : (
                  <span
                    className="flex size-10 items-center justify-center rounded-md text-xs font-semibold text-white"
                    style={{ backgroundColor: previewColor }}
                    aria-hidden
                  >
                    {projectInitials(project.name)}
                  </span>
                )}
                <div className="text-[11px] leading-tight">
                  <p className="font-medium text-foreground">Live preview</p>
                  <p className="text-muted-foreground">Sidebar avatar render</p>
                </div>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="colors"
            title="Brand colors"
            description="Drives accents on hosted pages and embedded widget previews."
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <ColorField
                id="b-primary"
                label="Primary"
                value={brandColorPrimary}
                onChange={setBrandColorPrimary}
                helper="Buttons, links, focus rings."
              />
              <ColorField
                id="b-secondary"
                label="Secondary"
                value={brandColorSecondary}
                onChange={setBrandColorSecondary}
                helper="Subtle accents and dividers."
              />
            </div>
            <div
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
              role="group"
              aria-label="Color preview"
            >
              <span
                className="flex size-10 items-center justify-center rounded-md text-xs font-semibold text-white"
                style={{ backgroundColor: previewColor }}
                aria-hidden
              >
                {projectInitials(project.name)}
              </span>
              <div className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: previewColor }}
                >
                  Primary button
                </button>
                <span
                  className="rounded-md border px-2.5 py-1 text-xs font-medium"
                  style={{
                    borderColor:
                      isValidHexColor(brandColorSecondary) &&
                      brandColorSecondary
                        ? brandColorSecondary
                        : "var(--border)",
                    color:
                      isValidHexColor(brandColorSecondary) &&
                      brandColorSecondary
                        ? brandColorSecondary
                        : "var(--muted-foreground)",
                  }}
                >
                  Secondary chip
                </span>
                <GlobeIcon
                  className="ml-auto size-3.5 text-muted-foreground"
                  aria-hidden
                />
              </div>
            </div>
          </SettingsSection>
        </div>
      </PageBody>

      <SettingsFooter
        dirty={canSave}
        saving={saving}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </>
  );
}
