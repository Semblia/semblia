"use client";

/**
 * ImportMethodShell — the shared chrome for the five import method pages.
 *
 * The user has chosen *how* on the landing page; this shell carries one title,
 * one sentence, a way back, a step rail, and the flow.
 *
 * The rail is the point. Each of these pages is a short sequence — name the
 * platform, then point Semblia at it, then confirm — and previously all of it
 * arrived at once as a flat stack of form fields with the destination unstated.
 * Numbering the steps and showing which one you're on turns a form into a path:
 * you can see how far it goes before you start, and where you are in it.
 * Numbered chips + a connector, the same vocabulary as the sign-in rail.
 *
 * Width: these pages are top-level pages, so they run to the same edges every
 * other top-level page does. They previously sat in a `max-w-2xl` rail, which
 * on a normal desktop left two thirds of the screen empty beside a column of
 * cramped tiles. A *form* still needs a readable measure, so the flow keeps one
 * (`measure`) while grids, tables and rails get the whole page; `aside` puts
 * the standing context in the space that opens up rather than stretching a text
 * input across 1400 px.
 */

import * as React from "react";
import Link from "next/link";
import { ArrowLeftIcon, CheckIcon } from "@phosphor-icons/react";
import { PageBody, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { importPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

export interface ImportMethodShellProps {
  slug: string;
  title: string;
  description: React.ReactNode;
  /**
   * Cap the flow at a readable measure. On for form steps (a 1400 px text
   * input is not a wider form, it is a worse one); off for grids and tables,
   * which are the reason the page is full-bleed in the first place.
   */
  measure?: boolean;
  /** Standing context for this step, in a right rail from `xl` up. */
  aside?: React.ReactNode;
  /** A drill-in (connect → one provider) points back at its list instead. */
  backHref?: string;
  backLabel?: string;
  /** Step names, in order. Omit for a page that isn't a sequence. */
  steps?: readonly string[];
  /** Zero-based index of the step being shown. */
  currentStep?: number;
  children: React.ReactNode;
}

export function ImportMethodShell({
  slug,
  title,
  description,
  measure = false,
  aside,
  backHref,
  backLabel,
  steps,
  currentStep = 0,
  children,
}: ImportMethodShellProps) {
  const railed = steps && steps.length > 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Link href={backHref ?? importPath(slug)}>
              <ArrowLeftIcon className="size-3.5" aria-hidden />
              {backLabel ?? "All import methods"}
            </Link>
          </Button>
        }
        toolbar={railed ? <StepRail steps={steps} current={currentStep} /> : undefined}
      />
      <PageBody padding="default" className="min-h-0 overflow-y-auto pb-12">
        <div
          className={cn(
            "grid items-start gap-x-12 gap-y-8",
            aside && "xl:grid-cols-[minmax(0,1fr)_20rem]",
          )}
        >
          <div className={cn("min-w-0", measure && "max-w-3xl")}>{children}</div>
          {aside && <div className="min-w-0">{aside}</div>}
        </div>
      </PageBody>
    </div>
  );
}

/**
 * The standing context beside a step: a heading and a short list of facts the
 * flow itself should not have to repeat inline. Lives on the page background
 * with a hairline, never in a card — a bordered box here would be the second
 * bounded surface on a page that already has none.
 */
export function MethodAside({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-4 xl:border-t-0 xl:border-l xl:pl-6 xl:pt-0">
      <h2 className="text-[13px] font-medium tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-2.5 space-y-2.5 text-xs leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

type StepState = "done" | "active" | "ahead";

/** One table per element, so the three states are read rather than derived. */
const CHIP: Record<StepState, string> = {
  active: "border-foreground/30 bg-foreground text-background",
  done: "border-border bg-surface text-foreground",
  ahead: "border-border bg-surface text-muted-foreground/70",
};

const LABEL: Record<StepState, string> = {
  active: "font-medium text-foreground",
  done: "text-muted-foreground",
  ahead: "text-muted-foreground/70",
};

function stepState(index: number, current: number): StepState {
  if (index < current) return "done";
  return index === current ? "active" : "ahead";
}

/**
 * Horizontal numbered rail. A completed step shows a check rather than its
 * number, so "done" and "ahead" never look alike at a glance; the current step
 * is the only one whose label carries full contrast.
 */
export function StepRail({
  steps,
  current,
}: {
  steps: readonly string[];
  current: number;
}) {
  return (
    <ol
      className="flex items-center gap-2 py-0.5"
      aria-label={`Step ${Math.min(current + 1, steps.length)} of ${steps.length}`}
    >
      {steps.map((step, i) => (
        <Step
          key={step}
          label={step}
          number={i + 1}
          state={stepState(i, current)}
          connected={i < steps.length - 1}
        />
      ))}
    </ol>
  );
}

function Step({
  label,
  number,
  state,
  connected,
}: {
  label: string;
  number: number;
  state: StepState;
  connected: boolean;
}) {
  return (
    <li className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-lg border font-mono text-[10px] font-medium",
          CHIP[state],
        )}
      >
        {state === "done" ? (
          <CheckIcon className="size-3" weight="bold" />
        ) : (
          number
        )}
      </span>
      <span
        className={cn("truncate text-xs", LABEL[state])}
        aria-current={state === "active" ? "step" : undefined}
      >
        {label}
      </span>
      {connected && (
        <span
          aria-hidden
          className="ml-1 hidden h-px w-6 shrink-0 bg-border sm:block"
        />
      )}
    </li>
  );
}
