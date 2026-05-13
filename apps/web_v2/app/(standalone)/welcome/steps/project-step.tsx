"use client";

import * as React from "react";
import { ArrowRight, Globe, Link as LinkIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { AuthField } from "@/components/auth/auth-field";
import { AuthPrimaryBtn } from "@/components/auth/auth-primary-btn";
import {
  getDefaultProjectCollectionUrl,
  slugifyProjectName,
} from "@/lib/project-utils";
import { StepFrame, StepSkipButton } from "../_step-frame";
import { PROJECT_SUGGESTIONS, stepDescriptor } from "./constants";

interface ProjectStepProps {
  projectName: string;
  setProjectName: (v: string) => void;
  loading: boolean;
  onContinue: () => void;
  onSkip: () => void;
}

const descriptor = stepDescriptor("project");

export function ProjectStep({
  projectName,
  setProjectName,
  loading,
  onContinue,
  onSkip,
}: ProjectStepProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  const trimmed = projectName.trim();
  const slug = trimmed ? slugifyProjectName(trimmed) : "your-project";
  const url = getDefaultProjectCollectionUrl(slug);
  const initials = trimmed
    ? trimmed
        .split(/\s+/)
        .slice(0, 2)
        .map((s) => s.charAt(0).toUpperCase())
        .join("")
    : "··";

  return (
    <StepFrame
      ordinal={descriptor.ordinal}
      title="Name your first project."
      description="One product, service, or brand per project. You can add more later."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onContinue();
        }}
        className="space-y-5"
      >
        <AuthField
          id="onboard-project"
          label="Project name"
          value={projectName}
          onChange={setProjectName}
          placeholder="e.g. Acme SaaS"
          required
          maxLength={48}
          inputRef={inputRef}
        />

        <div className="-mt-1 flex flex-wrap gap-1.5">
          {PROJECT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setProjectName(s)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11.5px] font-medium transition-[colors,transform] duration-150",
                projectName === s
                  ? "border-foreground/35 bg-foreground/[0.04] text-foreground"
                  : "border-border/60 bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Live preview card — concrete, not just abstract */}
        <PreviewCard initials={initials} name={trimmed} url={url} />

        <AuthPrimaryBtn
          type="submit"
          loading={loading}
          loadingLabel="Creating project…"
          disabled={!trimmed || loading}
        >
          Create project
          <ArrowRight className="size-4" />
        </AuthPrimaryBtn>
      </form>

      <StepSkipButton onClick={onSkip} label="I'll create it later" />
    </StepFrame>
  );
}

// ── Live preview ────────────────────────────────────────────────────────────

function PreviewCard({
  initials,
  name,
  url,
}: {
  initials: string;
  name: string;
  url: string;
}) {
  const display = name || "Your project name";

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
      {/* Mock browser chrome */}
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
        <div className="flex gap-1" aria-hidden>
          <span className="size-2 rounded-full bg-border" />
          <span className="size-2 rounded-full bg-border" />
          <span className="size-2 rounded-full bg-border" />
        </div>
        <div className="ml-1 flex flex-1 items-center gap-1.5 truncate rounded-md bg-background px-2 py-1 font-mono text-[10.5px] text-muted-foreground/80">
          <Globe className="size-3 shrink-0 text-muted-foreground/60" />
          <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
        </div>
      </div>

      {/* Mock collection page */}
      <div className="flex items-center gap-3 px-4 py-4">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md text-[12px] font-bold tracking-tight text-white transition-colors duration-200",
            name ? "bg-brand" : "bg-muted-foreground/40",
          )}
          aria-hidden
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-[12.5px] font-semibold transition-colors duration-200",
              name ? "text-foreground" : "text-muted-foreground/60",
            )}
          >
            Share a moment with {display}
          </p>
          <p className="mt-0.5 truncate text-[11px] leading-relaxed text-muted-foreground">
            How did our work change your day?
          </p>
        </div>
        <span
          aria-hidden
          className="hidden shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10.5px] font-medium text-muted-foreground sm:inline-flex"
        >
          <LinkIcon className="size-3" />
          Hosted
        </span>
      </div>
    </div>
  );
}
