import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

// Aligned with the in-app legal pages (apps/app /legal/privacy); both need a
// counsel review before this copy is treated as final.
const SECTIONS = [
  {
    title: "1. What we collect",
    body: "Account details you provide (name, email), the testimonial content you and your respondents submit, and operational records such as delivery and moderation activity needed to run the service.",
  },
  {
    title: "2. How we use it",
    body: "To operate Semblia: authenticate you, store and render your testimonials, send the emails you compose (requests, thank-yous, notifications), and keep the service secure. We do not sell personal data.",
  },
  {
    title: "3. Respondent data",
    body: "People who submit a testimonial control the consent they grant. Their submissions are shown publicly only where consent permits, and unsubscribe requests are honored across project-voiced email.",
  },
  {
    title: "4. Retention and deletion",
    body: "Your content stays available while your account is active. Deleting a response, project, or account removes the associated public content; some operational records are retained where the law requires.",
  },
  {
    title: "5. Contact",
    body: null,
  },
] as const;

export default function PrivacyPage() {
  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Privacy Policy
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
                  For privacy questions or requests, contact{" "}
                  <a
                    href="mailto:privacy@semblia.com"
                    className="text-foreground underline underline-offset-2 transition-colors duration-[160ms] hover:text-brand-ink"
                  >
                    privacy@semblia.com
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
