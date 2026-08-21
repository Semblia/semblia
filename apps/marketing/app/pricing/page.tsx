import type { Metadata } from "next";
import { SIGN_UP_URL } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Semblia pricing: start free, upgrade to Pro or Business as your testimonials grow. Prices in INR.",
};

// Mirrors the in-app plan switcher (apps/app plan-switcher) — the same
// source the product shows paying customers. Change both together.
const PLANS = [
  {
    name: "Free",
    price: "₹0",
    blurb: "Everything you need to collect your first testimonials.",
    features: [
      "1 project",
      "25 responses",
      "1 widget",
      "Community support",
    ],
    emphasized: false,
  },
  {
    name: "Pro",
    price: "₹799",
    blurb: "For products where social proof carries the close.",
    features: [
      "5 projects",
      "1,000 responses",
      "10 widgets",
      "Priority support",
      "Custom branding",
    ],
    emphasized: true,
  },
  {
    name: "Business",
    price: "₹2,499",
    blurb: "For agencies and teams publishing at volume.",
    features: [
      "25 projects",
      "10,000 responses",
      "100 widgets",
      "Dedicated support",
      "Custom branding",
    ],
    emphasized: false,
  },
] as const;

export default function PricingPage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-20">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          Priced for where you are
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Start free and collect your first responses today. Upgrade when the
          volume does — every plan includes hosted forms, email requests,
          imports, moderation, walls, widgets, and embeds.
        </p>
      </div>

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-xl border bg-card p-6 ${
              plan.emphasized ? "border-brand-ink" : "border-border"
            }`}
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {plan.name}
              </h2>
              {plan.emphasized ? (
                <span className="rounded-full bg-brand/20 px-2.5 py-0.5 text-[11px] font-medium text-brand-ink">
                  Most popular
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {plan.price}
              <span className="text-sm font-normal text-muted-foreground">
                /month
              </span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {plan.blurb}
            </p>
            <ul className="mt-5 space-y-2 text-sm text-foreground">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <svg
                    viewBox="0 0 16 16"
                    className="size-3.5 shrink-0 fill-none stroke-brand-ink stroke-2"
                    aria-hidden="true"
                  >
                    <path d="M2.5 8.5l3.5 3.5 7-8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <a
              href={SIGN_UP_URL}
              className={`mt-6 block rounded-md px-4 py-2 text-center text-sm font-medium transition-transform duration-[120ms] active:scale-[0.98] ${
                plan.emphasized
                  ? "bg-foreground text-background"
                  : "border border-border bg-background text-foreground"
              }`}
            >
              Start free
            </a>
          </div>
        ))}
      </div>

      <p className="mt-8 text-[13px] text-muted-foreground">
        Prices in INR, billed monthly. Applicable taxes may apply. Every paid
        plan starts on Free — upgrade from inside the app whenever you are
        ready.
      </p>
    </section>
  );
}
