"use client";

/**
 * ItemActionRow — overflow-aware action row used inside cards and rows.
 *
 * Solves the widget-gallery responsive bug: cards under ~340 px wide were
 * overflowing because their always-visible 6-button action row didn't fit.
 *
 * Behaviour:
 *   • At/above the configured threshold: render every action inline.
 *   • Below threshold: keep the first N actions inline and collapse the rest
 *     into a "More" dropdown menu.
 *   • Destructive ("danger") actions can be flagged `pinned` so they stay
 *     outside the menu (matches the trash icon UX in WidgetCard).
 *
 * Width is observed via ResizeObserver on the row's own container, so the
 * component is responsive to its parent — sidebar collapse, viewport resize,
 * and grid reflow all work without media queries.
 */

import * as React from "react";
import Link from "next/link";
import {
  DotsThreeVertical as MoreIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useContainerWidth } from "@/hooks/use-container-width";

export type ActionTone = "neutral" | "success" | "warning" | "danger";

export interface ItemAction {
  /** Stable key for React. */
  id: string;
  /** Visible label. */
  label: string;
  /** Phosphor icon component (optional). */
  icon?: PhosphorIcon;
  /** Click handler — provide either onSelect or href. */
  onSelect?: () => void;
  /**
   * Navigation link target — renders the action as a `<Link>` instead of a
   * button. Use for primary actions like "Edit" that route to a deep page.
   */
  href?: string;
  /** Tone — drives hover color via ActionButton. */
  tone?: ActionTone;
  /** Keep this action inline when collapsed. Defaults to false. */
  pinned?: boolean;
  /** Render as an icon-only inline button (label becomes aria-label). */
  iconOnly?: boolean;
  /** Disable the action. */
  disabled?: boolean;
}

export interface ItemActionRowProps {
  actions: ItemAction[];
  /** Container width threshold; below this width, non-pinned actions collapse. */
  collapseUnder?: number;
  /** When collapsed, how many of the leading actions stay inline. */
  visibleWhenCollapsed?: number;
  /** Optional content rendered before the action group (e.g. a status pill). */
  leading?: React.ReactNode;
  /** Optional content rendered after the action group (e.g. a separator). */
  trailing?: React.ReactNode;
  /** Visual size of the inline buttons. Defaults to "xs". */
  size?: "xs" | "sm";
  className?: string;
}

const TONE_TEXT: Record<ActionTone, string> = {
  neutral: "text-muted-foreground hover:text-foreground",
  success: "text-muted-foreground hover:text-success",
  warning: "text-muted-foreground hover:text-warning",
  danger: "text-muted-foreground hover:text-destructive",
};

export function ItemActionRow({
  actions,
  collapseUnder = 340,
  visibleWhenCollapsed = 2,
  leading,
  trailing,
  size = "xs",
  className,
}: ItemActionRowProps) {
  const [containerRef, width] = useContainerWidth<HTMLDivElement>();
  // Prevent SSR/initial-mount jitter — start collapsed only once we've measured.
  const measured = width > 0;
  const shouldCollapse = measured && width < collapseUnder;

  // Split actions into "inline" and "menu" buckets.
  const { inline, menu } = React.useMemo(() => {
    if (!shouldCollapse) {
      return { inline: actions, menu: [] as ItemAction[] };
    }
    const pinned = actions.filter((a) => a.pinned);
    const unpinned = actions.filter((a) => !a.pinned);
    const lead = unpinned.slice(
      0,
      Math.max(0, visibleWhenCollapsed - pinned.length),
    );
    const rest = unpinned.slice(lead.length);
    return { inline: [...lead, ...pinned], menu: rest };
  }, [actions, shouldCollapse, visibleWhenCollapsed]);

  return (
    <div
      ref={containerRef}
      className={cn("flex w-full items-center gap-1", className)}
      data-collapsed={shouldCollapse || undefined}
    >
      {leading}

      <div className="flex min-w-0 flex-1 items-center gap-1">
        {inline.map((action) => (
          <InlineAction key={action.id} action={action} size={size} />
        ))}
      </div>

      {menu.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size={size === "xs" ? "icon-xs" : "icon-sm"}
              className="text-muted-foreground hover:text-foreground"
              aria-label="More actions"
            >
              <MoreIcon className="size-3.5" weight="bold" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            {menu.map((action) => {
              const Icon = action.icon;
              const inner = (
                <>
                  {Icon && (
                    <Icon className="size-3.5" weight="bold" aria-hidden />
                  )}
                  {action.label}
                </>
              );
              if (action.href) {
                return (
                  <DropdownMenuItem
                    key={action.id}
                    asChild
                    disabled={action.disabled}
                    variant={
                      action.tone === "danger" ? "destructive" : "default"
                    }
                    className="gap-2 text-xs"
                  >
                    <Link href={action.href}>{inner}</Link>
                  </DropdownMenuItem>
                );
              }
              return (
                <DropdownMenuItem
                  key={action.id}
                  onSelect={() => action.onSelect?.()}
                  disabled={action.disabled}
                  variant={action.tone === "danger" ? "destructive" : "default"}
                  className="gap-2 text-xs"
                >
                  {inner}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {trailing}
    </div>
  );
}

function InlineAction({
  action,
  size,
}: {
  action: ItemAction;
  size: "xs" | "sm";
}) {
  const Icon = action.icon;
  const tone = action.tone ?? "neutral";
  const isLink = typeof action.href === "string";

  // Icon-only variant
  if (action.iconOnly) {
    const buttonProps = {
      variant: "ghost" as const,
      size: (size === "xs" ? "icon-xs" : "icon-sm") as "icon-xs" | "icon-sm",
      "aria-label": action.label,
      className: cn(TONE_TEXT[tone]),
    };
    if (isLink) {
      return (
        <Button asChild {...buttonProps}>
          <Link href={action.href!} onClick={(e) => e.stopPropagation()}>
            {Icon ? <Icon className="size-3.5" weight="bold" aria-hidden /> : action.label}
          </Link>
        </Button>
      );
    }
    return (
      <Button
        type="button"
        {...buttonProps}
        onClick={(e) => {
          e.stopPropagation();
          action.onSelect?.();
        }}
        disabled={action.disabled}
      >
        {Icon ? <Icon className="size-3.5" weight="bold" aria-hidden /> : action.label}
      </Button>
    );
  }

  // Label + icon variant
  const labelButtonProps = {
    variant: "ghost" as const,
    size,
    className: cn("gap-1 px-2", TONE_TEXT[tone]),
  };
  if (isLink) {
    return (
      <Button asChild {...labelButtonProps}>
        <Link href={action.href!} onClick={(e) => e.stopPropagation()}>
          {Icon && <Icon className="size-3" weight="bold" aria-hidden />}
          {action.label}
        </Link>
      </Button>
    );
  }
  return (
    <Button
      type="button"
      {...labelButtonProps}
      onClick={(e) => {
        e.stopPropagation();
        action.onSelect?.();
      }}
      disabled={action.disabled}
    >
      {Icon && <Icon className="size-3" weight="bold" aria-hidden />}
      {action.label}
    </Button>
  );
}
