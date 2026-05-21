"use client";

import * as React from "react";
import { toast } from "sonner";
import type {
  V2AccountBrandDefaultsDTO,
  V2AccountDefaultsDTO,
  V2AccountModerationDefaultsDTO,
  V2AccountVisibilityAccessDefaultsDTO,
  V2FormConfigDTO,
  V2ProjectVisibility,
  V2UpdateAccountDefaultsBody,
} from "@workspace/types";
import {
  ItemRow,
  PageBody,
  PageHeader,
  SettingsFooter,
  SettingsSection,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { DEFAULT_CONFIG } from "@/lib/collect/types";
import { useAccountDefaults, useUpdateAccountDefaults } from "@/hooks/api";

const HEX_RE = /^#([0-9a-fA-F]{3}){1,2}$/;

const DEFAULT_MODERATION: V2AccountModerationDefaultsDTO = {
  autoModeration: true,
  autoApproveVerified: false,
  profanityFilterLevel: "MODERATE",
};

const DEFAULT_VISIBILITY: V2AccountVisibilityAccessDefaultsDTO = {
  visibility: "PRIVATE",
  isActive: true,
};

const DEFAULT_BRAND: V2AccountBrandDefaultsDTO = {
  brandColorPrimary: null,
  brandColorSecondary: null,
  logoUrl: null,
};

const VISIBILITY_OPTIONS: Array<{
  value: V2ProjectVisibility;
  label: string;
  desc: string;
}> = [
  {
    value: "PUBLIC",
    label: "Public",
    desc: "New projects can publish approved testimonials publicly.",
  },
  {
    value: "PRIVATE",
    label: "Private",
    desc: "New projects start visible only to project members.",
  },
  {
    value: "INVITE_ONLY",
    label: "Unlisted",
    desc: "New projects are reachable by direct link only.",
  },
];

type HydratedAccountDefaults = {
  form: V2FormConfigDTO;
  moderation: V2AccountModerationDefaultsDTO;
  visibilityAccess: V2AccountVisibilityAccessDefaultsDTO;
  brand: V2AccountBrandDefaultsDTO;
};

function cloneFormConfig(): V2FormConfigDTO {
  return structuredClone(DEFAULT_CONFIG) as V2FormConfigDTO;
}

function normalizeDefaults(
  defaults: V2AccountDefaultsDTO | undefined,
): HydratedAccountDefaults {
  return {
    form: defaults?.form ?? cloneFormConfig(),
    moderation: defaults?.moderation ?? DEFAULT_MODERATION,
    visibilityAccess: defaults?.visibilityAccess ?? DEFAULT_VISIBILITY,
    brand: defaults?.brand ?? DEFAULT_BRAND,
  };
}

function isValidHex(value: string) {
  return value === "" || HEX_RE.test(value.trim());
}

function ToggleControl({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <Switch
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label={label}
    />
  );
}

function RowTitle({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm font-medium text-foreground">{children}</span>
  );
}

function RowSubtitle({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-muted-foreground">{children}</span>;
}

export default function DefaultsPage() {
  const defaultsQuery = useAccountDefaults();
  const updateDefaults = useUpdateAccountDefaults();
  const hydrated = React.useMemo(
    () => normalizeDefaults(defaultsQuery.data),
    [defaultsQuery.data],
  );

  const [form, setForm] = React.useState<V2FormConfigDTO>(() => hydrated.form);
  const [moderation, setModeration] =
    React.useState<V2AccountModerationDefaultsDTO>(() => hydrated.moderation);
  const [visibilityAccess, setVisibilityAccess] =
    React.useState<V2AccountVisibilityAccessDefaultsDTO>(
      () => hydrated.visibilityAccess,
    );
  const [brand, setBrand] = React.useState<V2AccountBrandDefaultsDTO>(
    () => hydrated.brand,
  );

  React.useEffect(() => {
    if (!defaultsQuery.data) return;
    const next = normalizeDefaults(defaultsQuery.data);
    setForm(next.form);
    setModeration(next.moderation);
    setVisibilityAccess(next.visibilityAccess);
    setBrand(next.brand);
  }, [defaultsQuery.data]);

  const dirty =
    JSON.stringify({ form, moderation, visibilityAccess, brand }) !==
    JSON.stringify(hydrated);

  const logoUrlValid = (() => {
    if (!brand.logoUrl) return true;
    try {
      const url = new URL(brand.logoUrl);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  })();

  const colorValid =
    isValidHex(brand.brandColorPrimary ?? "") &&
    isValidHex(brand.brandColorSecondary ?? "") &&
    isValidHex(form.branding.colors.primary) &&
    isValidHex(form.branding.colors.background) &&
    isValidHex(form.branding.colors.foreground) &&
    isValidHex(form.branding.colors.accent);

  const canSave = dirty && logoUrlValid && colorValid;

  function updateForm(patch: V2UpdateAccountDefaultsBody["form"]) {
    setForm(
      (current) =>
        ({
          ...current,
          ...patch,
          content: { ...current.content, ...patch?.content },
          fields: {
            ...current.fields,
            email: { ...current.fields.email, ...patch?.fields?.email },
            rating: { ...current.fields.rating, ...patch?.fields?.rating },
            jobTitle: {
              ...current.fields.jobTitle,
              ...patch?.fields?.jobTitle,
            },
            company: { ...current.fields.company, ...patch?.fields?.company },
            avatar: { ...current.fields.avatar, ...patch?.fields?.avatar },
            videoUrl: {
              ...current.fields.videoUrl,
              ...patch?.fields?.videoUrl,
            },
            consent: { ...current.fields.consent, ...patch?.fields?.consent },
          },
          branding: {
            ...current.branding,
            ...patch?.branding,
            colors: { ...current.branding.colors, ...patch?.branding?.colors },
          },
          behavior: { ...current.behavior, ...patch?.behavior },
          watermark: { ...current.watermark, ...patch?.watermark },
          delivery: { ...current.delivery, ...patch?.delivery },
        }) as V2FormConfigDTO,
    );
  }

  function discard() {
    setForm(hydrated.form);
    setModeration(hydrated.moderation);
    setVisibilityAccess(hydrated.visibilityAccess);
    setBrand(hydrated.brand);
  }

  async function save() {
    if (!canSave) return;
    try {
      await updateDefaults.mutateAsync({
        form,
        moderation,
        visibilityAccess,
        brand: {
          brandColorPrimary: brand.brandColorPrimary?.trim() || null,
          brandColorSecondary: brand.brandColorSecondary?.trim() || null,
          logoUrl: brand.logoUrl?.trim() || null,
        },
      });
      toast.success("Account defaults saved");
    } catch {
      toast.error("Failed to save account defaults");
    }
  }

  if (defaultsQuery.isLoading) {
    return (
      <>
        <PageHeader
          title="Defaults"
          description="Set default preferences applied to new projects."
        />
        <PageBody padding="default" className="space-y-8">
          {Array.from({ length: 4 }, (_, index) => (
            <SettingsSection
              key={index}
              id={`loading-${index}`}
              title="Loading defaults"
              description="Fetching your saved account defaults."
            >
              <Skeleton className="h-28 rounded-lg" />
            </SettingsSection>
          ))}
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Defaults"
        description="Set default preferences applied to new projects."
      />

      <PageBody padding="default" withFooter className="space-y-8">
        <SettingsSection
          id="brand"
          title="Brand"
          description="Applied to newly created projects and hosted collection pages."
          staggerIndex={0}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="default-logo">Default logo URL</Label>
              <Input
                id="default-logo"
                value={brand.logoUrl ?? ""}
                onChange={(event) =>
                  setBrand((current) => ({
                    ...current,
                    logoUrl: event.target.value,
                  }))
                }
                placeholder="https://cdn.example.com/logo.png"
                className={cn(
                  !logoUrlValid &&
                    "border-destructive/60 focus-visible:ring-destructive/30",
                )}
              />
              {!logoUrlValid && (
                <p className="text-[11px] text-destructive">
                  Enter a valid http(s) URL or leave blank.
                </p>
              )}
            </div>
            <ColorInput
              id="brand-primary"
              label="Primary"
              value={brand.brandColorPrimary ?? ""}
              onChange={(value) =>
                setBrand((current) => ({
                  ...current,
                  brandColorPrimary: value,
                }))
              }
            />
            <ColorInput
              id="brand-secondary"
              label="Secondary"
              value={brand.brandColorSecondary ?? ""}
              onChange={(value) =>
                setBrand((current) => ({
                  ...current,
                  brandColorSecondary: value,
                }))
              }
            />
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setBrand({
                    brandColorPrimary: null,
                    brandColorSecondary: null,
                    logoUrl: null,
                  })
                }
              >
                Clear brand
              </Button>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          id="form"
          title="Form"
          description="Content, fields, styling, behavior, watermark, and delivery defaults."
          staggerIndex={1}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="form-title">Header title</Label>
              <Input
                id="form-title"
                value={form.content.headerTitle}
                onChange={(event) =>
                  updateForm({
                    content: { headerTitle: event.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-submit">Submit button</Label>
              <Input
                id="form-submit"
                value={form.content.submitButtonLabel}
                onChange={(event) =>
                  updateForm({
                    content: { submitButtonLabel: event.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="form-description">Header description</Label>
              <Textarea
                id="form-description"
                value={form.content.headerDescription}
                onChange={(event) =>
                  updateForm({
                    content: { headerDescription: event.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-thanks-title">Thank-you title</Label>
              <Input
                id="form-thanks-title"
                value={form.content.thankYouTitle}
                onChange={(event) =>
                  updateForm({
                    content: { thankYouTitle: event.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-thanks-message">Thank-you message</Label>
              <Input
                id="form-thanks-message"
                value={form.content.thankYouMessage}
                onChange={(event) =>
                  updateForm({
                    content: { thankYouMessage: event.target.value },
                  })
                }
              />
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border border-border">
            <div className="divide-y divide-border">
              <ItemRow
                padding="dense"
                title={<RowTitle>Email field</RowTitle>}
                subtitle={<RowSubtitle>Collect an email address.</RowSubtitle>}
                trailing={
                  <ToggleControl
                    label="Enable email field"
                    checked={form.fields.email.enabled}
                    onChange={(checked) =>
                      updateForm({ fields: { email: { enabled: checked } } })
                    }
                  />
                }
              />
              <ItemRow
                padding="dense"
                title={<RowTitle>Rating field</RowTitle>}
                subtitle={<RowSubtitle>Ask for a numeric rating.</RowSubtitle>}
                trailing={
                  <ToggleControl
                    label="Enable rating field"
                    checked={form.fields.rating.enabled}
                    onChange={(checked) =>
                      updateForm({ fields: { rating: { enabled: checked } } })
                    }
                  />
                }
              />
              <ItemRow
                padding="dense"
                title={<RowTitle>Consent field</RowTitle>}
                subtitle={<RowSubtitle>Include consent language.</RowSubtitle>}
                trailing={
                  <ToggleControl
                    label="Enable consent field"
                    checked={form.fields.consent.enabled}
                    onChange={(checked) =>
                      updateForm({ fields: { consent: { enabled: checked } } })
                    }
                  />
                }
              />
              <ItemRow
                padding="dense"
                title={<RowTitle>Powered by watermark</RowTitle>}
                subtitle={<RowSubtitle>Show Tresta attribution.</RowSubtitle>}
                trailing={
                  <ToggleControl
                    label="Show watermark"
                    checked={form.watermark.show}
                    onChange={(checked) =>
                      updateForm({ watermark: { show: checked } })
                    }
                  />
                }
              />
              <ItemRow
                padding="dense"
                title={<RowTitle>Embed script</RowTitle>}
                subtitle={
                  <RowSubtitle>Enable embedded collection.</RowSubtitle>
                }
                trailing={
                  <ToggleControl
                    label="Enable embed script"
                    checked={form.delivery.embedScriptEnabled}
                    onChange={(checked) =>
                      updateForm({
                        delivery: { embedScriptEnabled: checked },
                      })
                    }
                  />
                }
              />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          id="moderation"
          title="Moderation"
          description="Review behavior applied to new project submissions."
          staggerIndex={2}
        >
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="divide-y divide-border">
              <ItemRow
                padding="dense"
                title={<RowTitle>Auto-moderation</RowTitle>}
                subtitle={
                  <RowSubtitle>
                    Run submissions through review checks.
                  </RowSubtitle>
                }
                trailing={
                  <ToggleControl
                    label="Enable auto-moderation"
                    checked={moderation.autoModeration}
                    onChange={(checked) =>
                      setModeration((current) => ({
                        ...current,
                        autoModeration: checked,
                      }))
                    }
                  />
                }
              />
              <ItemRow
                padding="dense"
                title={<RowTitle>Auto-approve verified</RowTitle>}
                subtitle={
                  <RowSubtitle>
                    Skip review for verified submitters.
                  </RowSubtitle>
                }
                trailing={
                  <ToggleControl
                    label="Auto-approve verified submissions"
                    checked={moderation.autoApproveVerified}
                    disabled={!moderation.autoModeration}
                    onChange={(checked) =>
                      setModeration((current) => ({
                        ...current,
                        autoApproveVerified: checked,
                      }))
                    }
                  />
                }
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="profanity-level">Profanity filter</Label>
            <Select
              value={moderation.profanityFilterLevel ?? "OFF"}
              onValueChange={(value) =>
                setModeration((current) => ({
                  ...current,
                  profanityFilterLevel: value === "OFF" ? null : value,
                }))
              }
            >
              <SelectTrigger id="profanity-level" className="w-44">
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
        </SettingsSection>

        <SettingsSection
          id="visibility"
          title="Visibility"
          description="Access state used when a project is first created."
          staggerIndex={3}
        >
          <RadioGroup
            value={visibilityAccess.visibility}
            onValueChange={(value) =>
              setVisibilityAccess((current) => ({
                ...current,
                visibility: value as V2ProjectVisibility,
              }))
            }
            className="space-y-2.5"
          >
            {VISIBILITY_OPTIONS.map(({ value, label, desc }) => (
              <div key={value} className="flex items-start gap-3">
                <RadioGroupItem
                  value={value}
                  id={`defaults-vis-${value}`}
                  className="mt-0.5"
                />
                <label
                  htmlFor={`defaults-vis-${value}`}
                  className="cursor-pointer space-y-0.5"
                >
                  <span className="text-sm font-medium">{label}</span>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </label>
              </div>
            ))}
          </RadioGroup>
          <div className="mt-5 overflow-hidden rounded-lg border border-border">
            <ItemRow
              padding="dense"
              title={<RowTitle>Active by default</RowTitle>}
              subtitle={
                <RowSubtitle>
                  New projects can collect submissions immediately.
                </RowSubtitle>
              }
              trailing={
                <ToggleControl
                  label="Set new projects active by default"
                  checked={visibilityAccess.isActive}
                  onChange={(checked) =>
                    setVisibilityAccess((current) => ({
                      ...current,
                      isActive: checked,
                    }))
                  }
                />
              }
            />
          </div>
        </SettingsSection>
      </PageBody>

      <SettingsFooter
        dirty={canSave}
        saving={updateDefaults.isPending}
        onSave={save}
        onDiscard={discard}
      />
    </>
  );
}

function ColorInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const valid = isValidHex(value);
  const colorValue = valid && value ? value : "#9ca3af";

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} color picker`}
          value={colorValue}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-10 cursor-pointer rounded-md border border-input bg-background"
        />
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#6366f1"
          className={cn(
            "h-8 max-w-[10rem] font-mono text-[13px]",
            !valid && "border-destructive/60 focus-visible:ring-destructive/30",
          )}
        />
      </div>
      {!valid && (
        <p className="text-[11px] text-destructive">
          Enter a 3- or 6-digit hex color.
        </p>
      )}
    </div>
  );
}
