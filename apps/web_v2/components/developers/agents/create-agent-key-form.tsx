"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type {
  V2AgentAccessPresetDTO,
  V2AgentAccessPresetId,
} from "@workspace/types";
import {
  CheckCircleIcon,
  ArrowLeftIcon,
  RobotIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { useAgentAccessOverview, useCreateAgentKey } from "@/hooks/api";
import {
  RevealPanel,
  ConfirmCloseDialog,
} from "@/components/developers/shared/reveal-step";

interface DraftState {
  name: string;
  preset: V2AgentAccessPresetId | null;
}

const EMPTY_DRAFT: DraftState = { name: "", preset: null };

function PresetPicker({
  presets,
  selected,
  onSelect,
}: {
  presets: V2AgentAccessPresetDTO[];
  selected: V2AgentAccessPresetId | null;
  onSelect: (id: V2AgentAccessPresetId) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        Preset <span className="text-destructive">*</span>
      </Label>
      <div
        role="radiogroup"
        aria-label="Agent preset"
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      >
        {presets.map((preset) => {
          const on = selected === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onSelect(preset.id)}
              className={cn(
                "group flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                on
                  ? "border-brand bg-brand-muted/40"
                  : "border-border bg-card hover:border-brand/40 hover:bg-muted/40",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "font-mono text-[11px] font-semibold uppercase tracking-[0.12em]",
                    on ? "text-brand" : "text-foreground",
                  )}
                >
                  {preset.label}
                </span>
                {on && (
                  <CheckCircleIcon
                    className="size-3.5 text-brand"
                    weight="fill"
                    aria-hidden
                  />
                )}
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground">
                {preset.description}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">
                {preset.scopes.length} scope
                {preset.scopes.length === 1 ? "" : "s"}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CreateAgentKeyForm({ slug }: { slug: string }) {
  const router = useRouter();
  const { data: overview, isLoading } = useAgentAccessOverview(slug);
  const createMutation = useCreateAgentKey(slug);

  const presets = overview?.presets ?? [];

  const [draft, setDraft] = React.useState<DraftState>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = React.useState(false);
  const [plaintext, setPlaintext] = React.useState<string | null>(null);
  const [confirmClose, setConfirmClose] = React.useState(false);

  const valid = draft.name.trim().length >= 3 && draft.preset != null;
  const backHref = `/projects/${slug}/developers/agents`;

  async function handleSubmit() {
    if (!draft.preset) return;
    setSubmitting(true);
    try {
      const result = await createMutation.mutateAsync({
        name: draft.name.trim(),
        preset: draft.preset,
      });
      setPlaintext(result.secret ?? result.key ?? "");
    } finally {
      setSubmitting(false);
    }
  }

  function attemptLeave() {
    if (plaintext != null) {
      setConfirmClose(true);
      return;
    }
    router.push(backHref);
  }

  function confirmLeave() {
    setConfirmClose(false);
    router.push(backHref);
  }

  if (plaintext != null) {
    return (
      <>
        <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Step 2 of 2
            </p>
            <h1 className="text-lg font-semibold text-foreground">
              Agent key created
            </h1>
          </div>
          <RevealPanel plaintext={plaintext} onDone={confirmLeave} />
        </div>

        <ConfirmCloseDialog
          open={confirmClose}
          onOpenChange={setConfirmClose}
          onConfirm={confirmLeave}
        />
      </>
    );
  }

  if (!isLoading && presets.length === 0) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RobotIcon weight="bold" />
            </EmptyMedia>
            <EmptyTitle>No presets available</EmptyTitle>
            <EmptyDescription>
              Agent presets aren&apos;t configured for this project.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 sm:py-12">
      <button
        type="button"
        onClick={attemptLeave}
        className="mb-4 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3" weight="bold" aria-hidden />
        Back to agents
      </button>

      <div className="mb-6 space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Step 1 of 2
        </p>
        <h1 className="text-lg font-semibold text-foreground">New agent key</h1>
        <p className="text-xs text-muted-foreground">
          Scoped to a preset role. No custom scopes.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) handleSubmit();
        }}
        className="space-y-5"
      >
        <div className="space-y-1.5">
          <Label htmlFor="agent-key-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="agent-key-name"
            value={draft.name}
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Claude support bot"
            maxLength={80}
            autoFocus
          />
        </div>

        <PresetPicker
          presets={presets}
          selected={draft.preset}
          onSelect={(id) => setDraft((p) => ({ ...p, preset: id }))}
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={attemptLeave}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!valid || submitting}
            className="gap-1.5"
          >
            {submitting ? "Creating…" : "Create agent key"}
          </Button>
        </div>
      </form>
    </div>
  );
}
