import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/**
 * Tresta — "Quiet Precision" Design System
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
    template: "%s — Tresta",
    default: "Tresta",
  },
  description:
    "Tresta helps you collect, manage, and showcase testimonials that build trust and drive growth.",
  // The entire web_v2 app is the authenticated control plane; public form
  // surfaces are served by forms_runtime on a separate origin.
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
