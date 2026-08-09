"use client";

import { RouteError } from "@/components/shared";
import "./globals.css";

/**
 * Last-resort boundary. `error.tsx` files can only catch errors *below* their
 * layout; if the root layout itself throws, this replaces the entire document.
 * It must render its own <html>/<body>, and it runs without the app providers
 * (theme, Clerk, query), so it stays deliberately minimal.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="antialiased">
      <body className="bg-background text-foreground">
        <main className="flex min-h-svh items-center justify-center">
          <RouteError
            error={error}
            reset={reset}
            homeHref="/"
            homeLabel="Reload app"
          />
        </main>
      </body>
    </html>
  );
}
