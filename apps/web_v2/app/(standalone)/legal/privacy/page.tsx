import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-4">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: April 2026
        </p>

        <div className="prose prose-sm text-muted-foreground space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              1. Information We Collect
            </h2>
            <p className="text-[14px] leading-relaxed">
              We collect information you provide directly, such as your name,
              email address, and account details. We also collect usage data to
              improve the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              2. How We Use Your Information
            </h2>
            <p className="text-[14px] leading-relaxed">
              We use collected information to provide and improve our services,
              communicate with you, and ensure the security of our platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              3. Data Security
            </h2>
            <p className="text-[14px] leading-relaxed">
              We implement appropriate technical and organizational measures to
              protect your personal data against unauthorized access,
              alteration, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              4. Contact
            </h2>
            <p className="text-[14px] leading-relaxed">
              For privacy-related inquiries, contact us at{" "}
              <a
                href="mailto:privacy@semblia.com"
                className="text-foreground underline underline-offset-2 hover:text-brand transition-colors"
              >
                privacy@semblia.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
