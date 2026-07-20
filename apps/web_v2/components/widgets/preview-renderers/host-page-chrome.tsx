"use client";

/**
 * Host-page chrome — frames an embed widget inside a believable, project-type-
 * aware website so the user sees what the widget looks like *in context*, on the
 * kind of site it will actually live on (a SaaS landing page, a storefront, an
 * agency site, a course page…), not floating in a void.
 *
 * The host page is deliberately quiet — muted neutrals, the project's own brand
 * accent for links/CTAs, real sans-serif chrome — so the widget visually
 * dominates while the surrounding page reads as a genuine site rather than a
 * stylized placeholder. When the project has a website + favicon those are used
 * for the nav logo and section copy, tightening the "this is my site" feeling.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export type HostArchetype =
  | "saas"
  | "commerce"
  | "agency"
  | "learning"
  | "generic";

interface HostPageChromeProps {
  hostName: string;
  /** Raw V2ProjectType (e.g. "SAAS_APP") — mapped to a believable site shape. */
  projectType?: string | null;
  /** Project brand colour, used as the site accent (links + CTA). */
  accent?: string | null;
  /** Best favicon for the project's real site, shown as the nav logo. */
  favicon?: string | null;
  contentDark?: boolean;
  /** Natural page flow (for fit-to-content frames) instead of internal scroll. */
  fitContent?: boolean;
  children: React.ReactNode;
  className?: string;
}

const ARCHETYPE_BY_TYPE: Record<string, HostArchetype> = {
  SAAS_APP: "saas",
  MOBILE_APP: "saas",
  PRODUCT: "saas",
  E_COMMERCE: "commerce",
  AGENCY: "agency",
  CONSULTING_SERVICE: "agency",
  FREELANCE: "agency",
  PORTFOLIO: "agency",
  COURSE: "learning",
  COMMUNITY: "learning",
  OTHER: "generic",
};

interface ArchetypeCopy {
  nav: string[];
  cta: string;
  eyebrow: string;
  heroTitle: string;
  heroSub: string;
  /** Heading for the section the widget is slotted into. */
  sectionTitle: string;
  sectionSub: string;
}

function copyFor(archetype: HostArchetype, host: string): ArchetypeCopy {
  switch (archetype) {
    case "commerce":
      return {
        nav: ["Shop", "New", "Sale"],
        cta: "Cart",
        eyebrow: "Free shipping over $50",
        heroTitle: "The everyday carry, refined",
        heroSub: "Thoughtfully made goods, shipped fast and loved long.",
        sectionTitle: "What customers are saying",
        sectionSub: "Thousands of five-star orders and counting.",
      };
    case "agency":
      return {
        nav: ["Work", "Services", "About"],
        cta: "Start a project",
        eyebrow: `${host} — studio`,
        heroTitle: "Brands, built to be felt",
        heroSub: "We design and ship work that earns attention and keeps it.",
        sectionTitle: "What our clients say",
        sectionSub: "The people we've partnered with, in their own words.",
      };
    case "learning":
      return {
        nav: ["Curriculum", "Pricing", "Login"],
        cta: "Enroll now",
        eyebrow: "New cohort starting soon",
        heroTitle: "Learn it properly, once",
        heroSub: "A focused program that takes you from zero to shipping.",
        sectionTitle: "From our students",
        sectionSub: "Real results from people who did the work.",
      };
    case "saas":
      return {
        nav: ["Product", "Pricing", "Docs"],
        cta: "Get started",
        eyebrow: "Trusted by 4,000+ teams",
        heroTitle: "Ship faster, with less friction",
        heroSub: "The workflow your team actually wants to use, every day.",
        sectionTitle: "Loved by modern teams",
        sectionSub: "We don't pay for these — we just let them speak.",
      };
    case "generic":
    default:
      return {
        nav: ["Home", "About", "Contact"],
        cta: "Get in touch",
        eyebrow: `Welcome to ${host}`,
        heroTitle: "Made with care",
        heroSub: "A little corner of the internet we're proud of.",
        sectionTitle: "What people are saying",
        sectionSub: "We don't pay for these — we just let them speak.",
      };
  }
}

interface Palette {
  page: string;
  panel: string;
  ink: string;
  sub: string;
  faint: string;
  line: string;
  accent: string;
  onAccent: string;
}

function palette(dark: boolean, accent: string): Palette {
  return dark
    ? {
        page: "#0b0b0d",
        panel: "#141417",
        ink: "#f3f3f5",
        sub: "#a1a1ab",
        faint: "#71717a",
        line: "#26262b",
        accent,
        onAccent: "#ffffff",
      }
    : {
        page: "#ffffff",
        panel: "#f6f6f7",
        ink: "#15151a",
        sub: "#52525b",
        faint: "#a1a1aa",
        line: "#eaeaec",
        accent,
        onAccent: "#ffffff",
      };
}

function Logo({
  p,
  host,
  favicon,
}: {
  p: Palette;
  host: string;
  favicon?: string | null;
}) {
  return (
    <div className="flex items-center gap-2">
      {favicon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={favicon}
          alt=""
          className="size-5 rounded-[5px] object-cover"
          aria-hidden
        />
      ) : (
        <span
          className="flex size-5 items-center justify-center rounded-[5px] text-[10px] font-bold"
          style={{ background: p.accent, color: p.onAccent }}
          aria-hidden
        >
          {host.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="text-[13px] font-semibold" style={{ color: p.ink }}>
        {host}
      </span>
    </div>
  );
}

export function HostPageChrome({
  hostName,
  projectType,
  accent,
  favicon,
  contentDark = false,
  fitContent = false,
  children,
  className,
}: HostPageChromeProps) {
  const archetype = ARCHETYPE_BY_TYPE[projectType ?? "OTHER"] ?? "generic";
  const host = hostName?.trim() || "Your site";
  const p = palette(contentDark, accent?.trim() || "#6366f1");
  const c = copyFor(archetype, host);

  return (
    <div
      className={cn(
        "flex w-full flex-col",
        // Height-fluid canvases (fit-to-content frames) let the page flow
        // naturally; fixed frames scroll inside themselves.
        fitContent ? "" : "h-full min-h-0 overflow-y-auto",
        className,
      )}
      style={{ background: p.page, color: p.ink }}
    >
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header
        className="flex shrink-0 items-center justify-between px-7 py-3.5"
        style={{ borderBottom: `1px solid ${p.line}` }}
      >
        <Logo p={p} host={host} favicon={favicon} />
        <nav
          className="hidden items-center gap-5 text-[12px] sm:flex"
          style={{ color: p.sub }}
        >
          {c.nav.map((item) => (
            <span key={item}>{item}</span>
          ))}
          <span
            className="rounded-md px-3 py-1.5 text-[11px] font-medium"
            style={{ background: p.accent, color: p.onAccent }}
          >
            {c.cta}
          </span>
        </nav>
      </header>

      {/* ── Hero band ──────────────────────────────────────────────────── */}
      <section className="px-7 pb-6 pt-10" style={{ background: p.page }}>
        <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
          <span
            className="rounded-full px-3 py-1 text-[11px] font-medium"
            style={{
              background: contentDark
                ? "rgba(255,255,255,0.06)"
                : `${p.accent}14`,
              color: p.accent,
            }}
          >
            {c.eyebrow}
          </span>
          <h1
            className="text-[26px] font-semibold leading-[1.15] tracking-tight"
            style={{ color: p.ink }}
          >
            {c.heroTitle}
          </h1>
          <p
            className="max-w-md text-[13px] leading-relaxed"
            style={{ color: p.sub }}
          >
            {c.heroSub}
          </p>
        </div>
      </section>

      {/* ── Widget section ─────────────────────────────────────────────── */}
      <section
        className="flex-1 px-7 py-9"
        style={{ background: p.panel, borderTop: `1px solid ${p.line}` }}
      >
        <div className="mx-auto mb-6 flex max-w-xl flex-col items-center gap-1.5 text-center">
          <h2
            className="text-[18px] font-semibold tracking-tight"
            style={{ color: p.ink }}
          >
            {c.sectionTitle}
          </h2>
          <p className="text-[12px]" style={{ color: p.faint }}>
            {c.sectionSub}
          </p>
        </div>
        <div className="mx-auto max-w-3xl">{children}</div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer
        className="mt-auto flex shrink-0 items-center justify-between px-7 py-4 text-[11px]"
        style={{ borderTop: `1px solid ${p.line}`, color: p.faint }}
      >
        <span>
          © {new Date().getFullYear()} {host}
        </span>
        <span className="flex items-center gap-4">
          <span>Privacy</span>
          <span>Terms</span>
        </span>
      </footer>
    </div>
  );
}
