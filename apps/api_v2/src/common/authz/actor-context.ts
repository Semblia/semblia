export type ActorType = "user" | "api_key" | "agent_key";

export type ClerkOrganizationClaim = {
  id: string;
  slg?: string;
  rol?: string;
  per?: string;
};

export type ActorContext = {
  actorType: ActorType;
  userId?: string;
  clerkOrgId?: string;
  clerkOrgSlug?: string;
  clerkOrgRole?: string;
  clerkOrgPermissions: string[];
  projectId?: string;
  credentialId?: string;
  scopes: string[];
};

export type RequestWithActor = {
  actor?: ActorContext;
  clerkUserId?: string;
  user?: { id?: string };
};

export function buildUserActorContext(
  userId: string,
  organizationClaim: ClerkOrganizationClaim | null,
): ActorContext {
  return {
    actorType: "user",
    userId,
    clerkOrgId: organizationClaim?.id,
    clerkOrgSlug: organizationClaim?.slg,
    clerkOrgRole: organizationClaim?.rol,
    clerkOrgPermissions: parsePermissions(organizationClaim?.per),
    scopes: [],
  };
}

export function buildCredentialActorContext({
  actorType,
  userId,
  projectId,
  credentialId,
  scopes,
}: {
  actorType: Extract<ActorType, "api_key" | "agent_key">;
  userId: string;
  projectId: string;
  credentialId: string;
  scopes: string[];
}): ActorContext {
  return {
    actorType,
    userId,
    clerkOrgPermissions: [],
    projectId,
    credentialId,
    scopes,
  };
}

export function parseClerkOrganizationClaim(
  value: unknown,
): ClerkOrganizationClaim | null {
  if (!isRecord(value)) return null;

  const id = readString(value.id);
  if (!id) return null;

  return {
    id,
    slg: readString(value.slg),
    rol: readString(value.rol),
    per: readString(value.per),
  };
}

export function actorFromRequest(
  request: RequestWithActor,
): ActorContext | null {
  if (request.actor) return request.actor;

  const userId = request.user?.id ?? request.clerkUserId;
  if (!userId) return null;

  return buildUserActorContext(userId, null);
}

function parsePermissions(value: string | undefined): string[] {
  return value
    ? value
        .split(",")
        .map((permission) => permission.trim())
        .filter(Boolean)
    : [];
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
