"use client";

/**
 * SourcePicker — choose where the proof is coming from, first.
 *
 * Every import method used to open on its form and hide the source inside a
 * `<select>` two fields down: a dropdown of up to fifteen text labels, opened
 * after you had already started filling in a form for a source you hadn't
 * named yet. That is backwards. Naming the platform is the first decision a
 * person makes ("I want my Senja wall"), so it is the first thing on screen,
 * as a grid of marks you recognize rather than a list you read, with a search
 * box for the long tail.
 *
 * A source that can't succeed keeps its place and says why (the standing rule:
 * never present a source that cannot succeed as an inviting logo) — but it is
 * still pickable when picking it leads somewhere useful, which for a connected
 * platform is the page that explains what setup it needs.
 */

import * as React from "react";
import { CaretUpDownIcon } from "@phosphor-icons/react";
import type { V2ImportCatalogSourceDTO } from "@workspace/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  SearchField,
  StatusDot,
  importAvailabilityMeta,
  type StatusMeta,
} from "@/components/shared";
import { SourceMark } from "./source-icons";

/** Free-text match over everything a person might type to find a source. */
function matches(source: V2ImportCatalogSourceDTO, query: string): boolean {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return true;
  return (
    source.label.toLocaleLowerCase().includes(q) ||
    source.key.toLocaleLowerCase().includes(q) ||
    // Typing a domain is the other way people name a platform.
    source.publicHosts.some((host) => host.toLocaleLowerCase().includes(q)) ||
    source.publicHostSuffixes.some((s) => s.toLocaleLowerCase().includes(q))
  );
}

/** What a tile says about itself, in the shared status vocabulary. */
export interface SourceStatus extends StatusMeta {
  transitional?: boolean;
}

export interface SourcePickerProps {
  sources: V2ImportCatalogSourceDTO[];
  /** The committed source key, if one has been chosen. */
  value?: string | null;
  onPick: (source: V2ImportCatalogSourceDTO) => void;
  /**
   * Per-source state the caller knows and the catalog does not — chiefly "this
   * project is already collecting from here". Overrides the catalog's static
   * availability for that tile.
   */
  statusFor?: (source: V2ImportCatalogSourceDTO) => SourceStatus | null;
  /** Shown above the grid. Search appears only once the list is long enough. */
  label: string;
  /**
   * A caveat the whole grid shares, under the heading. Said once here it is
   * information; repeated under every tile it is wallpaper.
   */
  note?: React.ReactNode;
  searchPlaceholder?: string;
  /** Below this many sources, a search box is more furniture than help. */
  searchThreshold?: number;
  /** Widest column count. Two for narrow containers such as a popover. */
  columns?: 2 | 3;
  /**
   * Whether a tile states its availability.
   *
   * On by default, because picking a source usually *runs* an import and a
   * source that can't run one has to say so. Off where the choice is only
   * attribution — labelling a pasted testimonial "Trustpilot" doesn't need
   * Trustpilot's API to be connected, so "Setup required" there is a warning
   * about nothing.
   */
  showAvailability?: boolean;
  className?: string;
}

export function SourcePicker({
  sources,
  value = null,
  onPick,
  statusFor,
  label,
  note,
  searchPlaceholder = "Search platforms…",
  searchThreshold = 8,
  columns = 3,
  showAvailability = true,
  className,
}: SourcePickerProps) {
  const [query, setQuery] = React.useState("");
  const searchable = sources.length >= searchThreshold;
  const visible = React.useMemo(
    () => (searchable ? sources.filter((s) => matches(s, query)) : sources),
    [searchable, sources, query],
  );

  const headingId = React.useId();

  return (
    <section className={cn("space-y-3", className)} aria-labelledby={headingId}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id={headingId}
          className="text-[13px] font-medium tracking-tight text-foreground"
        >
          {label}
        </h2>
        {searchable && (
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={searchPlaceholder}
            ariaLabel={searchPlaceholder}
            width="fixed"
            className="min-w-40"
          />
        )}
      </div>

      {note && (
        <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
          {note}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Nothing matches &ldquo;{query.trim()}&rdquo;. Every platform Semblia
          can read is in this list — if yours isn&apos;t here, add the proof
          manually.
        </p>
      ) : (
        // The grid grows with the page rather than stopping at three: the
        // method pages are full-bleed now, and a 3-column grid on a 1600 px
        // screen is the cramped column this replaced. Columns are capped by
        // the longest name the catalog actually has ("Google Business
        // Profile"), which needs the tile to stay wider than ~15rem — hence
        // five at 2xl, not six.
        <ul
          className={cn(
            "grid grid-cols-1 gap-2.5 sm:grid-cols-2",
            columns === 3 && "lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
          )}
        >
          {visible.map((source) => (
            <li key={source.key}>
              <SourceTile
                source={source}
                selected={source.key === value}
                showAvailability={showAvailability}
                status={statusFor?.(source) ?? null}
                onPick={() => onPick(source)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * One source. The tile *is* the entity, which is the sanctioned case for a
 * bordered container, and it carries exactly two things: the mark and the name.
 * State rides as a dot rather than a sentence — fifteen copies of the same
 * caveat under fifteen tiles is wallpaper; the method page states the shared
 * reason once, above the grid.
 *
 * `status` wins over the catalog's availability when the caller knows something
 * the catalog does not. The catalog's `availability` is a fact about Semblia
 * ("this provider's OAuth app is not configured"), not about this project, so
 * a project that already has a live connection to a source must not keep being
 * told to set it up.
 */
function SourceTile({
  source,
  selected,
  showAvailability,
  status,
  onPick,
}: {
  source: V2ImportCatalogSourceDTO;
  selected: boolean;
  showAvailability: boolean;
  status: SourceStatus | null;
  onPick: () => void;
}) {
  const availability = importAvailabilityMeta(source.availability);
  const catalogBlocked = source.availability !== "AVAILABLE";
  const shown: SourceStatus | null =
    status ?? (showAvailability && catalogBlocked ? availability : null);
  // Grey the mark only for a source that genuinely cannot run right now — a
  // connected one is the opposite of unavailable.
  const muted = !status && showAvailability && catalogBlocked;

  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className={cn(
        "flex h-full w-full items-center gap-3 rounded-xl border bg-card px-3.5 py-3 text-left outline-none",
        "transition-[background,border-color] duration-(--duration-fast)",
        "hover:border-foreground/25 hover:bg-muted/30",
        "focus-visible:ring-2 focus-visible:ring-ring/40",
        selected ? "border-foreground/35 bg-muted/40" : "border-border",
      )}
    >
      <SourceMark
        sourceKey={source.key}
        label={source.label}
        muted={muted}
        size="md"
      />
      <span className="min-w-0 flex-1">
        {/* Wraps to a second line rather than truncating: a platform name is
            the entire content of this tile, and half of one is not a choice. */}
        <span className="block text-[13px] font-medium leading-tight text-foreground">
          {source.label}
        </span>
        {shown && (
          <span className="mt-1 flex items-center">
            <StatusDot
              label={shown.label}
              tone={shown.tone}
              transitional={shown.transitional}
            />
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * The same picker as a field, for the one place the source is optional
 * attribution rather than a gate.
 *
 * Still a grid of marks with search behind the trigger, not a `<select>` of
 * forty text labels — the list is the same list, and scanning forty platform
 * names to find "Trustpilot" is the same problem wherever it appears.
 */
export function SourceSelect({
  sources,
  value,
  onPick,
  id,
  triggerLabel,
  pickerLabel,
}: {
  sources: V2ImportCatalogSourceDTO[];
  value: V2ImportCatalogSourceDTO;
  onPick: (source: V2ImportCatalogSourceDTO) => void;
  id?: string;
  triggerLabel: string;
  pickerLabel: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-label={triggerLabel}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left outline-none",
            "transition-[border-color,background] duration-(--duration-fast)",
            "hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring/40",
          )}
        >
          <SourceMark
            sourceKey={value.key}
            label={value.label}
            size="sm"
            className="size-6"
          />
          <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
            {value.label}
          </span>
          <CaretUpDownIcon
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-[24rem] w-[min(34rem,calc(100vw-2rem))] overflow-y-auto p-3"
      >
        <SourcePicker
          sources={sources}
          value={value.key}
          label={pickerLabel}
          searchThreshold={6}
          columns={2}
          showAvailability={false}
          onPick={(source) => {
            onPick(source);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * The chosen source, restated at the top of the step it unlocked, with the way
 * back to the grid. A committed choice that scrolls out of sight is a choice
 * the user has to remember; a chip that can't be changed is a trap.
 */
export function SourceChip({
  source,
  onChange,
  changeLabel = "Change",
}: {
  source: V2ImportCatalogSourceDTO;
  onChange: () => void;
  changeLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border pb-4">
      <SourceMark
        sourceKey={source.key}
        label={source.label}
        size="sm"
        muted={source.availability !== "AVAILABLE"}
      />
      <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
        {source.label}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onChange}
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        {changeLabel}
      </Button>
    </div>
  );
}
