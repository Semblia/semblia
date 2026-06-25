import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  MagnifyingGlass,
  Globe as GlobeIcon,
  Users,
  Article,
  Megaphone,
  DotsThree,
  ChatText as MessageSquareText,
  ShieldCheck,
  Notebook,
  Lightbulb,
  PuzzlePiece as PuzzleIcon,
} from "@phosphor-icons/react";

// ── Step ordering ──────────────────────────────────────────────────────────
//
// Mirrors `V2OnboardingStep` minus `COMPLETED`. The shell uses this list to
// render the left rail; each step entry carries its own copy so the rail and
// the right-pane heading stay in sync.

// The UI presents four screens. They map onto the server step enum
// (PROFILE / REFERRAL / INTENT / PROJECT / COLLECTION) — the "goals" screen
// persists REFERRAL + INTENT together so the user reaches value in fewer steps.
export type OnboardStep = "profile" | "goals" | "project" | "collection";

export interface StepDescriptor {
  id: OnboardStep;
  index: number;
  /** Two-digit zero-padded label, e.g. "01". */
  ordinal: string;
  /** Short title shown in the progress strip. */
  title: string;
  /** One-line caption (used where a longer hint helps). */
  caption: string;
}

export const ONBOARD_STEPS: readonly StepDescriptor[] = [
  {
    id: "profile",
    index: 0,
    ordinal: "01",
    title: "About you",
    caption: "The name on your work.",
  },
  {
    id: "goals",
    index: 1,
    ordinal: "02",
    title: "Your goals",
    caption: "Tailor Semblia to your use.",
  },
  {
    id: "project",
    index: 2,
    ordinal: "03",
    title: "First project",
    caption: "Where your proof lives.",
  },
  {
    id: "collection",
    index: 3,
    ordinal: "04",
    title: "Share link",
    caption: "Ready to collect.",
  },
] as const;

// ── Referral sources ───────────────────────────────────────────────────────

export interface OptionItem {
  id: string;
  label: string;
  hint?: string;
  Icon: PhosphorIcon;
}

export const REFERRAL_SOURCES: readonly OptionItem[] = [
  {
    id: "search",
    label: "Search engine",
    hint: "Google, Bing, DuckDuckGo",
    Icon: MagnifyingGlass,
  },
  {
    id: "social",
    label: "Social media",
    hint: "X, LinkedIn, Threads",
    Icon: GlobeIcon,
  },
  {
    id: "forum",
    label: "Online community",
    hint: "Reddit, Indie Hackers, HN",
    Icon: Users,
  },
  {
    id: "blog",
    label: "Blog or article",
    hint: "Read about us somewhere",
    Icon: Article,
  },
  {
    id: "ad",
    label: "An ad",
    hint: "We'd like to know which",
    Icon: Megaphone,
  },
  {
    id: "other",
    label: "Somewhere else",
    hint: "Tell us where",
    Icon: DotsThree,
  },
] as const;

// ── Intent options ─────────────────────────────────────────────────────────

export const INTENT_OPTIONS: readonly OptionItem[] = [
  {
    id: "collect",
    label: "Collect customer testimonials",
    hint: "Forms, hosted pages, video",
    Icon: MessageSquareText,
  },
  {
    id: "social-proof",
    label: "Build social proof for my site",
    hint: "Walls, widgets, embeds",
    Icon: ShieldCheck,
  },
  {
    id: "internal",
    label: "Internal feedback & reviews",
    hint: "Team-only collection",
    Icon: Notebook,
  },
  {
    id: "case-studies",
    label: "Case studies & success stories",
    hint: "Long-form, structured",
    Icon: Lightbulb,
  },
  {
    id: "other",
    label: "Something else",
    hint: "Tell us about it",
    Icon: PuzzleIcon,
  },
] as const;

// ── Role options ───────────────────────────────────────────────────────────
//
// Captured as `profile.jobTitle`. Lightweight, optional — picking one lets us
// tailor defaults later (e.g. notification cadence, widget density). Stored as
// the plain label string so it stays human-readable.

export const ROLE_OPTIONS = [
  "Founder",
  "Marketing",
  "Product",
  "Engineering",
  "Agency / freelance",
  "Customer success",
] as const;

// ── Project starter suggestions ────────────────────────────────────────────

export const PROJECT_SUGGESTIONS = [
  "My SaaS",
  "Client work",
  "Agency portfolio",
  "Personal brand",
] as const;
