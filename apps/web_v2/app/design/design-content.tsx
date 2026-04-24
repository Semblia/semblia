"use client";

import * as React from "react";
import { ThemeToggle } from "./theme-toggle";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  CheckCircle as CheckCircle2,
  BellRinging as BellRing,
  CaretRight as ChevronRight,
  Star,
  Pencil,
  User,
  Stack as Layers,
  Palette,
  TextT as Type,
  FrameCorners as Radius,
  Cube as Box,
  Hash,
} from "@phosphor-icons/react";

import { PrinciplesSection, ColorsSection } from "./design-section-principles-colors";
import { TypographySection, RadiusSpacingSection, ElevationSection } from "./design-section-typography-layout";
import {
  ButtonsSection,
  BadgesSection,
  AlertsSection,
  AvatarsSection,
  CardsSection,
} from "./design-section-components";
import { FormsSection, FeedbackSection } from "./design-section-forms-feedback";
import { OverlaysSection } from "./design-section-overlays";
import { NavigationSection } from "./design-section-navigation";
import { DataDisplaySection, MiscSection } from "./design-section-data-misc";

// ─── Nav items ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "principles", label: "Principles", icon: Star },
  { id: "colors", label: "Colors", icon: Palette },
  { id: "typography", label: "Typography", icon: Type },
  { id: "radius-spacing", label: "Radius & Spacing", icon: Radius },
  { id: "elevation", label: "Elevation & Motion", icon: Layers },
  { id: "buttons", label: "Buttons", icon: Box },
  { id: "badges", label: "Badges", icon: Hash },
  { id: "alerts", label: "Alerts", icon: BellRing },
  { id: "avatars", label: "Avatars", icon: User },
  { id: "cards", label: "Cards", icon: Layers },
  { id: "forms", label: "Forms & Inputs", icon: Pencil },
  { id: "feedback", label: "Feedback", icon: CheckCircle2 },
  { id: "overlays", label: "Overlays", icon: Layers },
  { id: "navigation", label: "Navigation", icon: ChevronRight },
  { id: "data", label: "Data Display", icon: Hash },
  { id: "misc", label: "Misc", icon: Star },
];

// ─── Main component ───────────────────────────────────────────────────────────

export function DesignSystemContent() {
  const [activeSection, setActiveSection] = React.useState("colors");

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );

    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <TooltipProvider>
      <div className="relative min-h-screen bg-background text-foreground">
        {/* ── Top bar ──────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-7 items-center justify-center rounded-lg bg-foreground">
                <BrandLogo size={16} variant="default" className="invert dark:invert-0" alt="" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Tresta</span>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-sm text-muted-foreground">Design System</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">v1.0</Badge>
              <Badge variant="secondary">radix-nova</Badge>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-screen-xl gap-0 px-6 py-8">
          {/* ── Sidebar nav ──────────────────────────────────────── */}
          <aside className="sticky top-24 h-fit w-52 shrink-0 pr-8">
            <nav className="space-y-1">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
                    setActiveSection(id);
                  }}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${
                    activeSection === id
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Icon className="size-3.5 shrink-0" />
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          {/* ── Sections ──────────────────────────────────────────── */}
          <main className="min-w-0 flex-1 space-y-16">
            <PrinciplesSection />
            <ColorsSection />
            <TypographySection />
            <RadiusSpacingSection />
            <ElevationSection />
            <ButtonsSection />
            <BadgesSection />
            <AlertsSection />
            <AvatarsSection />
            <CardsSection />
            <FormsSection />
            <FeedbackSection />
            <OverlaysSection />
            <NavigationSection />
            <DataDisplaySection />
            <MiscSection />
            <div className="h-16" />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
