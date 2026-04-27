"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { fmtNum, fmtRelative } from "@/lib/format";
import type { MockApiKey, MockApiKeyEvent } from "@/lib/mock-data";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowsClockwiseIcon,
  ProhibitIcon,
  ClockIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  PageHeader,
  PageBody,
  PageToolbar,
  FilterPills,
  PageTabs,
} from "@/components/shared";
import {
  useApiKey,
  useApiKeyEvents,
  type EventFilter,
} from "@/hooks/use-api-keys";
import { CreateKeyDialog } from "./create-key-dialog";

/* ─── Tab type ────────────────────────────────────────────────────────────── */

type Tab = "overview" | "activity" | "settings";

/* ─── KPI card ────────────────────────────────────────────────────────────── */

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/* ─── Usage chart ─────────────────────────────────────────────────────────── */

function UsageChart({ data }: { data: MockApiKey["dailyUsage"] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-xs text-muted-foreground">No usage data yet</p>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.count, 0);
  const peak = Math.max(...data.map((d) => d.count));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Calls (30d)" value={fmtNum(total)} />
        <KpiCard label="Peak day" value={fmtNum(peak)} />
        <KpiCard
          label="Daily avg"
          value={fmtNum(Math.round(total / Math.max(data.length, 1)))}
        />
        <KpiCard
          label="Trend"
          value={
            data.length >= 2
              ? data[data.length - 1].count >= data[data.length - 2].count
                ? "↑"
                : "↓"
              : "—"
          }
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-3 text-xs font-medium text-muted-foreground">
          Daily requests — last 30 days
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
          >
            <defs>
              <linearGradient id="keyUsageGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(d: string) => {
                const dt = new Date(d);
                return `${dt.getMonth() + 1}/${dt.getDate()}`;
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => fmtNum(v)}
            />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 6,
              }}
              labelFormatter={(l) =>
                typeof l === "string"
                  ? new Date(l).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : String(l)
              }
            />
            <Area
              type="monotone"
              dataKey="count"
              name="Requests"
              stroke="var(--brand)"
              strokeWidth={1.5}
              fill="url(#keyUsageGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Activity tab ────────────────────────────────────────────────────────── */

const EVENT_LABELS: Record<MockApiKeyEvent["type"], string> = {
  created: "Created",
  used: "Used",
  revoked: "Revoked",
  rotated: "Rotated",
  limit_hit: "Limit hit",
};

const EVENT_TONE: Record<MockApiKeyEvent["type"], string> = {
  created: "text-emerald-600 dark:text-emerald-400",
  used: "text-foreground",
  revoked: "text-destructive",
  rotated: "text-amber-600 dark:text-amber-400",
  limit_hit: "text-destructive",
};

function ActivityTab({ keyId }: { keyId: string }) {
  const { events, allEvents, loading, filter, setFilter } =
    useApiKeyEvents(keyId);

  if (loading) {
    return (
      <div className="space-y-2 py-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full animate-shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FilterPills<EventFilter>
        options={[
          { id: "all", label: "All", count: allEvents.length },
          {
            id: "used",
            label: "Used",
            count: allEvents.filter((e) => e.type === "used").length,
          },
          {
            id: "limit_hit",
            label: "Limit hits",
            count: allEvents.filter((e) => e.type === "limit_hit").length,
          },
          {
            id: "lifecycle",
            label: "Lifecycle",
            count: allEvents.filter((e) =>
              ["created", "revoked", "rotated"].includes(e.type),
            ).length,
          },
        ]}
        value={filter}
        onChange={setFilter}
        aria-label="Filter events"
      />

      {events.length === 0 ? (
        <Empty className="py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClockIcon weight="bold" />
            </EmptyMedia>
            <EmptyTitle>Quiet so far</EmptyTitle>
            <EmptyDescription>Calls will show up here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Time</TableHead>
              <TableHead className="text-xs">Event</TableHead>
              <TableHead className="text-xs hidden sm:table-cell">IP</TableHead>
              <TableHead className="text-xs hidden md:table-cell">
                Origin
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((ev) => (
              <TableRow key={ev.id}>
                <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                  {fmtRelative(ev.at)}
                </TableCell>
                <TableCell>
                  <span
                    className={cn("text-xs font-medium", EVENT_TONE[ev.type])}
                  >
                    {EVENT_LABELS[ev.type]}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-[11px] text-muted-foreground hidden sm:table-cell">
                  {ev.ip ?? "—"}
                </TableCell>
                <TableCell className="font-mono text-[11px] text-muted-foreground hidden md:table-cell truncate max-w-[200px]">
                  {ev.origin ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

/* ─── Settings tab ────────────────────────────────────────────────────────── */

function ChipInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = React.useState("");

  function commit() {
    const val = input.trim();
    if (!val || values.includes(val)) return;
    onChange([...values, val]);
    setInput("");
  }

  return (
    <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm focus-within:ring-1 focus-within:ring-ring min-h-9">
      {values.map((v) => (
        <span
          key={v}
          className="flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[11px]"
        >
          {v}
          <button
            type="button"
            onClick={() => onChange(values.filter((x) => x !== v))}
            className="text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Backspace" && !input && values.length)
            onChange(values.slice(0, -1));
        }}
        onBlur={commit}
        placeholder={values.length === 0 ? placeholder : undefined}
        className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

const RATE_PRESETS = [10, 60, 600, 3000];

function SettingsTab({
  entry,
  onSave,
  onRevoke,
  saving,
}: {
  entry: MockApiKey;
  onSave: (patch: Partial<MockApiKey>) => void;
  onRevoke: () => void;
  saving: boolean;
}) {
  const [name, setName] = React.useState(entry.name);
  const [origins, setOrigins] = React.useState(entry.allowedOrigins);
  const [ips, setIps] = React.useState(entry.allowedIps ?? []);
  const [rateLimit, setRateLimit] = React.useState(entry.rateLimit);
  const [revokeOpen, setRevokeOpen] = React.useState(false);

  const isDirty =
    name !== entry.name ||
    JSON.stringify(origins) !== JSON.stringify(entry.allowedOrigins) ||
    JSON.stringify(ips) !== JSON.stringify(entry.allowedIps ?? []) ||
    rateLimit !== entry.rateLimit;

  const rateLabelIdx = RATE_PRESETS.indexOf(rateLimit);
  const sliderValue =
    rateLabelIdx >= 0
      ? rateLabelIdx
      : RATE_PRESETS.findIndex((v) => v >= rateLimit);

  return (
    <div className="space-y-6 pb-16">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="settings-name">Key name</Label>
        <Input
          id="settings-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
        />
      </div>

      {/* Origins / IPs */}
      {entry.type === "publishable" ? (
        <div className="space-y-1.5">
          <Label>Allowed origins</Label>
          <ChipInput
            values={origins}
            onChange={setOrigins}
            placeholder="https://example.com"
          />
          <p className="text-[11px] text-muted-foreground">
            Leave empty to allow all origins.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label>IP allowlist</Label>
          <ChipInput
            values={ips}
            onChange={setIps}
            placeholder="203.0.113.0/24"
          />
          <p className="text-[11px] text-muted-foreground">
            Leave empty to allow any IP.
          </p>
        </div>
      )}

      {/* Rate limit */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Rate limit</Label>
          <span className="font-mono text-xs text-muted-foreground">
            {rateLimit} req/min
          </span>
        </div>
        <Slider
          min={0}
          max={RATE_PRESETS.length - 1}
          step={1}
          value={[Math.max(0, sliderValue >= 0 ? sliderValue : 0)]}
          onValueChange={([i]) => setRateLimit(RATE_PRESETS[i]!)}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          {RATE_PRESETS.map((v) => (
            <span key={v}>{v}/m</span>
          ))}
        </div>
      </div>

      {/* Save bar */}
      {isDirty && (
        <div className="sticky bottom-0 flex items-center justify-end gap-2 rounded-lg border border-border bg-background/95 px-4 py-2.5 shadow-sm backdrop-blur">
          <span className="mr-auto text-xs text-muted-foreground">
            Unsaved changes
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setName(entry.name);
              setOrigins(entry.allowedOrigins);
              setIps(entry.allowedIps ?? []);
              setRateLimit(entry.rateLimit);
            }}
          >
            Discard
          </Button>
          <Button
            size="sm"
            disabled={saving}
            onClick={() =>
              onSave({
                name,
                allowedOrigins: origins,
                allowedIps: ips.length ? ips : null,
                rateLimit,
              })
            }
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      )}

      {/* Danger zone */}
      <div className="rounded-lg border border-destructive/40 p-4 space-y-3">
        <p className="text-xs font-semibold text-destructive">Danger zone</p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Revoke this key</p>
            <p className="text-xs text-muted-foreground">
              This key stops working immediately. You can&apos;t undo it.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            disabled={!entry.isActive}
            onClick={() => setRevokeOpen(true)}
          >
            Revoke
          </Button>
        </div>
      </div>

      <ConfirmationDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        intent="danger"
        title={<>Revoke &ldquo;{entry.name}&rdquo;?</>}
        description="This key stops working immediately. You can't undo it."
        cancelLabel="Keep key"
        confirmLabel="Revoke key"
        onConfirm={onRevoke}
      />
    </div>
  );
}

/* ─── Main detail client ──────────────────────────────────────────────────── */

export function ApiKeyDetailClient({
  keyId,
  slug,
  projectName,
}: {
  keyId: string;
  slug: string;
  projectName: string;
}) {
  const { key, loading, update, revoke, rotate } = useApiKey(keyId);
  const [tab, setTab] = React.useState<Tab>("overview");
  const [saving, setSaving] = React.useState(false);
  const [rotateOpen, setRotateOpen] = React.useState(false);
  const [rotatePlaintext, setRotatePlaintext] = React.useState<string | null>(
    null,
  );

  async function handleSave(patch: Partial<MockApiKey>) {
    setSaving(true);
    try {
      await update(patch as Parameters<typeof update>[0]);
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke() {
    await revoke();
  }

  async function handleRotate() {
    const result = await rotate();
    setRotatePlaintext(result.plaintext);
  }

  if (loading || !key) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader
          title={<Skeleton className="h-5 w-40 animate-shimmer" />}
          description={<Skeleton className="h-3.5 w-56 animate-shimmer" />}
        />
        <PageBody padding="default" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-20 w-full animate-shimmer rounded-lg"
              />
            ))}
          </div>
          <Skeleton className="h-48 w-full animate-shimmer rounded-lg" />
        </PageBody>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={key.name}
        description={
          <span className="font-mono text-[11px]">
            {key.keyPrefix}••••{key.lastFourPlaintext}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setRotateOpen(true)}
            >
              <ArrowsClockwiseIcon className="size-3.5" aria-hidden />
              Rotate
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5 text-xs"
              disabled={!key.isActive}
              onClick={handleRevoke}
            >
              <ProhibitIcon className="size-3.5" aria-hidden />
              Revoke
            </Button>
          </div>
        }
      />

      <PageToolbar
        leading={
          <PageTabs<Tab>
            options={[
              { id: "overview", label: "Overview" },
              { id: "activity", label: "Activity" },
              { id: "settings", label: "Settings" },
            ]}
            value={tab}
            onChange={setTab}
            aria-label="Key detail tabs"
          />
        }
      />

      <PageBody padding="default" className="overflow-y-auto">
        {tab === "overview" && <UsageChart data={key.dailyUsage} />}
        {tab === "activity" && <ActivityTab keyId={keyId} />}
        {tab === "settings" && (
          <SettingsTab
            entry={key}
            onSave={handleSave}
            onRevoke={handleRevoke}
            saving={saving}
          />
        )}
      </PageBody>

      <ConfirmationDialog
        open={rotateOpen}
        onOpenChange={setRotateOpen}
        intent="warning"
        title={<>Rotate &ldquo;{key.name}&rdquo;?</>}
        description="Rotating creates a new key and revokes this one in 24 hours. Update your servers before then."
        cancelLabel="Cancel"
        confirmLabel="Rotate key"
        onConfirm={handleRotate}
      />

      {/* Show new key after rotate */}
      {rotatePlaintext != null && (
        <CreateKeyDialog
          open={true}
          initialType={key.type}
          projectId={key.projectId}
          onOpenChange={(open) => {
            if (!open) setRotatePlaintext(null);
          }}
        />
      )}
    </div>
  );
}
