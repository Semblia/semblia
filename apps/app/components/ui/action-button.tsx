import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ActionTone = "neutral" | "success" | "warning" | "danger";

interface ActionButtonProps extends React.ComponentProps<typeof Button> {
  tone?: ActionTone;
}

const toneClasses: Record<ActionTone, string> = {
  neutral: "text-muted-foreground hover:text-foreground",
  success:
    "text-muted-foreground hover:border-success/30 hover:bg-success/8 hover:text-success",
  warning:
    "text-muted-foreground hover:border-warning/35 hover:bg-warning/10 hover:text-warning",
  danger:
    "text-muted-foreground hover:border-destructive/30 hover:bg-destructive/6 hover:text-destructive",
};

function ActionButton({
  tone = "neutral",
  variant = "outline",
  className,
  ...props
}: ActionButtonProps) {
  return (
    <Button
      variant={variant}
      className={cn("active:scale-[0.97]", toneClasses[tone], className)}
      {...props}
    />
  );
}

export { ActionButton };
