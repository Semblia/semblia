"use client";

import { Section, Demo, Swatch } from "./design-helpers";

export function PrinciplesSection() {
  return (
    <Section
      id="principles"
      title="Design Principles"
      description="The six pillars of Tresta's Quiet Precision design language - calm, fast, precise, delightful, empowering, and focused."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "Calm Confidence",
            desc: "Every screen tells the user exactly what to do next. No ambiguity, no noise. Clear hierarchy, clear path.",
          },
          {
            title: "Fast & Fluid",
            desc: "150ms micro-interactions. No layout shifts. Transitions feel instant yet intentional.",
          },
          {
            title: "Precision & Trust",
            desc: "Consistent spacing grid. Single typeface family. Tokens enforced everywhere — nothing is magic-numbered.",
          },
          {
            title: "Refined Delight",
            desc: "Subtle fade-ups on scroll, warm amber accent used sparingly as a reward signal, not decoration.",
          },
          {
            title: "Empowerment",
            desc: "Stats surface user impact. Progress is always visible. Users know they're building something meaningful.",
          },
          {
            title: "Quiet Focus",
            desc: "Low chroma palette. Warm neutrals instead of cold grays. Never compete with the user's content.",
          },
        ].map(({ title, desc }) => (
          <div key={title} className="stat-card animate-fade-up">
            <div className="brand-strip mb-3">
              <p className="label-quiet">Principle</p>
              <h3 className="mt-1 text-sm font-semibold text-foreground">
                {title}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {desc}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function ColorsSection() {
  return (
    <Section
      id="colors"
      title="Color Tokens"
      description="All CSS custom properties defined in :root and .dark. These are the foundational design tokens."
    >
      <div className="space-y-8">
        <Demo label="Core Semantic">
          <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Swatch variable="--background" label="Background" />
            <Swatch variable="--foreground" label="Foreground" />
            <Swatch variable="--primary" label="Primary" />
            <Swatch variable="--primary-foreground" label="Primary FG" />
            <Swatch variable="--secondary" label="Secondary" />
            <Swatch variable="--secondary-foreground" label="Secondary FG" />
            <Swatch variable="--muted" label="Muted" />
            <Swatch variable="--muted-foreground" label="Muted FG" />
            <Swatch variable="--accent" label="Accent" />
            <Swatch variable="--accent-foreground" label="Accent FG" />
            <Swatch variable="--destructive" label="Destructive" />
          </div>
        </Demo>

        <Demo label="Brand Accent — Amber Sand (used sparingly)">
          <div className="grid w-full grid-cols-3 gap-4">
            <Swatch variable="--brand" label="Brand" />
            <Swatch variable="--brand-foreground" label="Brand FG" />
            <Swatch variable="--brand-muted" label="Brand Muted" />
          </div>
          <div className="w-full">
            <p className="text-xs text-muted-foreground leading-relaxed">
              The brand accent is the only non-neutral hue in the system. Use it
              exclusively for calls-to-action, progress milestones, highlights,
              and sidebar active states in dark mode. Never use it for
              decoration.
            </p>
          </div>
        </Demo>

        <Demo label="Semantic Status">
          <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
            <Swatch variable="--success" label="Success" />
            <Swatch variable="--success-foreground" label="Success FG" />
            <Swatch variable="--warning" label="Warning" />
            <Swatch variable="--warning-foreground" label="Warning FG" />
          </div>
        </Demo>

        <Demo label="Surface & Border">
          <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Swatch variable="--card" label="Card" />
            <Swatch variable="--card-foreground" label="Card FG" />
            <Swatch variable="--popover" label="Popover" />
            <Swatch variable="--popover-foreground" label="Popover FG" />
            <Swatch variable="--border" label="Border" />
            <Swatch variable="--input" label="Input" />
            <Swatch variable="--ring" label="Ring" />
          </div>
        </Demo>

        <Demo label="Chart Palette — Warm Sequential">
          <div className="grid w-full grid-cols-5 gap-4">
            <Swatch variable="--chart-1" label="Amber (Brand)" />
            <Swatch variable="--chart-2" label="Sage" />
            <Swatch variable="--chart-3" label="Slate Blue" />
            <Swatch variable="--chart-4" label="Muted Rose" />
            <Swatch variable="--chart-5" label="Deep Slate" />
          </div>
        </Demo>

        <Demo label="Sidebar">
          <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Swatch variable="--sidebar" label="Sidebar" />
            <Swatch variable="--sidebar-foreground" label="Sidebar FG" />
            <Swatch variable="--sidebar-primary" label="Sidebar Primary" />
            <Swatch
              variable="--sidebar-primary-foreground"
              label="Sidebar Primary FG"
            />
            <Swatch variable="--sidebar-accent" label="Sidebar Accent" />
            <Swatch
              variable="--sidebar-accent-foreground"
              label="Sidebar Accent FG"
            />
            <Swatch variable="--sidebar-border" label="Sidebar Border" />
            <Swatch variable="--sidebar-ring" label="Sidebar Ring" />
          </div>
        </Demo>
      </div>
    </Section>
  );
}
