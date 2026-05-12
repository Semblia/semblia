"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import type { V2UserDTO } from "@workspace/types";
import { fetchCurrentUser } from "@/lib/tresta-api";
import { queryKeys } from "@/hooks/api";

export function useCurrentUser() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery<V2UserDTO>({
    queryKey: queryKeys.currentUser,
    queryFn: async () => {
      const token = await getToken();
      return fetchCurrentUser(token);
    },
    enabled: isSignedIn === true,
    staleTime: 5 * 60 * 1000,
  });
}
