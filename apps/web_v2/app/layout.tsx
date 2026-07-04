import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/**
 * Semblia — "Quiet Precision" Design System
 *
 * Typography:
 *   - Sans: Inter (weights 300–700) → --font-inter → --font-sans
 *   - Mono: Geist Mono             → --font-geist-mono → --font-mono
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s — Semblia",
    default: "Semblia",
  },
  description:
    "Semblia helps you collect, manage, and showcase testimonials that build trust and drive growth.",
  // web_v2 is the authenticated control plane and defaults to noindex; the
  // hosted walls (/wall/:slug) override this per-page — they are the one
  // public, indexable surface this app serves. Hosted forms stay on
  // forms_runtime's origin.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background">
        <ClerkProvider>
          <QueryProvider>
            <ThemeProvider>
              {children}
              <Toaster position="bottom-right" />
            </ThemeProvider>
          </QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
