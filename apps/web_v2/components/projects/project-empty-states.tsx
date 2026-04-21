import Link from "next/link";
import {
  MagnifyingGlass as SearchIcon,
  ChatText as MessageSquareTextIcon,
  Plus as PlusIcon,
  X as XIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

// ── Empty state: no search results ─────────────────────────────────────────────

export function EmptySearch({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center py-16 px-6 text-center animate-fade-up">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-muted">
        <SearchIcon className="size-4 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">No projects match</p>
      <p className="mt-1 text-xs text-muted-foreground">
        No results for <span className="font-medium text-foreground">&ldquo;{query}&rdquo;</span>
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="mt-3 gap-1.5 text-xs"
        onClick={onClear}
      >
        <XIcon className="size-3" />
        Clear search
      </Button>
    </div>
  );
}

// ── Empty state: no projects yet ───────────────────────────────────────────────

export function EmptyProjects() {
  return (
    <div className="flex flex-col items-center py-20 px-6 text-center animate-fade-up">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted">
        <MessageSquareTextIcon className="size-5 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold">No projects yet</h3>
      <p className="mt-1.5 max-w-[260px] text-xs leading-relaxed text-muted-foreground">
        Create your first project to start collecting testimonials and building credibility.
      </p>
      <Button size="sm" className="mt-5 gap-1.5" asChild>
        <Link href="/projects/new">
          <PlusIcon className="size-3.5" />
          New project
        </Link>
      </Button>
    </div>
  );
}
