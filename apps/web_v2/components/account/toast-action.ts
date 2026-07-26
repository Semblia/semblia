"use client";

import { toast } from "sonner";

/**
 * Runs one account action and reports its outcome with a toast.
 *
 * Never throws: it resolves to `true` when the action succeeded and `false`
 * when it failed, so callers can keep their follow-up work in one place
 * instead of repeating the same try/catch/toast triplet.
 */
export async function runWithToast(
  action: () => unknown,
  messages: { success: string; error: string },
): Promise<boolean> {
  try {
    await action();
    toast.success(messages.success);
    return true;
  } catch {
    toast.error(messages.error);
    return false;
  }
}
