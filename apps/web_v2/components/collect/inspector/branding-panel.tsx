"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { Section, SectionDivider } from "./primitives/section";
import { ToggleRow } from "./primitives/toggle-row";
import { ColorInput } from "./primitives/color-input";
import { LogoUpload } from "./primitives/logo-upload";
import { PresetGallery } from "./preset-gallery";
import { useCollectStore } from "@/lib/collect/form-config-store";
import { applyPreset } from "@/lib/collect/presets";
import type {
  ButtonStyle,
  CornerRadius,
  Density,
  DisplayMode,
  FontFamily,
  FormConfig,
  HeaderAlignment,
  HeadingWeight,
  InputStyle,
  Shadow,
  WatermarkPosition,
} from "@/lib/collect/types";

export function BrandingPanel({
  slug,
  config,
}: {
  slug: string;
  config: FormConfig;
}) {
  const update = useCollectStore((s) => s.update);
  const replaceDraft = useCollectStore((s) => s.replaceDraft);
  const b = config.branding;

  const handlePresetSelect = React.useCallback(
    (presetId: string) => {
      const next = applyPreset(config, presetId);
      replaceDraft(slug, next);
    },
    [config, slug, replaceDraft]
  );

  return (
    <div data-slot="branding-panel" className="divide-y divide-border/60">
      <Section title="Theme" description="Start from a preset, then customize.">
        <PresetGallery
          slug={slug}
          config={config}
          onSelect={handlePresetSelect}
        />
      </Section>

      <SectionDivider />

      <Section title="Logo" description="Shown above the form header.">
        <LogoUpload
          value={b.logoUrl}
          onChange={(url) =>
            update(slug, { branding: { logoUrl: url } })
          }
        />
      </Section>

      <SectionDivider />

      <Section title="Colors">
        <ColorInput
          testId="color-primary"
          label="Primary"
          value={b.colors.primary}
          onChange={(v) =>
            update(slug, { branding: { colors: { primary: v } } })
          }
        />
        <ColorInput
          label="Background"
          value={b.colors.background}
          onChange={(v) =>
            update(slug, { branding: { colors: { background: v } } })
          }
        />
        <ColorInput
          label="Foreground"
          value={b.colors.foreground}
          onChange={(v) =>
            update(slug, { branding: { colors: { foreground: v } } })
          }
        />
        <ColorInput
          label="Accent"
          value={b.colors.accent}
          onChange={(v) =>
            update(slug, { branding: { colors: { accent: v } } })
          }
        />
      </Section>

      <SectionDivider />

      <Section title="Typography">
        <div className="flex flex-col gap-1">
          <Label className="text-[11px]">Font family</Label>
          <Select
            value={b.fontFamily}
            onValueChange={(v: FontFamily) =>
              update(slug, { branding: { fontFamily: v } })
            }
          >
            <SelectTrigger size="sm" className="w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inter">Inter (default)</SelectItem>
              <SelectItem value="geist">Geist Mono</SelectItem>
              <SelectItem value="system">System UI</SelectItem>
              <SelectItem value="serif">Serif</SelectItem>
              <SelectItem value="mono">Monospace</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-[11px]">Heading weight</Label>
          <ToggleGroup
            type="single"
            size="sm"
            value={b.headingWeight ?? "semibold"}
            onValueChange={(v) => {
              if (!v) return;
              update(slug, {
                branding: { headingWeight: v as HeadingWeight },
              });
            }}
          >
            <ToggleGroupItem value="light" className="h-7 text-[10px]">
              Light
            </ToggleGroupItem>
            <ToggleGroupItem value="normal" className="h-7 text-[10px]">
              Normal
            </ToggleGroupItem>
            <ToggleGroupItem value="semibold" className="h-7 text-[10px]">
              Semi
            </ToggleGroupItem>
            <ToggleGroupItem value="bold" className="h-7 text-[10px]">
              Bold
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </Section>

      <SectionDivider />

      <Section title="Shape">
        <div className="flex items-center justify-between">
          <Label className="text-[11px]">Corner radius</Label>
          <ToggleGroup
            type="single"
            size="sm"
            value={b.cornerRadius}
            onValueChange={(v) => {
              if (!v) return;
              update(slug, {
                branding: { cornerRadius: v as CornerRadius },
              });
            }}
          >
            <ToggleGroupItem value="sharp" className="h-7 text-[10px]">
              Sharp
            </ToggleGroupItem>
            <ToggleGroupItem value="subtle" className="h-7 text-[10px]">
              Subtle
            </ToggleGroupItem>
            <ToggleGroupItem value="rounded" className="h-7 text-[10px]">
              Rounded
            </ToggleGroupItem>
            <ToggleGroupItem value="pill" className="h-7 text-[10px]">
              Pill
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-[11px]">Color mode</Label>
          <ToggleGroup
            type="single"
            size="sm"
            value={b.mode}
            onValueChange={(v) => {
              if (!v) return;
              update(slug, { branding: { mode: v as DisplayMode } });
            }}
          >
            <ToggleGroupItem value="light" className="h-7 text-[10px]">
              Light
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" className="h-7 text-[10px]">
              Dark
            </ToggleGroupItem>
            <ToggleGroupItem value="system" className="h-7 text-[10px]">
              System
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </Section>

      <SectionDivider />

      <Section title="Style">
        <div className="flex items-center justify-between">
          <Label className="text-[11px]">Input style</Label>
          <ToggleGroup
            type="single"
            size="sm"
            value={b.inputStyle ?? "outlined"}
            onValueChange={(v) => {
              if (!v) return;
              update(slug, {
                branding: { inputStyle: v as InputStyle },
              });
            }}
          >
            <ToggleGroupItem value="outlined" className="h-7 text-[10px]">
              Outlined
            </ToggleGroupItem>
            <ToggleGroupItem value="filled" className="h-7 text-[10px]">
              Filled
            </ToggleGroupItem>
            <ToggleGroupItem value="underlined" className="h-7 text-[10px]">
              Under
            </ToggleGroupItem>
            <ToggleGroupItem value="minimal" className="h-7 text-[10px]">
              Minimal
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-[11px]">Button style</Label>
          <ToggleGroup
            type="single"
            size="sm"
            value={b.buttonStyle ?? "solid"}
            onValueChange={(v) => {
              if (!v) return;
              update(slug, {
                branding: { buttonStyle: v as ButtonStyle },
              });
            }}
          >
            <ToggleGroupItem value="solid" className="h-7 text-[10px]">
              Solid
            </ToggleGroupItem>
            <ToggleGroupItem value="outline" className="h-7 text-[10px]">
              Outline
            </ToggleGroupItem>
            <ToggleGroupItem value="soft" className="h-7 text-[10px]">
              Soft
            </ToggleGroupItem>
            <ToggleGroupItem value="ghost" className="h-7 text-[10px]">
              Ghost
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-[11px]">Shadow</Label>
          <ToggleGroup
            type="single"
            size="sm"
            value={b.shadow ?? "subtle"}
            onValueChange={(v) => {
              if (!v) return;
              update(slug, {
                branding: { shadow: v as Shadow },
              });
            }}
          >
            <ToggleGroupItem value="none" className="h-7 text-[10px]">
              None
            </ToggleGroupItem>
            <ToggleGroupItem value="subtle" className="h-7 text-[10px]">
              Subtle
            </ToggleGroupItem>
            <ToggleGroupItem value="medium" className="h-7 text-[10px]">
              Medium
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </Section>

      <SectionDivider />

      <Section title="Layout">
        <div className="flex items-center justify-between">
          <Label className="text-[11px]">Header alignment</Label>
          <ToggleGroup
            type="single"
            size="sm"
            value={b.headerAlignment ?? "left"}
            onValueChange={(v) => {
              if (!v) return;
              update(slug, {
                branding: { headerAlignment: v as HeaderAlignment },
              });
            }}
          >
            <ToggleGroupItem value="left" className="h-7 text-[10px]">
              Left
            </ToggleGroupItem>
            <ToggleGroupItem value="center" className="h-7 text-[10px]">
              Center
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-[11px]">Density</Label>
          <ToggleGroup
            type="single"
            size="sm"
            value={b.density ?? "default"}
            onValueChange={(v) => {
              if (!v) return;
              update(slug, {
                branding: { density: v as Density },
              });
            }}
          >
            <ToggleGroupItem value="compact" className="h-7 text-[10px]">
              Compact
            </ToggleGroupItem>
            <ToggleGroupItem value="default" className="h-7 text-[10px]">
              Default
            </ToggleGroupItem>
            <ToggleGroupItem value="spacious" className="h-7 text-[10px]">
              Spacious
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </Section>

      <SectionDivider />

      <Section
        title="Watermark"
        description="Shows a small 'Powered by Tresta' badge. Removable on paid plans (coming soon)."
      >
        <ToggleRow
          testId="watermark-toggle"
          label="Show badge"
          checked={config.watermark.show}
          onCheckedChange={(v) =>
            update(slug, { watermark: { show: v } })
          }
        >
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground">
              Position
            </Label>
            <ToggleGroup
              type="single"
              size="sm"
              value={config.watermark.position}
              onValueChange={(v) => {
                if (!v) return;
                update(slug, {
                  watermark: { position: v as WatermarkPosition },
                });
              }}
            >
              <ToggleGroupItem
                value="bottom-left"
                className="h-6 px-2 text-[10px]"
              >
                Left
              </ToggleGroupItem>
              <ToggleGroupItem
                value="bottom-center"
                className="h-6 px-2 text-[10px]"
              >
                Center
              </ToggleGroupItem>
              <ToggleGroupItem
                value="bottom-right"
                className="h-6 px-2 text-[10px]"
              >
                Right
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </ToggleRow>
      </Section>
    </div>
  );
}
