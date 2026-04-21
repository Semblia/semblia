import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

/* ─── Empty state ─────────────────────────────────────────────────────────── */

export function FormEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <p className="text-sm font-medium text-foreground">No forms yet</p>
      <p className="max-w-[300px] text-xs leading-relaxed text-muted-foreground">
        Create your first testimonial collection form. You can run multiple
        variants for A/B testing.
      </p>
      <Button size="sm" className="mt-1 gap-1.5 text-xs" onClick={onCreate}>
        <PlusIcon className="size-3.5" aria-hidden="true" />
        Create form
      </Button>
    </div>
  );
}
