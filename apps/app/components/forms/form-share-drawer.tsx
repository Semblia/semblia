"use client";

/**
 * FormShareDrawer — the share surface forms deserved before widgets got one
 * (WS-A3): the hosted URL on the project's issued collection host, a
 * scannable QR, and a paste-ready ask. Composes the same shared leaf pieces
 * as the widget drawer; opened from the forms list row.
 *
 * The drawer only mounts for a form with a live link — the row action is
 * disabled with the reason otherwise — but it still guards, because a host
 * can stop being live between render and click.
 */

import * as React from "react";
import { X as XIcon, ArrowSquareOut as OpenIcon } from "@phosphor-icons/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ShareQrCard, SnippetBlock } from "@/components/shared";

interface FormShareDrawerProps {
  formName: string;
  /** The form's hosted URL on the issued collection host; null = no link. */
  url: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FormShareDrawer({
  formName,
  url,
  open,
  onOpenChange,
}: FormShareDrawerProps) {
  const ask = url
    ? `Had a good experience with us? It'd mean a lot — two minutes here: ${url}`
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="flex-row items-start justify-between gap-2 border-b border-border/60 p-4">
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-sm font-semibold">
              Share this form
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-[11px] leading-snug">
              Send the link to a customer, or put the QR where they already are.
            </SheetDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close share drawer"
          >
            <XIcon className="size-3.5" weight="bold" aria-hidden />
          </button>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {!url ? (
            <div className="rounded-lg bg-warning/10 px-3.5 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
              This form has no live public link right now, so there is nothing
              to share yet.
            </div>
          ) : (
            <>
              <SnippetBlock
                title="Form link"
                hint="Anyone with the link can respond."
                code={url}
                actions={
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[10.5px] font-medium text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  >
                    <OpenIcon className="size-3" weight="bold" aria-hidden />
                    Open
                  </a>
                }
              />

              <ShareQrCard
                url={url}
                filename={`semblia-form-${slugifyForFile(formName)}.png`}
                qrTitle={`QR code linking to the ${formName} form`}
                description="Scan to open the form. Print it on receipts, packaging, table tents, or event badges."
              />

              {ask && (
                <SnippetBlock
                  title="Suggested ask"
                  hint="One-liner you can paste into an email or DM."
                  code={ask}
                />
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function slugifyForFile(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "qr"
  );
}
