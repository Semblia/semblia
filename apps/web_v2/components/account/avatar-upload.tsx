"use client";

import * as React from "react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { CameraIcon } from "@phosphor-icons/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// ── Avatar upload ──────────────────────────────────────────────────────────────

export interface AvatarUploadProps {
  imageUrl?: string | null;
  initials?: string;
  className?: string;
}

export function AvatarUpload({
  imageUrl,
  initials,
  className,
}: AvatarUploadProps) {
  const { user } = useUser();
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    setUploading(true);
    try {
      await user.setProfileImage({ file });
      toast.success("Avatar updated.");
    } catch {
      toast.error("Failed to update avatar.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("relative inline-block", className)}>
      <Avatar
        size="lg"
        className="size-16 cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        {imageUrl && <AvatarImage src={imageUrl} alt="Profile photo" />}
        <AvatarFallback className="text-sm font-semibold">
          {initials ?? "?"}
        </AvatarFallback>
      </Avatar>

      <button
        type="button"
        aria-label="Change profile photo"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-opacity",
          uploading ? "opacity-50 pointer-events-none" : "hover:bg-muted",
        )}
      >
        <CameraIcon className="size-3 text-muted-foreground" />
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
