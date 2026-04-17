"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Section, SectionDivider } from "./primitives/section";
import { ToggleRow, RequiredSubToggle } from "./primitives/toggle-row";
import { useCollectStore } from "@/lib/collect/form-config-store";
import type { ConsentMode, FormConfig } from "@/lib/collect/types";

export function FieldsPanel({
  slug,
  config,
}: {
  slug: string;
  config: FormConfig;
}) {
  const update = useCollectStore((s) => s.update);
  const f = config.fields;

  return (
    <div data-slot="fields-panel" className="divide-y divide-border/60">
      <Section
        title="Always-on fields"
        description="Name and testimonial body are required on every form."
      >
        <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
          <span>Name · Testimonial body</span>
          <span className="text-[10px] uppercase tracking-wider">Required</span>
        </div>
      </Section>

      <SectionDivider />

      <Section title="Optional fields">
        <ToggleRow
          testId="field-email"
          label="Email"
          description="Capture the respondent's email."
          checked={f.email.enabled}
          onCheckedChange={(v) =>
            update(slug, { fields: { email: { enabled: v } } })
          }
        >
          <RequiredSubToggle
            testId="field-email-required"
            required={f.email.required}
            onRequiredChange={(v) =>
              update(slug, { fields: { email: { required: v } } })
            }
          />
        </ToggleRow>

        <ToggleRow
          testId="field-rating"
          label="Rating"
          description="Star rating scale."
          checked={f.rating.enabled}
          onCheckedChange={(v) =>
            update(slug, { fields: { rating: { enabled: v } } })
          }
        >
          <div className="flex flex-col gap-2">
            <RequiredSubToggle
              testId="field-rating-required"
              required={f.rating.required}
              onRequiredChange={(v) =>
                update(slug, { fields: { rating: { required: v } } })
              }
            />
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-muted-foreground">
                Scale
              </Label>
              <ToggleGroup
                type="single"
                size="sm"
                value={String(f.rating.scale)}
                onValueChange={(v) => {
                  if (!v) return;
                  update(slug, {
                    fields: {
                      rating: { scale: (v === "10" ? 10 : 5) as 5 | 10 },
                    },
                  });
                }}
              >
                <ToggleGroupItem value="5" className="h-6 px-2 text-[10px]">
                  1–5
                </ToggleGroupItem>
                <ToggleGroupItem value="10" className="h-6 px-2 text-[10px]">
                  1–10
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </ToggleRow>

        <ToggleRow
          testId="field-jobTitle"
          label="Job title"
          checked={f.jobTitle.enabled}
          onCheckedChange={(v) =>
            update(slug, { fields: { jobTitle: { enabled: v } } })
          }
        >
          <RequiredSubToggle
            required={f.jobTitle.required}
            onRequiredChange={(v) =>
              update(slug, { fields: { jobTitle: { required: v } } })
            }
          />
        </ToggleRow>

        <ToggleRow
          testId="field-company"
          label="Company"
          checked={f.company.enabled}
          onCheckedChange={(v) =>
            update(slug, { fields: { company: { enabled: v } } })
          }
        >
          <RequiredSubToggle
            required={f.company.required}
            onRequiredChange={(v) =>
              update(slug, { fields: { company: { required: v } } })
            }
          />
        </ToggleRow>

        <ToggleRow
          testId="field-avatar"
          label="Profile photo"
          description="Upload a headshot."
          checked={f.avatar.enabled}
          onCheckedChange={(v) =>
            update(slug, { fields: { avatar: { enabled: v } } })
          }
        >
          <RequiredSubToggle
            required={f.avatar.required}
            onRequiredChange={(v) =>
              update(slug, { fields: { avatar: { required: v } } })
            }
          />
        </ToggleRow>

        <ToggleRow
          testId="field-videoUrl"
          label="Video URL"
          description="Loom, YouTube or Vimeo link."
          checked={f.videoUrl.enabled}
          onCheckedChange={(v) =>
            update(slug, { fields: { videoUrl: { enabled: v } } })
          }
        >
          <RequiredSubToggle
            required={f.videoUrl.required}
            onRequiredChange={(v) =>
              update(slug, { fields: { videoUrl: { required: v } } })
            }
          />
        </ToggleRow>
      </Section>

      <SectionDivider />

      <Section title="Consent">
        <ToggleRow
          testId="field-consent"
          label="Require consent"
          description="Add a consent notice to your form."
          checked={f.consent.enabled}
          onCheckedChange={(v) =>
            update(slug, { fields: { consent: { enabled: v } } })
          }
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] text-muted-foreground">
                Display as
              </Label>
              <ToggleGroup
                type="single"
                size="sm"
                value={f.consent.mode}
                onValueChange={(v) => {
                  if (!v) return;
                  update(slug, {
                    fields: {
                      consent: { mode: v as ConsentMode },
                    },
                  });
                }}
                className="w-full"
              >
                <ToggleGroupItem
                  value="declaration"
                  className="h-7 flex-1 text-[10px]"
                >
                  Declaration
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="checkbox"
                  className="h-7 flex-1 text-[10px]"
                >
                  Checkbox
                </ToggleGroupItem>
              </ToggleGroup>
              <p className="text-[9px] leading-relaxed text-muted-foreground/70">
                {f.consent.mode === "declaration"
                  ? "Shows a disclaimer below the form. Non-blocking."
                  : "Respondent must check a box before submitting."}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] text-muted-foreground">
                {f.consent.mode === "declaration"
                  ? "Disclaimer text"
                  : "Checkbox label"}
              </Label>
              <Input
                value={f.consent.label}
                onChange={(e) =>
                  update(slug, {
                    fields: { consent: { label: e.target.value } },
                  })
                }
                className="h-7 text-[11px]"
              />
            </div>
          </div>
        </ToggleRow>
      </Section>
    </div>
  );
}
