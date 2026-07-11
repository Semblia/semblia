"use client";

import { Section, Demo } from "./design-helpers";

export function TypographySection() {
  return (
    <Section
      id="typography"
      title="Typography"
      description="Font families, size scale, weight, and line-height utilities."
    >
      <div className="space-y-8">
        <Demo label="Headings">
          <div className="w-full space-y-3">
            <h1 className="text-4xl font-bold tracking-tight">
              Display / H1 — The quick brown fox
            </h1>
            <h2 className="text-3xl font-semibold tracking-tight">
              H2 — Jumps over the lazy dog
            </h2>
            <h3 className="text-2xl font-semibold">
              H3 — Design systems matter
            </h3>
            <h4 className="text-xl font-medium">
              H4 — Consistency at every pixel
            </h4>
            <h5 className="text-lg font-medium">H5 — Thoughtful components</h5>
            <h6 className="text-base font-medium">H6 — Radix Nova style</h6>
          </div>
        </Demo>

        <Demo label="Body Sizes">
          <div className="w-full space-y-2">
            <p className="text-xl">
              text-xl — Large body for hero sections and lead paragraphs.
            </p>
            <p className="text-lg">
              text-lg — Section intros and prominent descriptions.
            </p>
            <p className="text-base">
              text-base — Default body text for general content.
            </p>
            <p className="text-sm">
              text-sm — UI labels, card bodies, and secondary content.
            </p>
            <p className="text-xs">text-xs — Captions, timestamps, metadata.</p>
            <p className="font-mono text-sm text-muted-foreground">
              font-mono — Code, keys, and technical strings.
            </p>
          </div>
        </Demo>

        <Demo label="Weights & Styles">
          <div className="w-full space-y-2">
            <p className="font-light">font-light — Light weight 300</p>
            <p className="font-normal">font-normal — Regular weight 400</p>
            <p className="font-medium">font-medium — Medium weight 500</p>
            <p className="font-semibold">font-semibold — Semibold weight 600</p>
            <p className="font-bold">font-bold — Bold weight 700</p>
            <p className="italic">italic — Italic style</p>
            <p className="line-through text-muted-foreground">
              line-through — Strikethrough
            </p>
            <p className="underline underline-offset-4">
              underline — With offset
            </p>
          </div>
        </Demo>

        <Demo label="Colors on Text">
          <div className="w-full space-y-2">
            <p className="text-foreground">text-foreground — Primary text</p>
            <p className="text-muted-foreground">
              text-muted-foreground — Subdued text
            </p>
            <p className="text-primary">text-primary — Primary color</p>
            <p className="text-destructive">
              text-destructive — Error / danger
            </p>
          </div>
        </Demo>
      </div>
    </Section>
  );
}

export function RadiusSpacingSection() {
  return (
    <Section
      id="radius-spacing"
      title="Radius & Spacing"
      description="Border-radius scale derived from --radius: 0.5rem (tighter for precision). All values calculated proportionally."
    >
      <div className="space-y-8">
        <Demo label="Radius Scale">
          <div className="flex w-full flex-wrap gap-6">
            {[
              { label: "radius-sm", cls: "rounded-sm" },
              { label: "radius-md", cls: "rounded-md" },
              { label: "radius-lg", cls: "rounded-lg" },
              { label: "radius-xl", cls: "rounded-xl" },
              { label: "radius-2xl", cls: "rounded-2xl" },
              { label: "radius-3xl", cls: "rounded-3xl" },
              { label: "radius-full", cls: "rounded-full" },
            ].map(({ label, cls }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div
                  className={`size-16 border-2 border-border bg-muted ${cls}`}
                />
                <span className="font-mono text-[10px] text-muted-foreground">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </Demo>

        <Demo label="Spacing Scale (Gap)">
          <div className="flex flex-col gap-3 w-full">
            {[1, 2, 3, 4, 6, 8, 12, 16].map((n) => (
              <div key={n} className="flex items-center gap-3">
                <span className="w-16 font-mono text-xs text-muted-foreground">
                  {n * 4}px
                </span>
                <div
                  className="h-4 rounded-sm bg-primary/60"
                  style={{ width: `${n * 4 * 2}px` }}
                />
                <span className="font-mono text-xs text-muted-foreground">
                  gap-{n}
                </span>
              </div>
            ))}
          </div>
        </Demo>
      </div>
    </Section>
  );
}

export function ElevationSection() {
  return (
    <Section
      id="elevation"
      title="Elevation & Motion"
      description="Three elevation levels, standardised easing, and duration tokens. All respect prefers-reduced-motion."
    >
      <div className="space-y-8">
        <Demo label="Elevation Levels">
          <div className="grid w-full gap-4 sm:grid-cols-3">
            <div className="elevation-1 rounded-xl bg-card p-5">
              <p className="label-quiet">elevation-1</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Subtle lift. Cards, list items.
              </p>
            </div>
            <div className="elevation-2 rounded-xl bg-card p-5">
              <p className="label-quiet">elevation-2</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Raised surface. Popovers, dropdowns.
              </p>
            </div>
            <div className="elevation-3 rounded-xl bg-card p-5">
              <p className="label-quiet">elevation-3</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Prominent surface. Modals, dialogs.
              </p>
            </div>
          </div>
        </Demo>

        <Demo label="Duration Tokens">
          <div className="w-full space-y-3">
            {[
              {
                name: "--duration-fast",
                value: "120ms",
                use: "Press feedback and exits",
              },
              {
                name: "--duration-base",
                value: "160ms",
                use: "Menus, controls, hover, focus",
              },
              {
                name: "--duration-slow",
                value: "240ms",
                use: "Surface entrances (panels, sections)",
              },
            ].map(({ name, value, use }) => (
              <div
                key={name}
                className="flex items-center gap-3 rounded-lg border border-border px-4 py-3"
              >
                <code className="w-48 shrink-0 text-xs">{name}</code>
                <span className="w-16 shrink-0 font-mono text-xs font-semibold text-brand">
                  {value}
                </span>
                <span className="text-xs text-muted-foreground">{use}</span>
              </div>
            ))}
          </div>
        </Demo>

        <Demo label="Entrance Animation — .animate-fade-up">
          <div className="w-full space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`animate-fade-up stagger-${i} flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm`}
              >
                <div className="size-2 rounded-full bg-brand" />
                Item {i} — fades up with a {i * 50}ms delay
              </div>
            ))}
          </div>
        </Demo>

        <Demo label="Brand Strip — .brand-highlight">
          <div className="w-full max-w-sm space-y-3">
            <div className="brand-highlight">
              <p className="label-quiet">Section Label</p>
              <p className="mt-1 font-medium">
                Use brand strips to anchor section headings
              </p>
            </div>
            <div className="brand-highlight">
              <p className="label-quiet">Key Metric</p>
              <p className="mt-1 text-2xl font-semibold">4,217</p>
            </div>
          </div>
        </Demo>

        <Demo label="Quiet Label — .label-quiet">
          <div className="space-y-2">
            <p className="label-quiet">Section Type</p>
            <p className="label-quiet">Last Updated • 2h ago</p>
            <p className="label-quiet">Status • Active</p>
          </div>
        </Demo>
      </div>
    </Section>
  );
}
