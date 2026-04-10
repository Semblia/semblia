import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign up" };

export default function SignUpPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <SignUp
        appearance={{
          variables: {
            colorPrimary: "hsl(var(--brand))",
            colorBackground: "hsl(var(--background))",
            colorText: "hsl(var(--foreground))",
            colorTextSecondary: "hsl(var(--muted-foreground))",
            colorInputBackground: "hsl(var(--input))",
            colorInputText: "hsl(var(--foreground))",
            borderRadius: "0.5rem",
            fontFamily: "var(--font-inter)",
          },
          elements: {
            card: "shadow-sm border border-border bg-card",
            headerTitle: "text-foreground font-semibold",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton:
              "border border-border bg-background text-foreground hover:bg-muted transition-colors",
            formButtonPrimary:
              "bg-foreground text-background hover:bg-foreground/90 transition-colors",
            footerActionLink: "text-brand hover:text-brand/80",
          },
        }}
      />
    </div>
  );
}
