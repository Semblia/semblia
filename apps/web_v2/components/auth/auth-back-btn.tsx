import { ArrowLeftIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface AuthBackBtnProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export function AuthBackBtn({
  onClick,
  label = "Back",
  className,
}: AuthBackBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 text-[13px] text-muted-foreground",
        "hover:text-foreground transition-colors duration-150 auth-btn",
        className,
      )}
    >
      <ArrowLeftIcon size={13} />
      {label}
    </button>
  );
}
