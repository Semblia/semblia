"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export interface DeleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  onConfirm: () => void;
}

export function DeleteProjectDialog({
  open,
  onOpenChange,
  slug,
  onConfirm,
}: DeleteProjectDialogProps) {
  const [typed, setTyped] = React.useState("");
  const match = typed === slug;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setTyped("");
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete project?</DialogTitle>
          <DialogDescription>
            This permanently deletes the project, forms, widgets, and
            testimonials. Type <code className="font-mono text-xs">{slug}</code>{" "}
            to confirm.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={slug}
          autoFocus
        />
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTyped("");
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!match}
            onClick={() => {
              if (match) onConfirm();
            }}
          >
            Delete project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
