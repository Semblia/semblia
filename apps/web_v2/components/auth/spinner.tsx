import { Spinner as InkSpinner } from "@/components/ui/spinner";

/** Auth-flow loader — delegates to the shared dot-matrix Spinner. */
export function Spinner({ size = 14 }: { size?: number }) {
  return <InkSpinner aria-hidden style={{ width: size, height: size }} />;
}
