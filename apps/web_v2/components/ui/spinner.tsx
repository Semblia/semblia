import { cn } from "@/lib/utils";

/**
 * Dot-matrix loader — three ink dots pulsing in sequence. The one loading
 * language product-wide (design canon L5); never use a spinning glyph.
 */
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      role="status"
      aria-label="Loading"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("size-4 shrink-0", className)}
      {...props}
    >
      <circle className="spinner-dot" cx="4.5" cy="12" r="2.5" />
      <circle
        className="spinner-dot [animation-delay:150ms]"
        cx="12"
        cy="12"
        r="2.5"
      />
      <circle
        className="spinner-dot [animation-delay:300ms]"
        cx="19.5"
        cy="12"
        r="2.5"
      />
    </svg>
  );
}

export { Spinner };
