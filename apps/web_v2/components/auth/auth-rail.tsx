import { cn } from "@/lib/utils";

const STEPS = [
  {
    n: "01",
    label: "Collect",
    desc: "Forms, hosted pages, and video — every reply lands in one inbox.",
  },
  {
    n: "02",
    label: "Curate",
    desc: "Approve the words you trust. Quietly set the rest aside.",
  },
  {
    n: "03",
    label: "Embed",
    desc: "Drop a wall or a widget onto your site in a single line.",
  },
] as const;

/**
 * The auth context rail. A calm promise line over a Collect → Curate → Embed
 * timeline — the same vertical-rail vocabulary the app uses for its section
 * nav, so the door looks like the house. No display type, gradient, or glow.
 */
export function AuthRail() {
  return (
    <div>
      <p className="auth-stagger-1 max-w-[20ch] text-[1.4rem] font-semibold leading-[1.25] tracking-[-0.02em] text-foreground">
        Turn honest customer words into proof you can show.
      </p>

      <ol className="mt-10">
        {STEPS.map((step, i) => {
          const isLast = i === STEPS.length - 1;
          return (
            <li
              key={step.n}
              className={cn(
                "relative flex gap-4 pb-7 last:pb-0",
                `auth-stagger-${i + 2}`,
              )}
            >
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute bottom-0 left-[15.5px] top-9 w-px bg-border"
                />
              )}
              <span
                aria-hidden
                className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card font-mono text-[11px] font-medium text-muted-foreground"
              >
                {step.n}
              </span>
              <div className="pt-1">
                <p className="text-[13.5px] font-semibold text-foreground">
                  {step.label}
                </p>
                <p className="mt-1 max-w-[34ch] text-[12.5px] leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
