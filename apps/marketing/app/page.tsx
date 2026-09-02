import Link from "next/link";
import { SpecimenWall } from "@/components/specimen-wall";
import { SIGN_UP_URL } from "@/lib/urls";

const STEPS = [
  {
    number: "01",
    title: "Collect",
    body: "Hosted forms your customers actually finish, email requests that do the asking for you, and imports that carry your history in from Testimonial.to, Senja, Famewall, or any spreadsheet.",
  },
  {
    number: "02",
    title: "Curate",
    body: "Every response lands in one moderation queue with consent tracked per person. Approve what represents you; nothing publishes by accident.",
  },
  {
    number: "03",
    title: "Publish",
    body: "Hosted walls on your own subdomain, widgets for any site, and embeds that update without a deploy. Approve once — it is live everywhere.",
  },
] as const;

const CAPABILITIES = [
  {
    title: "Hosted forms",
    body: "Branded collection forms on your own subdomain — text, ratings, and media, no code on your site.",
  },
  {
    title: "Request by email",
    body: "Compose once, send to a list, and watch who submitted. Suppression and unsubscribe are built in.",
  },
  {
    title: "Import and migrate",
    body: "Move in from Testimonial.to, Senja, or Famewall, or upload a CSV. Your history arrives intact.",
  },
  {
    title: "Moderation with consent",
    body: "A review queue with per-response consent records, so publishing stays deliberate and defensible.",
  },
  {
    title: "Walls, widgets, embeds",
    body: "Publish a hosted wall or drop one script tag on your site. Content stays current without redeploys.",
  },
  {
    title: "Built for agents",
    body: "Scoped API and agent keys plus an MCP server, so your tools and AI agents can read and curate responses.",
  },
] as const;

const TIERS = [
  { name: "Free", price: "₹0", detail: "1 project · 25 responses · 1 widget" },
  {
    name: "Pro",
    price: "₹799",
    detail: "5 projects · 1,000 responses · 10 widgets",
  },
  {
    name: "Business",
    price: "₹2,499",
    detail: "25 projects · 10,000 responses · 100 widgets",
  },
] as const;

function PricingTeaser() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto w-full max-w-5xl px-6 py-16">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Priced for where you are
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Start free, upgrade when the responses do.
            </p>
          </div>
          <Link
            href="/pricing"
            className="text-sm font-medium text-brand-ink transition-colors duration-[160ms] hover:text-foreground"
          >
            Full pricing →
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className="rounded-lg border border-border bg-card p-5"
            >
              <p className="text-sm font-semibold text-foreground">
                {tier.name}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {tier.price}
                <span className="text-sm font-normal text-muted-foreground">
                  /month
                </span>
              </p>
              <p className="mt-2 text-[13px] text-muted-foreground">
                {tier.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-6 pb-16 pt-20 sm:pt-28">
        <div className="max-w-2xl">
          <h1 className="animate-fade-up text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
            Collect the praise.
            <br />
            Publish the proof.
          </h1>
          <p className="animate-fade-up stagger-1 mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Semblia turns kind words into working social proof: hosted forms
            and email requests to collect testimonials, one queue to curate
            them, and walls, widgets, and embeds to put them on your site.
          </p>
          <div className="animate-fade-up stagger-2 mt-8 flex items-center gap-4">
            <a
              href={SIGN_UP_URL}
              className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform duration-[120ms] active:scale-[0.98]"
            >
              Start free
            </a>
            <Link
              href="/pricing"
              className="text-sm font-medium text-muted-foreground transition-colors duration-[160ms] hover:text-foreground"
            >
              See pricing
            </Link>
          </div>
          <p className="animate-fade-up stagger-3 mt-3 text-[13px] text-muted-foreground">
            Free plan, no card required.
          </p>
        </div>
        <div className="mt-14">
          <SpecimenWall />
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Three moves, in order
          </h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number}>
                <p className="font-mono text-[13px] text-brand-ink">
                  {step.number}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            What ships in the box
          </h2>
          <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((capability) => (
              <div key={capability.title}>
                <h3 className="text-[15px] font-semibold text-foreground">
                  {capability.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {capability.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PricingTeaser />

      <section className="border-t border-border bg-ink">
        <div className="mx-auto w-full max-w-5xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink-foreground">
            Your customers already said it.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-foreground/70">
            Put it to work on your site — collected, curated, and published
            with Semblia.
          </p>
          <a
            href={SIGN_UP_URL}
            className="mt-8 inline-block rounded-md bg-brand px-6 py-2.5 text-sm font-medium text-ink transition-transform duration-[120ms] active:scale-[0.98]"
          >
            Start free
          </a>
        </div>
      </section>
    </>
  );
}
