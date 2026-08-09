"use client";

/**
 * VisibilityForm — who can see the project, and what happens to a submission
 * before it reaches the queue.
 *
 * `PATCH /v2/projects/:slug` is guarded by MANAGE_PROJECT like every other
 * settings write, and this surface was the last one still ignoring it: a
 * view-only role could flip radios and toggles and only learn the save was
 * refused from a red toast. It now matches its siblings — a native
 * `<fieldset disabled>` per section with the reason in that section's footer,
 * so nothing goes dirty and no save bar arms.
 */

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
import {
  canManageProject,
  normalizeProject,
  READ_ONLY_REASON,
  type NormalizedProject,
} from "./shared/normalize";

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

interface VisibilityDraft {
  visibility: V2ProjectVisibility;
  autoModeration: boolean;
  autoApproveVerified: boolean;
  profanityFilterLevel: NormalizedProject["profanityFilterLevel"];
}

function isVisibilityDirty(
  draft: VisibilityDraft,
  norm: NormalizedProject,
): boolean {
  return (
    draft.visibility !== norm.visibility ||
    draft.autoModeration !== norm.autoModeration ||
    draft.autoApproveVerified !== norm.autoApproveVerified ||
    draft.profanityFilterLevel !== norm.profanityFilterLevel
  );
}

function VisibilityChoices({
  value,
  onChange,
}: {
  value: V2ProjectVisibility;
  onChange: (value: V2ProjectVisibility) => void;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as V2ProjectVisibility)}
      className="space-y-2.5"
    >
      {VISIBILITY_OPTIONS.map(({ value: option, label, desc }) => (
        <div key={option} className="flex items-start gap-3">
          <RadioGroupItem
            value={option}
            id={`vis-${option}`}
            className="mt-0.5"
          />
          <label
            htmlFor={`vis-${option}`}
            className="cursor-pointer space-y-0.5"
          >
            <span className="text-sm font-medium">{label}</span>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </label>
        </div>
      ))}
    </RadioGroup>
  );
}

function LanguageFilterField({
  value,
  onChange,
  enabled,
}: {
  value: NormalizedProject["profanityFilterLevel"];
  onChange: (value: NormalizedProject["profanityFilterLevel"]) => void;
  enabled: boolean;
}) {
  return (
    <div className="space-y-2 px-4 py-4 sm:px-6">
      <Label htmlFor="v-profanity" className="text-sm font-medium">
        Language filter
      </Label>
      <Select value={value} onValueChange={onChange} disabled={!enabled}>
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
        {enabled
          ? "Stricter levels flag more submissions for review. They never reject anything outright."
          : "Turn on automatic checks to use the language filter."}
      </p>
    </div>
  );
}

export function VisibilityForm({ project }: { project: V2ProjectDTO }) {
  const norm = React.useMemo(() => normalizeProject(project), [project]);
  const canManage = canManageProject(project);
  const readOnlyFooter = canManage ? undefined : READ_ONLY_REASON;

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

  const dirty = isVisibilityDirty(
    {
      visibility,
      autoModeration,
      autoApproveVerified,
      profanityFilterLevel: profanityLevel,
    },
    norm,
  );

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
    } catch (err) {
      // Surface the API's own message: a validation refusal and a network
      // fault need different responses from the user.
      toast.error(
        err instanceof Error
          ? err.message
          : "Couldn't save visibility settings",
      );
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
      <PageBody padding="bare">
        <div className="pb-8">
          <SettingsSection
            id="visibility"
            title="Visibility"
            description="Controls who can discover and view this project."
            footer={readOnlyFooter}
          >
            <fieldset disabled={!canManage} className="space-y-3">
              <legend className="sr-only">Project visibility</legend>
              <VisibilityChoices value={visibility} onChange={setVisibility} />
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
            footer={readOnlyFooter}
          >
            <fieldset
              disabled={!canManage}
              className="min-w-0 divide-y divide-border"
            >
              <legend className="sr-only">Moderation</legend>
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

              <LanguageFilterField
                value={profanityLevel}
                onChange={setProfanityLevel}
                enabled={autoModeration}
              />
            </fieldset>
          </SettingsSection>
        </div>
      </PageBody>

      {/* Nothing above can go dirty for a view-only role, so the bar would only
          ever render inert. */}
      {canManage && (
        <SettingsFooter
          dirty={dirty}
          saving={saving}
          onSave={handleSave}
          onDiscard={handleDiscard}
        />
      )}
    </>
  );
}
