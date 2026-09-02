import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

// Aligned with the in-app legal pages (apps/app /legal/terms); both need a
// counsel review before this copy is treated as final.
const SECTIONS = [
  {
    title: "1. Acceptance of terms",
    body: "By accessing or using Semblia, you agree to be bound by these Terms of Service. If you do not agree, you may not use the service.",
  },
  {
    title: "2. Description of service",
    body: "Semblia provides a platform for collecting, managing, and showcasing customer testimonials, including hosted forms, email requests, moderation tools, and publishing surfaces such as walls, widgets, and embeds. We reserve the right to modify or discontinue the service at any time.",
  },
  {
    title: "3. Your content and consent",
    body: "Testimonials and responses you collect remain yours. You are responsible for having the right to collect and publish them; Semblia records the consent your respondents grant so you can honor it.",
  },
  {
    title: "4. User responsibilities",
    body: "You are responsible for maintaining the security of your account and credentials, including API and agent keys, and for all activity under them. You agree to use the service in compliance with applicable laws.",
  },
  {
    title: "5. Billing",
    body: "Paid plans are billed monthly in INR through our payment provider. You can change or cancel your plan from inside the app; changes apply from the next billing cycle.",
  },
  {
    title: "6. Contact",
    body: null,
  },
] as const;

export default function TermsPage() {
  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Terms of Service
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Last updated: August 2026
      </p>
      <div className="mt-10 space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold text-foreground">
              {section.title}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              {section.body ?? (
                <>
                  For questions about these terms, contact us at{" "}
                  <a
                    href="mailto:legal@semblia.com"
                    className="text-foreground underline underline-offset-2 transition-colors duration-[160ms] hover:text-brand-ink"
                  >
                    legal@semblia.com
                  </a>
                  .
                </>
              )}
            </p>
          </section>
        ))}
      </div>
    </section>
  );
}
