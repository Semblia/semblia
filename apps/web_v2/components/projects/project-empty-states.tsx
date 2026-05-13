import Link from "next/link";
import {
  ArrowRight,
  Plus as PlusIcon,
  X as XIcon,
  FolderPlus,
  ShareNetwork,
  SealCheck,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// ── Empty state: no projects yet ─────────────────────────────────────────────
//
// Used as the first-run experience after onboarding. Goal: make the value
// concrete by showing a dimensional preview of *what* a populated project
// looks like, then offer a single decisive primary CTA. Inspired by Linear's
// "ghost preview" pattern and Cal.com's share-link first-run.

export function EmptyProjects() {
  return (
    <div className="relative isolate flex flex-1 flex-col overflow-hidden">
      {/* Subtle radial gradient wash — top center */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% -10%, var(--color-brand) 0%, transparent 70%)",
          opacity: 0.045,
        }}
      />

      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-10 px-6 py-12 sm:px-10 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        {/* ── Left: editorial copy ── */}
        <div className="animate-fade-up max-w-[34rem]">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="block h-px w-5 shrink-0 rounded-full bg-brand"
            />
            <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/60 uppercase">
              First project · 0 of 1
            </p>
          </div>

          <h2 className="mt-4 text-[2rem] leading-[1.07] font-semibold tracking-[-0.025em] text-foreground sm:text-[2.45rem]">
            A studio for trust.
            <br />
            <span className="text-muted-foreground/55">
              Yours starts empty.
            </span>
          </h2>

          <p className="mt-5 max-w-[30rem] text-[14.5px] leading-relaxed text-muted-foreground">
            One project per product, service, or brand. It bundles a hosted
            collection link, a moderation queue, embeddable widgets, and the
            public surfaces your customers will see.
          </p>

          {/* Primary CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/projects/new"
              className={cn(
                "group relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground",
                "transition-[transform,box-shadow] duration-150 ease-out",
                "shadow-[0_1px_2px_oklch(0_0_0/8%)] hover:shadow-[0_4px_12px_oklch(0_0_0/14%)] active:scale-[0.98]",
                "focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
              )}
            >
              <PlusIcon className="size-3.5" weight="bold" />
              Create first project
              <ArrowRight
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                weight="bold"
              />
            </Link>
            <a
              href="https://docs.tresta.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border/70 bg-card px-3.5 text-[13px] font-medium text-foreground transition-colors duration-150 hover:border-foreground/25 hover:bg-muted/50"
            >
              How Tresta works
              <ArrowRight
                className="size-3 text-muted-foreground/70"
                weight="bold"
              />
            </a>
          </div>

          {/* Three-stage flow with icons */}
          <ol className="mt-10 grid grid-cols-1 gap-y-4 sm:grid-cols-3 sm:gap-y-0 sm:gap-x-6">
            <StageEntry
              icon={FolderPlus}
              title="Create"
              text="Name the workspace customers recognize."
            />
            <StageEntry
              icon={ShareNetwork}
              title="Collect"
              text="Share the hosted link or embed a form."
            />
            <StageEntry
              icon={SealCheck}
              title="Review"
              text="Approve only the proof you stand behind."
            />
          </ol>
        </div>

        {/* ── Right: dimensional ghost preview of a populated state ── */}
        <PopulatedPreview />
      </div>
    </div>
  );
}

// ── Empty state: no search results ───────────────────────────────────────────

export function EmptySearch({
  query,
  onClear,
}: {
  query: string;
  onClear: () => void;
}) {
  return (
    <div className="animate-fade-up flex flex-col items-center px-6 py-16 text-center">
      <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/70 uppercase">
        No matches
      </p>
      <p className="mt-3 text-[15px] font-semibold tracking-tight text-foreground">
        Nothing here for{" "}
        <span className="text-muted-foreground">&ldquo;{query}&rdquo;</span>
      </p>
      <p className="mt-1.5 max-w-[28ch] text-[12.5px] leading-relaxed text-muted-foreground/85">
        Check the spelling or try a broader term — projects match on name and
        description.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-card px-2.5 py-1.5 text-[11.5px] font-medium text-foreground transition-colors duration-150 hover:border-foreground/25 hover:bg-muted/50"
      >
        <XIcon className="size-3" />
        Clear search
      </button>
    </div>
  );
}

// ── Stage entry (with icon) ──────────────────────────────────────────────────

function StageEntry({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
}) {
  return (
    <li className="flex flex-col gap-2 border-l border-border/60 pl-4 sm:border-l-0 sm:border-t sm:pt-4 sm:pl-0">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 bg-card">
        <Icon className="size-3.5 text-muted-foreground" weight="bold" />
      </div>
      <div>
        <p className="text-[12.5px] font-semibold tracking-tight text-foreground">
          {title}
        </p>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
          {text}
        </p>
      </div>
    </li>
  );
}

// ── Populated preview ────────────────────────────────────────────────────────
//
// A perspective-depth stack of mock testimonial cards. Shows what the inbox
// looks like once collecting is underway. Decorative-only; hidden from a11y.

function PopulatedPreview() {
  return (
    <div
      aria-hidden
      className="relative hidden h-[28rem] lg:block"
      style={{ perspective: "900px" }}
    >
      {/* Amber glow behind the stack */}
      <div
        className="absolute top-1/2 left-1/2 -z-10 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--color-brand) 0%, transparent 62%)",
          opacity: 0.09,
        }}
      />

      {/* Card stack — back to front */}
      <SkeletonCard
        className="absolute top-0 right-0 left-14 origin-bottom"
        style={{
          transform: "rotateX(3deg) rotate(2deg) translateY(-6px)",
          opacity: 0.4,
        }}
        accentHue={220}
      />

      <SkeletonCard
        className="absolute top-8 right-2 left-8 origin-bottom"
        style={{
          transform: "rotateX(2deg) rotate(-1deg) translateY(-2px)",
          opacity: 0.65,
        }}
        accentHue={155}
      />

      <SkeletonCard
        className="absolute top-16 right-4 left-4 origin-bottom"
        style={{ transform: "rotateX(1deg) rotate(0deg)" }}
        accentHue={40}
      />

      {/* Bottom shimmer — implies more entries below */}
      <div className="absolute right-8 bottom-0 left-8 space-y-2">
        <div className="h-2.5 rounded-md bg-muted/60" />
        <div className="h-2.5 w-3/4 rounded-md bg-muted/40" />
      </div>
    </div>
  );
}

function SkeletonCard({
  className,
  style,
  accentHue = 30,
}: {
  className?: string;
  style?: React.CSSProperties;
  accentHue?: number;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card p-5",
        "shadow-[0_8px_20px_-8px_oklch(0_0_0/12%)]",
        className,
      )}
      style={style}
    >
      {/* Avatar + name/role placeholders */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className="size-8 shrink-0 rounded-full"
          style={{ backgroundColor: `hsl(${accentHue} 30% 72% / 0.45)` }}
        />
        <div className="flex-1 space-y-1.5">
          <div className="h-2.5 w-20 rounded-full bg-muted/70" />
          <div className="h-2 w-14 rounded-full bg-muted/45" />
        </div>
      </div>

      {/* Quote placeholder lines */}
      <div className="space-y-2">
        <div className="h-2 rounded-full bg-muted/50" />
        <div className="h-2 w-[92%] rounded-full bg-muted/40" />
        <div className="h-2 w-[72%] rounded-full bg-muted/32" />
      </div>

      {/* Star placeholders */}
      <div className="mt-4 flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="size-3 rounded-sm"
            style={{
              backgroundColor: `oklch(0.7 0.12 55 / ${0.18 + i * 0.03})`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
