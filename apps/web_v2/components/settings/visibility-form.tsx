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
      <PageBody padding="default">
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

          {/* SettingsSection *is* the card. Grouping inside it uses dividers,
              never a second bordered container — that was the cards-on-cards
              defect this pass exists to remove. */}
          <SettingsSection
            id="moderation"
            title="Moderation"
            description="What happens to a submission between arriving and reaching your queue. Nothing here publishes or rejects on its own — every decision still ends with you."
            flush
          >
            <div className="divide-y divide-border">
              <ToggleRow
                title="Check submissions automatically"
                description="Scans text, images, audio, and video as they arrive, and flags anything that needs a closer look. The result is advisory — it sorts your queue, it doesn't decide."
                checked={autoModeration}
                onChange={setAutoModeration}
              />
              <ToggleRow
                title="Skip review for verified authors"
                description="Approve automatically when the author signed in with Google or GitHub, so identity is already established."
                checked={autoApproveVerified}
                onChange={setAutoApproveVerified}
                disabled={!autoModeration}
                disabledReason="Turn on automatic checks first — there is nothing to skip without them."
              />

              <div className="space-y-2 px-5 py-4">
                <Label htmlFor="v-profanity" className="text-sm font-medium">
                  Language filter
                </Label>
                <Select
                  value={profanityLevel}
                  onValueChange={setProfanityLevel}
                  disabled={!autoModeration}
                >
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
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {autoModeration
                    ? "Stricter levels flag more submissions for review. They never reject anything outright."
                    : "Turn on automatic checks to use the language filter."}
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
    </>
  );
}
