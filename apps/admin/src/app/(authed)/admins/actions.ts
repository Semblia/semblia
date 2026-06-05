"use server";

import { revalidatePath } from "next/cache";
import { adminPost, AdminApiError } from "@/lib/api";
import type { AdminUser, CreateAdminUserBody } from "@/lib/admin-types";

function asApiError(error: unknown): Error {
  if (error instanceof AdminApiError) {
    return new Error(`API ${error.status}: ${String(error.body)}`);
  }
  return error instanceof Error ? error : new Error(String(error));
}

export async function grantAdminAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const clerkUserId = String(formData.get("clerkUserId") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!email || !clerkUserId) {
    throw new Error("Email and Clerk user ID are required");
  }

  const body: CreateAdminUserBody = {
    email,
    clerkUserId,
    ...(notes ? { notes } : {}),
  };

  try {
    await adminPost<AdminUser>("/admin/users", body);
  } catch (error) {
    throw asApiError(error);
  }

  revalidatePath("/admins");
  revalidatePath("/audit-logs");
}

export async function deactivateAdminAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("Missing admin id");
  }

  try {
    await adminPost<AdminUser>(
      `/admin/users/${encodeURIComponent(id)}/deactivate`,
      {},
    );
  } catch (error) {
    throw asApiError(error);
  }

  revalidatePath("/admins");
  revalidatePath("/audit-logs");
}
