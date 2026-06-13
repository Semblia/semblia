"use client";

import * as React from "react";
import { toast } from "sonner";
import type { V2ProjectDTO, V2ProjectVisibility } from "@workspace/types";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PageBody,
  SettingsSection,
  SettingsFooter,
  ToggleRow,
} from "@/components/shared";
import { useUpdateProject } from "@/hooks/api";
import { normalizeProject } from "./shared/normalize";

const VISIBILITY_OPTIONS = [
  {
    value: "PUBLIC" as const,
    label: "Public",
    desc: "Anyone with a link can view approved testimonials.",
  },
  {
    value: "PRIVATE" as const,
    label: "Private",
    desc: "Only project members can see this project.",
  },
  {
    value: "INVITE_ONLY" as const,
    label: "Unlisted",
    desc: "Reachable by direct link only — not listed publicly.",
  },
];

export function VisibilityForm({ project }: { project: V2ProjectDTO }) {
  const norm = React.useMemo(() => normalizeProject(project), [project]);

  const [visibility, setVisibility] = React.useState<V2ProjectVisibility>(
    norm.visibility,
  );
  const [autoModeration, setAutoModeration] = React.useState(
    norm.autoModeration,
  );
  const [autoApproveVerified, setAutoApproveVerified] = React.useState(
    norm.autoApproveVerified,
  );
  const [profanityLevel, setProfanityLevel] = React.useState(
    norm.profanityFilterLevel,
  );

  const updateProject = useUpdateProject(project.slug);
  const [saving, setSaving] = React.useState(false);

  const dirty =
    visibility !== norm.visibility ||
    autoModeration !== norm.autoModeration ||
    autoApproveVerified !== norm.autoApproveVerified ||
    profanityLevel !== norm.profanityFilterLevel;

  async function handleSave() {
    setSaving(true);
    try {
      await updateProject.mutateAsync({
        visibility,
        autoModeration,
        autoApproveVerified,
        profanityFilterLevel: profanityLevel,
      });
      toast.success("Visibility settings saved");
    } catch {
      toast.error("Failed to save visibility settings");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    setVisibility(norm.visibility);
    setAutoModeration(norm.autoModeration);
    setAutoApproveVerified(norm.autoApproveVerified);
    setProfanityLevel(norm.profanityFilterLevel);
  }

  return (
    <>
      <PageBody contained padding="default">
        <div className="space-y-8 pb-8">
          <SettingsSection
            id="visibility"
            title="Visibility"
            description="Controls who can discover and view this project."
          >
            <fieldset className="space-y-3">
              <legend className="sr-only">Project visibility</legend>
              <RadioGroup
                value={visibility}
                onValueChange={(v) => setVisibility(v as V2ProjectVisibility)}
                className="space-y-2.5"
              >
                {VISIBILITY_OPTIONS.map(({ value, label, desc }) => (
                  <div key={value} className="flex items-start gap-3">
                    <RadioGroupItem
                      value={value}
                      id={`vis-${value}`}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor={`vis-${value}`}
                      className="cursor-pointer space-y-0.5"
                    >
                      <span className="text-sm font-medium">{label}</span>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </fieldset>
          </SettingsSection>

          <SettingsSection
            id="moderation"
            title="Moderation"
            description="How incoming submissions are reviewed before they're published."
          >
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="divide-y divide-border">
                <ToggleRow
                  title="Auto-moderation"
                  description="Run submissions through the moderation pipeline before they reach review."
                  checked={autoModeration}
                  onChange={setAutoModeration}
                />
                <ToggleRow
                  title="Auto-approve verified submissions"
                  description="Skip review when the submitter signed in via OAuth."
                  checked={autoApproveVerified}
                  onChange={setAutoApproveVerified}
                  disabled={!autoModeration}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="v-profanity">Profanity filter</Label>
              <Select value={profanityLevel} onValueChange={setProfanityLevel}>
                <SelectTrigger id="v-profanity" className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OFF">Off</SelectItem>
                  <SelectItem value="LENIENT">Light</SelectItem>
                  <SelectItem value="MODERATE">Moderate</SelectItem>
                  <SelectItem value="STRICT">Strict</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Higher levels flag more submissions for review.
              </p>
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
    </>
  );
}
