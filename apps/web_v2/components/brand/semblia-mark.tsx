import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/brand-logo";

export function SembliaWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* bg-brand is amber — use default (dark) marks for contrast in both themes */}
      <BrandLogo
        size={16}
        variant="default"
        background="var(--brand)"
        containerClassName="w-7 h-7 rounded-[6px] shrink-0"
        alt=""
      />
      <span className="font-semibold tracking-tight text-[1.05rem] text-foreground">
        Semblia
      </span>
    </div>
  );
}
