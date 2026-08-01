"use client";

/**
 * ImportMethodShell — the shared chrome for the five import method pages.
 *
 * A method page is a single-decision surface (2026-08-02 collection IA, P1):
 * the user already chose *how* on the landing page, so this shell carries one
 * title, one sentence, a way back, and the flow — nothing else. Content is
 * bounded to a readable measure and left-aligned on the app grid; the page
 * never re-states the catalog.
 */

import * as React from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { PageBody, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { importPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function ImportMethodShell({
  slug,
  title,
  description,
  wide = false,
  backHref,
  backLabel,
  children,
}: {
  slug: string;
  title: string;
  description: React.ReactNode;
  /** Spreadsheet mapping needs more room than a text form. */
  wide?: boolean;
  /** A drill-in (connect → one provider) points back at its list instead. */
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={title} description={description} />
      <PageBody padding="default" className="min-h-0 overflow-y-auto pb-10">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 mb-5 h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Link href={backHref ?? importPath(slug)}>
            <ArrowLeftIcon className="size-3.5" aria-hidden />
            {backLabel ?? "All import methods"}
          </Link>
        </Button>
        <div className={cn("w-full", wide ? "max-w-3xl" : "max-w-2xl")}>
          {children}
        </div>
      </PageBody>
    </div>
  );
}
