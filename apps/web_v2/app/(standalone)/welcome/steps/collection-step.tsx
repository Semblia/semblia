"use client";

import { useState, useCallback } from "react";
import {
  ArrowRight,
  ArrowSquareOut,
  Check,
  Copy,
  PaperPlaneTilt,
  Queue,
  SquaresFour,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { AuthPrimaryBtn } from "@/components/auth/auth-primary-btn";
import { StepFrame } from "../_step-frame";

interface CollectionStepProps {
  projectName: string;
  collectionUrl: string;
  onGoToProject: () => void;
}

export function CollectionStep({
  projectName,
  collectionUrl,
  onGoToProject,
}: CollectionStepProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(collectionUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for insecure contexts
      const textarea = document.createElement("textarea");
      textarea.value = collectionUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [collectionUrl]);

  const displayUrl = collectionUrl.replace(/^https?:\/\//, "");

  return (
    <StepFrame
      kicker="You're live"
      title={
        <>
          Your first testimonial
          <br />
          is one message away.
        </>
      }
      description={
        <>
          <span className="font-medium text-foreground">{projectName}</span> is
          ready. Copy the link below and send it to someone who&apos;ll give you
          an honest reply.
        </>
      }
    >
      {/* ── Hero URL card — the main CTA of this step ── */}
      <div
        className={cn(
          "onboard-fade-in overflow-hidden rounded-2xl border bg-card transition-[border-color,box-shadow] duration-300",
          copied
            ? "border-success/40 shadow-[0_0_0_3px_var(--color-success)/8%]"
            : "border-brand/30 shadow-[0_0_0_3px_var(--color-brand)/6%,0_4px_16px_-4px_oklch(0_0_0/10%)]",
        )}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/15">
              <Check className="size-2.5 text-brand" weight="bold" />
            </span>
            <p className="text-[12.5px] font-medium text-foreground">
              Your collection link
            </p>
          </div>
          <a
            href={collectionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            Open
            <ArrowSquareOut className="size-3" />
          </a>
        </div>

        {/* URL row */}
        <div className="flex items-stretch">
          <div className="flex flex-1 items-center overflow-hidden px-4 py-3.5">
            <span className="truncate font-mono text-[12.5px] text-foreground">
              <span className="text-muted-foreground/50">https://</span>
              <span className="font-medium">{displayUrl}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "auth-btn flex w-14 shrink-0 items-center justify-center border-l transition-[background-color,color,border-color] duration-200",
              copied
                ? "border-success/20 bg-success/8 text-success"
                : "border-border/50 text-muted-foreground hover:bg-brand/8 hover:text-brand",
            )}
            aria-label={copied ? "Copied" : "Copy link"}
          >
            {copied ? (
              <Check size={15} weight="bold" className="copy-success" />
            ) : (
              <Copy size={15} weight="bold" />
            )}
          </button>
        </div>

        {/* Feedback bar */}
        {copied && (
          <div className="auth-notice-in border-t border-success/20 bg-success/[0.06] px-4 py-2.5 text-[11.5px] font-medium text-success">
            Copied — paste it into an email, Slack DM, or your drip sequence.
          </div>
        )}
      </div>

      {/* ── What happens next — horizontal flow ── */}
      <div className="mt-6 flex items-start gap-0">
        <FlowStep
          icon={PaperPlaneTilt}
          title="Share"
          text="Send to customers."
        />
        <FlowConnector />
        <FlowStep
          icon={Queue}
          title="Moderate"
          text="Approve what you trust."
        />
        <FlowConnector />
        <FlowStep
          icon={SquaresFour}
          title="Display"
          text="Publish to your wall."
        />
      </div>

      <AuthPrimaryBtn onClick={onGoToProject} className="mt-7">
        Go to {projectName}
        <ArrowRight className="size-4" />
      </AuthPrimaryBtn>
    </StepFrame>
  );
}

// ── Flow step ────────────────────────────────────────────────────────────────

function FlowStep({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
}) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl border border-border/60 bg-card">
        <Icon className="size-3.5 text-muted-foreground" weight="bold" />
      </div>
      <p className="text-[12px] font-semibold text-foreground">{title}</p>
      <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
        {text}
      </p>
    </div>
  );
}

function FlowConnector() {
  return (
    <div className="mt-4 flex-none px-1.5" aria-hidden>
      <div className="h-px w-5 bg-border/60" />
    </div>
  );
}
