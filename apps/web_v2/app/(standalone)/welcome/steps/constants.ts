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

export type OnboardStep =
  | "profile"
  | "referral"
  | "intent"
  | "project"
  | "collection";

export interface StepDescriptor {
  id: OnboardStep;
  index: number;
  /** Two-digit zero-padded label, e.g. "01". Used in the rail and overlines. */
  ordinal: string;
  /** Short title shown in the left rail and overline. */
  title: string;
  /** One-line caption shown below the title in the left rail. */
  caption: string;
}

export const ONBOARD_STEPS: readonly StepDescriptor[] = [
  {
    id: "profile",
    index: 0,
    ordinal: "01",
    title: "About you",
    caption: "Set the name on your work.",
  },
  {
    id: "referral",
    index: 1,
    ordinal: "02",
    title: "First touch",
    caption: "How you found us.",
  },
  {
    id: "intent",
    index: 2,
    ordinal: "03",
    title: "Why Tresta",
    caption: "What you'll use it for.",
  },
  {
    id: "project",
    index: 3,
    ordinal: "04",
    title: "First project",
    caption: "Where the proof lives.",
  },
  {
    id: "collection",
    index: 4,
    ordinal: "05",
    title: "Collection link",
    caption: "Your share-ready URL.",
  },
] as const;

export const TOTAL_STEPS = ONBOARD_STEPS.length;

export const STEP_INDEX: Record<OnboardStep, number> = ONBOARD_STEPS.reduce(
  (acc, s) => {
    acc[s.id] = s.index;
    return acc;
  },
  {} as Record<OnboardStep, number>,
);

export function stepDescriptor(id: OnboardStep): StepDescriptor {
  return ONBOARD_STEPS[STEP_INDEX[id]];
}

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

// ── Project starter suggestions ────────────────────────────────────────────

export const PROJECT_SUGGESTIONS = [
  "My SaaS",
  "Client work",
  "Agency portfolio",
  "Personal brand",
] as const;
