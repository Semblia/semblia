"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { apiRequest } from "@/lib/api-client";

export interface ApiUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  plan: "FREE" | "PRO";
  createdAt: string;
  updatedAt: string;
}

export function useCurrentUser() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery<ApiUser>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const token = await getToken();
      return apiRequest<ApiUser>("/users/me", token);
    },
    enabled: isSignedIn === true,
    staleTime: 5 * 60 * 1000,
  });
}
