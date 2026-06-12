import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-4">
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: April 2026
        </p>

        <div className="prose prose-sm text-muted-foreground space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              1. Acceptance of Terms
            </h2>
            <p className="text-[14px] leading-relaxed">
              By accessing or using Semblia, you agree to be bound by these
              Terms of Service. If you do not agree, you may not use the
              service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              2. Description of Service
            </h2>
            <p className="text-[14px] leading-relaxed">
              Semblia provides a platform for collecting, managing, and
              showcasing customer testimonials. We reserve the right to modify
              or discontinue the service at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              3. User Responsibilities
            </h2>
            <p className="text-[14px] leading-relaxed">
              You are responsible for maintaining the security of your account
              and for all activities that occur under your account. You agree to
              use the service in compliance with applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              4. Contact
            </h2>
            <p className="text-[14px] leading-relaxed">
              For questions about these terms, contact us at{" "}
              <a
                href="mailto:legal@semblia.com"
                className="text-foreground underline underline-offset-2 hover:text-brand transition-colors"
              >
                legal@semblia.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
