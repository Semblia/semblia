/**
 * Server-side API helpers for Next.js server components and route handlers.
 * Uses `@clerk/nextjs/server` to retrieve the auth token.
 */

import { auth } from "@clerk/nextjs/server";
import {
  fetchCurrentUser,
  fetchProjectBySlug,
  fetchProjects,
  ApiError,
} from "./semblia-api";
import type {
  V2ProjectDTO,
  V2UserDTO,
  V2PaginatedResponse,
} from "@workspace/types";

async function getServerToken(): Promise<string | null> {
  const { getToken } = await auth();
  return getToken();
}

export async function serverFetchCurrentUser(): Promise<V2UserDTO> {
  const token = await getServerToken();
  return fetchCurrentUser(token);
}

export async function serverFetchProjectBySlug(
  slug: string,
): Promise<V2ProjectDTO | null> {
  const token = await getServerToken();
  try {
    return await fetchProjectBySlug(token, slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function serverFetchProjects(params?: {
  page?: number;
  pageSize?: number;
}): Promise<V2PaginatedResponse<V2ProjectDTO>> {
  const token = await getServerToken();
  return fetchProjects(token, params);
}
