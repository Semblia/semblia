import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/urls";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Semblia</p>
        <nav className="flex items-center gap-5">
          <Link
            href="/terms"
            className="transition-colors duration-[160ms] hover:text-foreground"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="transition-colors duration-[160ms] hover:text-foreground"
          >
            Privacy
          </Link>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="transition-colors duration-[160ms] hover:text-foreground"
          >
            {SUPPORT_EMAIL}
          </a>
        </nav>
      </div>
    </footer>
  );
}
