import {
  WarningCircle as AlertCircle,
  CheckCircle as CheckCircle2,
  Info,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type NoticeType = "error" | "success" | "info";

const NOTICE_STYLES: Record<
  NoticeType,
  { bg: string; border: string; text: string; Icon: typeof AlertCircle }
> = {
  error: {
    bg: "bg-destructive/8",
    border: "border-destructive/15",
    text: "text-destructive",
    Icon: AlertCircle,
  },
  success: {
    bg: "bg-success/8",
    border: "border-success/15",
    text: "text-success",
    Icon: CheckCircle2,
  },
  info: {
    bg: "bg-brand/8",
    border: "border-brand/15",
    text: "text-brand",
    Icon: Info,
  },
};

interface AuthNoticeProps {
  error?: string | null;
  message?: string | null;
  type?: NoticeType;
}

export function AuthNotice({ error, message, type }: AuthNoticeProps) {
  const text = error || message;
  if (!text) return null;

  const resolvedType = type ?? (error ? "error" : "info");
  const style = NOTICE_STYLES[resolvedType];

  return (
    <div
      className={cn(
        "auth-notice-in flex items-start gap-2 rounded-lg border p-3",
        style.bg,
        style.border,
      )}
      role={resolvedType === "error" ? "alert" : "status"}
    >
      <style.Icon className={cn("size-3.5 shrink-0 mt-0.5", style.text)} />
      <p className={cn("text-xs leading-relaxed", style.text)}>{text}</p>
    </div>
  );
}
