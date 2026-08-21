const SPECIMENS = [
  {
    quote:
      "We swapped a folder of screenshots for one wall. Closing calls start with it now.",
    name: "Mira",
    role: "Founder, design studio",
    rating: 5,
  },
  {
    quote: "The email request did the awkward asking for me. Six replies in a week.",
    name: "Dev",
    role: "Indie SaaS",
    rating: 5,
  },
  {
    quote:
      "Imported three years of Senja history over coffee. Nothing got lost.",
    name: "Ana",
    role: "Agency lead",
    rating: 4,
  },
  {
    quote: "Consent is tracked per response, so legal stopped asking me questions.",
    name: "Tomás",
    role: "Marketing ops",
    rating: 5,
  },
  {
    quote: "One embed tag. Our testimonials update without a deploy.",
    name: "Keiko",
    role: "Frontend engineer",
    rating: 5,
  },
  {
    quote: "The moderation queue means nothing embarrassing ships by accident.",
    name: "Sam",
    role: "Course creator",
    rating: 4,
  },
] as const;

function Stars({ count }: { count: number }) {
  return (
    <div
      role="img"
      aria-label={`${count} out of 5 stars`}
      className="flex gap-0.5"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <svg
          key={index}
          viewBox="0 0 20 20"
          className={`size-3.5 ${index < count ? "fill-brand" : "fill-border"}`}
          aria-hidden="true"
        >
          <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

/**
 * The hero's artifact: a testimonial wall rendered the way the product
 * renders one. The content is demo data and the caption says so — the page
 * never presents fabricated praise as genuine.
 */
export function SpecimenWall() {
  return (
    <figure className="dot-grid rounded-xl border border-border bg-muted/40 p-4 sm:p-6">
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {SPECIMENS.map((specimen, index) => (
          <blockquote
            key={specimen.name}
            className={`animate-fade-up stagger-${index + 1} mb-4 break-inside-avoid rounded-lg border border-border bg-card p-4`}
          >
            <Stars count={specimen.rating} />
            <p className="mt-2.5 text-[14px] leading-relaxed text-foreground">
              {specimen.quote}
            </p>
            <footer className="mt-3 flex items-center gap-2">
              <span
                aria-hidden="true"
                className="flex size-6 items-center justify-center rounded-full bg-brand/20 text-[11px] font-semibold text-brand-ink"
              >
                {specimen.name[0]}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {specimen.name} · {specimen.role}
              </span>
            </footer>
          </blockquote>
        ))}
      </div>
      <figcaption className="mt-2 text-right font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        A wall, as Semblia renders it — demo data
      </figcaption>
    </figure>
  );
}
