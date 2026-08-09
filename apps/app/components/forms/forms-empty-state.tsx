"use client";

/**
 * FormsEmptyState — the first-run surface for a project that has never had a
 * form. Distinct from the filtered miss in `form-list`: this one is a value
 * proposition with one decisive action, that one is a way back to the rows the
 * user already has.
 *
 * Composed from the shared `EmptyState` rather than hand-rolled, which is what
 * drops the previous version's shadowed intent-icon cluster — decoration, and a
 * `box-shadow` on something that scrolls with the page.
 */

import * as React from "react";
import { NotePencilIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { EmptyState, GhostList } from "@/components/shared";

export function FormsEmptyState({
  onCreate,
  /**
   * Set when the workspace plan has no form allowance left. The CTA is the only
   * thing on this screen, so the reason (and the way to resolve it) renders
   * beside it — a tooltip on a disabled control would be unreachable, because a
   * disabled control receives no pointer events.
   */
  disabledReason,
}: {
  onCreate: () => void;
  disabledReason?: React.ReactNode;
}) {
  const blocked = disabledReason != null && disabledReason !== false;

  return (
    <EmptyState
      icon={NotePencilIcon}
      title="No forms yet"
      description="Pick what you're collecting and Semblia seeds the questions, copy, and layout."
      preview={<GhostList rows={3} leading="square" trailingPill />}
      action={
        <>
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={onCreate}
            disabled={blocked}
          >
            <PlusIcon className="size-3.5" weight="bold" aria-hidden />
            Create a form
          </Button>
          {blocked && (
            <p className="w-full max-w-sm text-xs text-muted-foreground">
              {disabledReason}
            </p>
          )}
        </>
      }
    />
  );
}
