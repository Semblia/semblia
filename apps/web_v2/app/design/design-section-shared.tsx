"use client";

/**
 * Showcase for the shared page primitives created in Phase 1 of the
 * web_v2 visual-identity unification.
 *
 * Acts as the visual contract for later phases — every variant of every
 * primitive renders here so regressions are immediately visible.
 */

import * as React from "react";
import {
  PlusIcon as PlusIcon,
  PencilIcon as PencilIcon,
  CopyIcon as CopyIcon,
  PauseIcon as PauseIcon,
  TrashIcon as TrashIcon,
  ArrowSquareOutIcon as ExternalIcon,
  SquaresFourIcon as GridIcon,
  ListBulletsIcon as ListIcon,
  FunnelIcon as FunnelIcon,
} from "@phosphor-icons/react";

import {
  PageHeader,
  HeaderSep,
  HeaderCaption,
  PageBody,
  PageToolbar,
  FilterPills,
  SearchField,
  ItemShell,
  ItemActionRow,
  type FilterPillOption,
  type ItemAction,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ── Section component ────────────────────────────────────────────────────────

export function SharedPrimitivesSection() {
  return (
    <section id="shared-primitives" className="scroll-mt-20">
      <SectionHeader
        title="Shared page primitives"
        description="Phase-1 building blocks: PageHeader, PageBody, PageToolbar, FilterPills, SearchField, ItemShell, ItemActionRow. Every top-level page composes from these."
      />

      <div className="space-y-12">
        <PageHeaderShowcase />
        <PageToolbarShowcase />
        <FilterPillsShowcase />
        <SearchFieldShowcase />
        <ItemShellShowcase />
        <ItemActionRowShowcase />
      </div>
    </section>
  );
}

// ── PageHeader ───────────────────────────────────────────────────────────────

function PageHeaderShowcase() {
  return (
    <div>
      <BlockHeader label="PageHeader" meta="default · compact · with toolbar" />
      <div className="space-y-6">
        <Surface label="default — title + description + actions">
          <PageHeader
            title="Widgets"
            description={
              <>
                <span className="font-mono tabular-nums">2</span> widgets
                <HeaderSep />
                Launchpad
              </>
            }
            actions={
              <>
                <Button variant="outline" size="sm">
                  <PlusIcon className="size-3.5" /> New wall
                </Button>
                <Button size="sm">
                  <PlusIcon className="size-3.5" /> New embed
                </Button>
              </>
            }
            borderless
          />
        </Surface>

        <Surface label="default — with eyebrow + toolbar">
          <PageHeader
            eyebrow="Project"
            title="Analytics"
            description={
              <>
                Last 30 days <HeaderSep /> Updated 12 min ago
              </>
            }
            actions={
              <Button variant="outline" size="sm">
                Compare
              </Button>
            }
            toolbar={
              <>
                <FilterPills
                  variant="tabs"
                  options={[
                    { id: "overview", label: "Overview" },
                    { id: "collection", label: "Collection" },
                    { id: "pipeline", label: "Pipeline" },
                    { id: "engagement", label: "Engagement" },
                  ]}
                  value="overview"
                  onChange={() => {}}
                />
                <HeaderCaption>Last sync 12 min ago</HeaderCaption>
              </>
            }
            borderless
          />
        </Surface>

        <Surface label="compact — split-list inbox header">
          <PageHeader
            density="compact"
            title="Testimonials"
            description={
              <>
                <span className="font-mono tabular-nums">47</span> total
                <HeaderSep />
                <span className="text-warning">3 pending</span>
              </>
            }
            actions={
              <Button variant="ghost" size="xs">
                Bulk select
              </Button>
            }
            borderless
          />
        </Surface>
      </div>
    </div>
  );
}

// ── PageToolbar ──────────────────────────────────────────────────────────────

function PageToolbarShowcase() {
  const [search, setSearch] = React.useState("");
  const [view, setView] = React.useState<"list" | "card">("card");

  return (
    <div>
      <BlockHeader
        label="PageToolbar"
        meta="sticky · search + filters + view toggle"
      />
      <Surface label="search + view toggle">
        <PageToolbar
          stickyTop="0"
          leading={
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search projects…"
            />
          }
          trailing={
            <FilterPills
              size="sm"
              options={[
                { id: "list", label: "List", icon: ListIcon },
                { id: "card", label: "Card", icon: GridIcon },
              ]}
              value={view}
              onChange={(v) => setView(v as "list" | "card")}
            />
          }
        />
      </Surface>
    </div>
  );
}

// ── FilterPills ──────────────────────────────────────────────────────────────

function FilterPillsShowcase() {
  const [pill, setPill] = React.useState("all");
  const [tab, setTab] = React.useState("overview");

  const widgetOptions: FilterPillOption[] = [
    { id: "all", label: "All", count: 6 },
    { id: "embeds", label: "Embeds", count: 3 },
    { id: "walls", label: "Walls", count: 2 },
    { id: "carousels", label: "Carousels", count: 1 },
  ];

  const analyticsTabs: FilterPillOption[] = [
    { id: "overview", label: "Overview" },
    { id: "collection", label: "Collection" },
    { id: "pipeline", label: "Pipeline" },
    { id: "engagement", label: "Engagement" },
    { id: "sources", label: "Sources" },
  ];

  return (
    <div>
      <BlockHeader label="FilterPills" meta="pill (default) · tabs" />
      <div className="space-y-4">
        <Surface label="pill — for filters with counts">
          <div className="p-4">
            <FilterPills
              options={widgetOptions}
              value={pill}
              onChange={setPill}
            />
          </div>
        </Surface>

        <Surface label="tabs — for section navigation">
          <div className="px-4">
            <FilterPills
              variant="tabs"
              options={analyticsTabs}
              value={tab}
              onChange={setTab}
            />
          </div>
        </Surface>
      </div>
    </div>
  );
}

// ── SearchField ──────────────────────────────────────────────────────────────

function SearchFieldShowcase() {
  const [a, setA] = React.useState("");
  const [b, setB] = React.useState("Notion");

  return (
    <div>
      <BlockHeader label="SearchField" meta="empty · with value" />
      <Surface label="">
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          <SearchField value={a} onChange={setA} placeholder="Empty state…" />
          <SearchField value={b} onChange={setB} placeholder="Empty state…" />
        </div>
      </Surface>
    </div>
  );
}

// ── ItemShell ────────────────────────────────────────────────────────────────

function ItemShellShowcase() {
  const [selected, setSelected] = React.useState<string>("a");

  return (
    <div>
      <BlockHeader
        label="ItemShell"
        meta="card · row · selected · inactive · stripe"
      />
      <div className="space-y-6">
        <Surface label="card — neutral / brand stripe / inactive">
          <div className="grid gap-4 p-4 sm:grid-cols-3">
            <ItemShell shape="card" onClick={() => {}} className="p-4">
              <div className="space-y-1.5">
                <p className="text-sm font-semibold">Card · interactive</p>
                <p className="text-xs text-muted-foreground">
                  Hover to see border + shadow lift.
                </p>
              </div>
            </ItemShell>
            <ItemShell
              shape="card"
              accentColor="#a8895c"
              onClick={() => {}}
              className="p-4"
            >
              <div className="space-y-1.5">
                <p className="text-sm font-semibold">Card · brand stripe</p>
                <p className="text-xs text-muted-foreground">
                  3 px brand-color stripe on the left edge.
                </p>
              </div>
            </ItemShell>
            <ItemShell shape="card" inactive className="p-4">
              <div className="space-y-1.5">
                <p className="text-sm font-semibold">Card · inactive</p>
                <p className="text-xs text-muted-foreground">
                  Faded for paused widgets / forms.
                </p>
              </div>
            </ItemShell>
          </div>
        </Surface>

        <Surface label="row — divider · selected · stripe · bulk-selected">
          <div className="bg-card">
            {[
              {
                id: "a",
                label: "Default Form",
                desc: "Primary collection form",
              },
              { id: "b", label: "Mobile Form", desc: "Optimised for handheld" },
              { id: "c", label: "Internal QA", desc: "Restricted to staff" },
            ].map((row) => (
              <ItemShell
                key={row.id}
                shape="row"
                accentColor={row.id === "a" ? "var(--brand)" : null}
                selected={selected === row.id}
                onClick={() => setSelected(row.id)}
                className="px-4 py-3"
              >
                <div className="flex flex-1 flex-col">
                  <span className="text-xs font-medium text-foreground">
                    {row.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {row.desc}
                  </span>
                </div>
                <span className="self-center text-[11px] text-muted-foreground">
                  click row to select
                </span>
              </ItemShell>
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}

// ── ItemActionRow ────────────────────────────────────────────────────────────

function ItemActionRowShowcase() {
  const actions: ItemAction[] = [
    { id: "edit", label: "Edit", icon: PencilIcon, onSelect: () => {} },
    { id: "open", label: "Open", icon: ExternalIcon, onSelect: () => {} },
    { id: "duplicate", label: "Duplicate", icon: CopyIcon, onSelect: () => {} },
    {
      id: "pause",
      label: "Pause",
      icon: PauseIcon,
      tone: "warning",
      onSelect: () => {},
    },
    {
      id: "delete",
      label: "Delete",
      icon: TrashIcon,
      tone: "danger",
      onSelect: () => {},
    },
  ];

  return (
    <div>
      <BlockHeader
        label="ItemActionRow"
        meta="container-aware overflow → menu collapse"
      />
      <Surface label="four widths — observe how non-pinned actions collapse into a menu">
        <div className="flex flex-col gap-3 p-4">
          {[640, 420, 320, 240].map((w) => (
            <div key={w} className="flex items-center gap-3">
              <code className="w-16 shrink-0 font-mono text-[10px] text-muted-foreground">
                {w}px
              </code>
              <div
                style={{ width: w, maxWidth: "100%" }}
                className="rounded-lg border border-border bg-background px-3 py-2"
              >
                <ItemActionRow actions={actions} collapseUnder={340} />
              </div>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}

// ── Local helpers ────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 border-b border-border pb-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <Badge variant="outline">phase-1</Badge>
    </div>
  );
}

function BlockHeader({ label, meta }: { label: string; meta?: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h3 className="text-sm font-semibold tracking-tight">{label}</h3>
      {meta && (
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
          {meta}
        </span>
      )}
    </div>
  );
}

function Surface({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20">
      {label && (
        <p className="border-b border-border/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
          {label}
        </p>
      )}
      <div className="overflow-hidden bg-background">{children}</div>
    </div>
  );
}

// Suppress unused warning (kept for potential future variants)
void FunnelIcon;
void PageBody;
