"use client";

/**
 * Showcase for the canonical data-surface system.
 *
 * Every state a data region can be in renders here side by side, because the
 * defect this system exists to remove was invisible in code review: four
 * surfaces each hand-wrote `loading ? … : items.length === 0 ? <Empty/> : …`,
 * and every one of them independently forgot the error branch. Seeing the full
 * matrix at once is what makes a missing state obvious.
 */

import * as React from "react";
import { ChatCircleText, Plugs } from "@phosphor-icons/react";
import {
  DataList,
  DataTable,
  ListSkeleton,
  GridSkeleton,
  EmptyState,
  NoResults,
  ErrorState,
  GhostList,
  Section,
  SectionStack,
  DefinitionList,
  MetricRow,
  MetricValue,
  StatusBadge,
  StatusDot,
  ItemRow,
  reviewStatusMeta,
  importJobMeta,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtCount, timeAgo } from "@/lib/format";

export function DataStatesSection() {
  return (
    <section id="data-states" className="scroll-mt-20">
      <div className="mb-8 flex items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Data surfaces
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            DataState owns the state union and derives it error-first, so an
            empty state while a query is failing cannot be constructed at a call
            site. Never hand-write a loading/empty ternary.
          </p>
        </div>
        <Badge variant="outline">canonical</Badge>
      </div>

      <div className="space-y-12">
        <StateMatrix />
        <ListShowcase />
        <TableShowcase />
        <StatusShowcase />
        <MetricShowcase />
        <GroupingShowcase />
      </div>
    </section>
  );
}

// ── The state matrix ─────────────────────────────────────────────────────────

function StateMatrix() {
  return (
    <div>
      <BlockHeader
        label="Every state, side by side"
        meta="loading · first-run · filtered · error · forbidden · not-found"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Frame label="loading-initial — skeleton matches the real row">
          <ListSkeleton rows={3} leading="circle" trailing />
        </Frame>

        <Frame label="empty-first-run — one CTA, Verb + Noun">
          <EmptyState
            icon={ChatCircleText}
            title="No responses yet"
            description="Responses are the testimonials people submit through your forms."
            preview={<GhostList rows={2} leading="circle" trailingPill />}
            action={
              <Button size="sm" className="text-xs">
                Share a form to collect
              </Button>
            }
          />
        </Frame>

        <Frame label="empty-filtered — quotes the query, offers a way back">
          <NoResults
            title="Nothing matches “acme”"
            description="No response in needs review has that author, role, or company."
            action={
              <Button size="sm" variant="outline" className="text-xs">
                Clear search and filters
              </Button>
            }
          />
        </Frame>

        <Frame label="error — names the resource, offers retry, hides internals">
          <ErrorState
            resource="responses"
            onRetry={() => {}}
            reference="500-K3F9A2B1"
          />
        </Frame>

        <Frame label="forbidden — no retry; retrying can never succeed">
          <ErrorState resource="billing history" variant="forbidden" />
        </Frame>

        <Frame label="not-found — no retry; names the recovery">
          <ErrorState resource="this widget" variant="not-found" />
        </Frame>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Frame label="compact error — replaces one panel, not the page">
          <div className="px-4">
            <ErrorState
              resource="this panel"
              compact
              align="start"
              onRetry={() => {}}
            />
          </div>
        </Frame>
        <Frame label="loading — card grid">
          <div className="p-4">
            <GridSkeleton tiles={2} />
          </div>
        </Frame>
      </div>
    </div>
  );
}

// ── Lists ────────────────────────────────────────────────────────────────────

const DEMO_ROWS = [
  { id: "1", name: "Ada Lovelace", role: "Founder, Acme", status: "PENDING" },
  { id: "2", name: "Grace Hopper", role: "CTO, Navy", status: "APPROVED" },
  { id: "3", name: "Anonymous", role: null, status: "REJECTED" },
];

function ListShowcase() {
  const [page, setPage] = React.useState(2);
  return (
    <div>
      <BlockHeader
        label="DataList"
        meta="hairline rows · never a card each · pagination from the API envelope"
      />
      <Frame label="populated + pagination">
        <DataList
          aria-label="Demo responses"
          pagination={{
            page,
            pageSize: 20,
            total: 142,
            totalPages: 8,
            onPageChange: setPage,
          }}
        >
          {DEMO_ROWS.map((row) => (
            <ItemRow
              key={row.id}
              padding="default"
              aria-label={row.name}
              leading={
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/12 text-[11px] font-semibold text-brand"
                >
                  {row.name.slice(0, 2).toUpperCase()}
                </span>
              }
              title={
                <span className="text-sm font-medium text-foreground">
                  {row.name}
                </span>
              }
              subtitle={
                <p className="text-xs text-muted-foreground">
                  {/* An absent value is an em dash, never blank, never "N/A". */}
                  {row.role ?? "—"}
                </p>
              }
              trailing={<StatusBadge {...reviewStatusMeta(row.status)} />}
            />
          ))}
        </DataList>
      </Frame>
    </div>
  );
}

// ── Tables ───────────────────────────────────────────────────────────────────

const DEMO_TABLE = [
  { id: "w1", name: "Homepage wall", loads: 18420, clicks: 512 },
  { id: "w2", name: "Pricing carousel", loads: 9310, clicks: 244 },
  { id: "w3", name: "Docs sidebar", loads: 640, clicks: 8 },
];

function TableShowcase() {
  const [sort, setSort] = React.useState<{
    columnId: string;
    direction: "asc" | "desc";
  }>({ columnId: "loads", direction: "desc" });

  const totalLoads = DEMO_TABLE.reduce((sum, r) => sum + r.loads, 0);
  const totalClicks = DEMO_TABLE.reduce((sum, r) => sum + r.clicks, 0);

  return (
    <div>
      <BlockHeader
        label="DataTable"
        meta="numeric right + tabular-nums · units in the header · aggregates in the footer"
      />
      <Frame label="a real table — the task is comparison down a column">
        <div className="px-4 py-2">
          <DataTable
            aria-label="Widget performance"
            rows={DEMO_TABLE}
            getKey={(r) => r.id}
            sort={sort}
            onSortChange={setSort}
            columns={[
              { id: "name", header: "Widget", cell: (r) => r.name },
              {
                id: "loads",
                header: "Loads",
                numeric: true,
                sortable: true,
                cell: (r) => fmtCount(r.loads),
                footer: fmtCount(totalLoads),
              },
              {
                id: "clicks",
                header: "Clicks",
                numeric: true,
                sortable: true,
                cell: (r) => fmtCount(r.clicks),
                footer: fmtCount(totalClicks),
              },
            ]}
          />
        </div>
      </Frame>
    </div>
  );
}

// ── Status ───────────────────────────────────────────────────────────────────

function StatusShowcase() {
  return (
    <div>
      <BlockHeader
        label="StatusBadge · StatusDot"
        meta="one badge per row · dots animate only while transitional"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Frame label="badges — colour carries the signal, no duplicate icon">
          <div className="flex flex-wrap gap-2 p-4">
            {["PENDING", "APPROVED", "REJECTED", "SPAM", "ARCHIVED"].map(
              (s) => (
                <StatusBadge key={s} {...reviewStatusMeta(s)} />
              ),
            )}
            {/* An enum the app doesn't know yet still renders readably. */}
            <StatusBadge {...reviewStatusMeta("QUARANTINED")} />
          </div>
        </Frame>

        <Frame label="dots — pair with time, because a dot has no duration">
          <div className="flex flex-col gap-2 p-4">
            {["RUNNING", "SUCCEEDED", "PARTIAL", "FAILED"].map((s) => {
              const meta = importJobMeta(s);
              return (
                <StatusDot
                  key={s}
                  label={meta.label}
                  tone={meta.tone}
                  transitional={meta.transitional}
                  since={timeAgo(new Date(Date.now() - 12_000))}
                />
              );
            })}
          </div>
        </Frame>
      </div>
    </div>
  );
}

// ── Metrics ──────────────────────────────────────────────────────────────────

function MetricShowcase() {
  return (
    <div>
      <BlockHeader
        label="MetricValue · MetricRow"
        meta="every metric names itself · a known 0 ≠ an unavailable count"
      />
      <Frame label="hairlines between metrics, not a card each">
        <div className="p-4">
          <MetricRow columns={4}>
            <MetricValue
              label="Pending review"
              value={12}
              href="#data-states"
              hint="Awaiting your decision"
            />
            <MetricValue label="Approved" value={148} href="#data-states" />
            {/* A real zero renders as zero. */}
            <MetricValue
              label="Rejected"
              value={0}
              hint="Nothing declined this month"
            />
            {/* An unavailable count renders as a dash, never as zero. */}
            <MetricValue label="Widget loads" value={null} />
          </MetricRow>
        </div>
      </Frame>
    </div>
  );
}

// ── Grouping ─────────────────────────────────────────────────────────────────

function GroupingShowcase() {
  return (
    <div>
      <BlockHeader
        label="Section · DefinitionList"
        meta="grouping without a container — the fix for cards-on-cards"
      />
      <Frame label="sections separate by heading and hairline, never by a border">
        <div className="p-4">
          <SectionStack>
            <Section
              title="Delivery"
              description="Where this project's proof is served from."
              meta="2 hosts"
              actions={
                <Button size="sm" variant="outline" className="text-xs">
                  Add domain
                </Button>
              }
            >
              <DefinitionList
                items={[
                  { term: "Primary host", value: "acme.walls.semblia.com" },
                  { term: "Custom domain", value: "—" },
                  { term: "Verified", value: timeAgo(new Date()) },
                ]}
              />
            </Section>

            <Section title="Integrations" divided>
              <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                <Plugs className="size-3.5" weight="bold" aria-hidden />
                Only GitHub is configured as an OAuth provider today.
              </div>
            </Section>
          </SectionStack>
        </div>
      </Frame>
    </div>
  );
}

// ── Local chrome ─────────────────────────────────────────────────────────────

function BlockHeader({ label, meta }: { label: string; meta?: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
      <h3 className="text-sm font-semibold tracking-tight">{label}</h3>
      {meta && <span className="text-xs text-muted-foreground/80">{meta}</span>}
    </div>
  );
}

function Frame({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-dashed border-border/70">
      <p className="border-b border-border/60 bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
        {label}
      </p>
      <div className="bg-background">{children}</div>
    </div>
  );
}
