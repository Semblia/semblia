"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import type {
  V2InitiateProjectOwnershipTransferBody,
  V2ProjectMemberRole,
} from "@workspace/types";
import {
  fetchProjects,
  fetchProjectBySlug,
  createProject,
  updateProject,
  deleteProject,
  fetchProjectMembers,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
  fetchProjectMemberInvites,
  createProjectMemberInvite,
  revokeProjectMemberInvite,
  acceptProjectMemberInvite,
  fetchProjectOwnershipTransfer,
  initiateProjectOwnershipTransfer,
  cancelProjectOwnershipTransfer,
  fetchMyProjectTransfers,
  acceptProjectTransfer,
  declineProjectTransfer,
  fetchAllowedOrigins,
  fetchPublicSurfaceHosts,
  replaceAllowedOrigins,
  generateSigningSecret,
  clearSigningSecret,
} from "@/lib/semblia-api";
import { queryKeys } from "./keys";
import { liveQueryOptions, type ApiQueryOptions } from "./query-options";

export function useProjectsList(
  params?: { page?: number; pageSize?: number },
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.projects.list(params),
    queryFn: async () => {
      const token = await getToken();
      return fetchProjects(token, params);
    },
    enabled: isSignedIn === true,
    ...liveQueryOptions(options),
  });
}

export function useProject(slug: string, options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.projects.detail(slug),
    queryFn: async () => {
      const token = await getToken();
      return fetchProjectBySlug(token, slug);
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

export function useCreateProject() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      name: string;
      slug: string;
      projectType?: string;
      shortDescription?: string;
      websiteUrl?: string;
      brandColorPrimary?: string | null;
    }) => {
      const token = await getToken();
      return createProject(token, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useUpdateProject(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const token = await getToken();
      return updateProject(token, slug, body);
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.projects.detail(slug), data);
      qc.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useDeleteProject(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return deleteProject(token, slug);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.all });
      qc.removeQueries({ queryKey: queryKeys.projects.detail(slug) });
    },
  });
}

export function useProjectMembers(slug: string, options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.projects.members(slug),
    queryFn: async () => {
      const token = await getToken();
      return fetchProjectMembers(token, slug);
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

export function useAddProjectMember(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      userId: string;
      role?: V2ProjectMemberRole;
    }) => {
      const token = await getToken();
      return addProjectMember(token, slug, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.members(slug) });
    },
  });
}

export function useUpdateProjectMember(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { userId: string; role: V2ProjectMemberRole }) => {
      const token = await getToken();
      return updateProjectMember(token, slug, vars.userId, { role: vars.role });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.members(slug) });
    },
  });
}

export function useRemoveProjectMember(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const token = await getToken();
      return removeProjectMember(token, slug, userId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.members(slug) });
    },
  });
}

export function useProjectMemberInvites(
  slug: string,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.projects.memberInvites(slug),
    queryFn: async () => {
      const token = await getToken();
      return fetchProjectMemberInvites(token, slug);
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

export function useCreateProjectMemberInvite(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: { email: string; role?: V2ProjectMemberRole }) => {
      const token = await getToken();
      return createProjectMemberInvite(token, slug, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.projects.memberInvites(slug),
      });
    },
  });
}

export function useRevokeProjectMemberInvite(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const token = await getToken();
      return revokeProjectMemberInvite(token, slug, inviteId);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.projects.memberInvites(slug),
      });
    },
  });
}

export function useAcceptProjectMemberInvite() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const token = await getToken();
      return acceptProjectMemberInvite(token, inviteId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useProjectOwnershipTransfer(
  slug: string,
  options?: ApiQueryOptions,
) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.projects.ownershipTransfer(slug),
    queryFn: async () => {
      const token = await getToken();
      return fetchProjectOwnershipTransfer(token, slug);
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

export function useInitiateProjectOwnershipTransfer(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: V2InitiateProjectOwnershipTransferBody) => {
      const token = await getToken();
      return initiateProjectOwnershipTransfer(token, slug, body);
    },
    onSuccess: (transfer) => {
      qc.setQueryData(queryKeys.projects.ownershipTransfer(slug), transfer);
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
      qc.invalidateQueries({ queryKey: queryKeys.me.projectTransfers });
    },
  });
}

export function useCancelProjectOwnershipTransfer(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return cancelProjectOwnershipTransfer(token, slug);
    },
    onSuccess: () => {
      qc.setQueryData(queryKeys.projects.ownershipTransfer(slug), null);
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
      qc.invalidateQueries({ queryKey: queryKeys.me.projectTransfers });
    },
  });
}

export function useMyProjectTransfers(options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.me.projectTransfers,
    queryFn: async () => {
      const token = await getToken();
      return fetchMyProjectTransfers(token);
    },
    enabled: isSignedIn === true,
    ...liveQueryOptions(options),
  });
}

export function useAcceptProjectTransfer() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (transferId: string) => {
      const token = await getToken();
      return acceptProjectTransfer(token, transferId);
    },
    onSuccess: (transfer) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.all });
      qc.invalidateQueries({
        queryKey: queryKeys.projects.detail(transfer.projectSlug),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.projects.members(transfer.projectSlug),
      });
      qc.setQueryData(
        queryKeys.projects.ownershipTransfer(transfer.projectSlug),
        null,
      );
      qc.invalidateQueries({ queryKey: queryKeys.me.projectTransfers });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useDeclineProjectTransfer() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (transferId: string) => {
      const token = await getToken();
      return declineProjectTransfer(token, transferId);
    },
    onSuccess: (transfer) => {
      qc.setQueryData(
        queryKeys.projects.ownershipTransfer(transfer.projectSlug),
        null,
      );
      qc.invalidateQueries({ queryKey: queryKeys.me.projectTransfers });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function usePublicSurfaceHosts(slug: string, options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.projects.publicSurfaceHosts(slug),
    queryFn: async () => {
      const token = await getToken();
      return fetchPublicSurfaceHosts(token, slug);
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

export function useAllowedOrigins(slug: string, options?: ApiQueryOptions) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.projects.allowedOrigins(slug),
    queryFn: async () => {
      const token = await getToken();
      const result = await fetchAllowedOrigins(token, slug);
      return result.origins;
    },
    enabled: isSignedIn === true && !!slug,
    ...liveQueryOptions(options),
  });
}

export function useReplaceAllowedOrigins(slug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (origins: string[]) => {
      const token = await getToken();
      return replaceAllowedOrigins(token, slug, origins);
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.projects.allowedOrigins(slug), data.origins);
    },
  });
}

export function useGenerateSigningSecret(slug: string) {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return generateSigningSecret(token, slug);
    },
  });
}

export function useClearSigningSecret(slug: string) {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return clearSigningSecret(token, slug);
    },
  });
}
