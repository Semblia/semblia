import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://docs.semblia.com"),
  title: {
    default: "Semblia Docs",
    template: "%s · Semblia Docs",
  },
  description:
    "Documentation for Semblia: quickstart, widget and form embeds, the @semblia/react and @semblia/node SDKs, and API keys.",
};

const NAV = [
  { href: "/", label: "Quickstart" },
  { href: "/embeds", label: "Embeds" },
  { href: "/sdk/react", label: "@semblia/react" },
  { href: "/sdk/node", label: "@semblia/node" },
  { href: "/api-keys", label: "API & agent keys" },
] as const;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`}>
      <body>
        <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-sm">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
            <div className="flex items-baseline gap-2">
              <a
                href="https://semblia.com"
                className="text-[15px] font-semibold tracking-tight text-foreground"
              >
                Semblia
              </a>
              <span className="text-sm text-muted-foreground">Docs</span>
            </div>
            <a
              href="https://app.semblia.com"
              className="rounded-md bg-foreground px-3.5 py-1.5 text-sm font-medium text-background transition-transform duration-[120ms] active:scale-[0.98]"
            >
              Open the app
            </a>
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-5xl gap-10 px-6 py-10">
          <nav className="hidden w-44 shrink-0 md:block" aria-label="Documentation">
            <ul className="sticky top-24 space-y-1 text-sm">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors duration-[160ms] hover:bg-muted hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <main className="min-w-0 max-w-2xl flex-1 pb-20">{children}</main>
        </div>
      </body>
    </html>
  );
}
