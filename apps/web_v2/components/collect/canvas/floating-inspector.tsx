"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InspectorShell } from "@/components/collect/inspector/inspector-shell";
import type { FormConfig } from "@/lib/collect/types";

export function FloatingInspector({
  slug,
  config,
  open,
  onClose,
}: {
  slug: string;
  config: FormConfig;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          data-slot="floating-inspector"
          initial={{ x: 24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 24, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
          }}
          className="pointer-events-auto absolute top-3 bottom-3 right-3 z-30 flex w-[360px] max-w-[90vw] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl shadow-black/10"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
            <div>
              <p className="text-xs font-semibold text-foreground">Inspector</p>
              <p className="text-[10px] text-muted-foreground">
                Edits sync live to the editor.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onClose}
              aria-label="Close inspector"
            >
              <XIcon />
            </Button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <InspectorShell slug={slug} config={config} />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
