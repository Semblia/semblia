import * as React from "react";
import {
  Warning as WarningIcon,
  WarningOctagon as WarningOctagonIcon,
} from "@phosphor-icons/react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type ConfirmationIntent = "danger" | "warning";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intent?: ConfirmationIntent;
  title: React.ReactNode;
  description: React.ReactNode;
  confirmLabel: React.ReactNode;
  cancelLabel?: React.ReactNode;
  onConfirm: () => void;
  size?: "default" | "sm";
}

const intentConfig = {
  danger: {
    Icon: WarningOctagonIcon,
    actionVariant: "destructive" as const,
    mediaClassName:
      "bg-destructive/10 text-destructive ring-1 ring-destructive/12",
  },
  warning: {
    Icon: WarningIcon,
    actionVariant: "warning" as const,
    mediaClassName: "bg-warning/12 text-warning ring-1 ring-warning/15",
  },
};

export function ConfirmationDialog({
  open,
  onOpenChange,
  intent = "danger",
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  size = "default",
}: ConfirmationDialogProps) {
  const { Icon, actionVariant, mediaClassName } = intentConfig[intent];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size={size}>
        <AlertDialogHeader>
          <AlertDialogMedia className={cn(mediaClassName)}>
            <Icon className="size-5" aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction variant={actionVariant} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
