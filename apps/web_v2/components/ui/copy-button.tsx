"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "shrink-0 rounded px-1.5 py-1 text-[10px] font-medium transition-colors",
        copied
          ? "text-success"
          : "text-muted-foreground hover:bg-background hover:text-foreground",
        className
      )}
      aria-label={copied ? "Copied!" : `Copy ${label}`}
    >
      {copied ? (
        <span className="flex items-center gap-1">
          <CheckIcon className="size-3" />
          Copied
        </span>
      ) : (
        label
      )}
    </button>
  );
}
