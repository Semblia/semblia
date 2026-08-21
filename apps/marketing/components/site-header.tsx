import Link from "next/link";
import { DOCS_URL, SIGN_IN_URL, SIGN_UP_URL } from "@/lib/urls";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight text-foreground"
        >
          Semblia
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/pricing"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors duration-[160ms] hover:text-foreground"
          >
            Pricing
          </Link>
          <a
            href={DOCS_URL}
            className="hidden rounded-md px-3 py-1.5 text-muted-foreground transition-colors duration-[160ms] hover:text-foreground sm:block"
          >
            Docs
          </a>
          <a
            href={SIGN_IN_URL}
            className="hidden rounded-md px-3 py-1.5 text-muted-foreground transition-colors duration-[160ms] hover:text-foreground sm:block"
          >
            Sign in
          </a>
          <a
            href={SIGN_UP_URL}
            className="ml-2 rounded-md bg-foreground px-3.5 py-1.5 font-medium text-background transition-transform duration-[120ms] active:scale-[0.98]"
          >
            Start free
          </a>
        </nav>
      </div>
    </header>
  );
}
