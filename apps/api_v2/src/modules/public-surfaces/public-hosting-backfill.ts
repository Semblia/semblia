import { Prisma, PrismaClient, PublicSurfaceFeature, PublicSurfaceResourceType, WidgetType } from "@workspace/database/prisma";
import { normalizePublicHostname } from "@workspace/types";
import { isEligiblePrimaryWall } from "../widgets/primary-wall.service.js";
import { buildSembliaFreeHostnames, isValidDnsHostname, isValidSembliaFreeHostLabel } from "./public-hostname.js";

export interface PublicHostingBackfillOptions {
  apply: boolean;
  formsBaseDomain: string;
  wallsBaseDomain: string;
  log(message: string): void;
}

export interface PublicHostingBackfillSummary {
  projectsScanned: number;
  missingCollectionHosts: number;
  missingWallHosts: number;
  invalidHostnames: number;
  normalizationConflicts: number;
  inconsistentResources: number;
  defaultConflicts: number;
  legacyHosts: number;
  unverifiedManagedFreeHosts: number;
  unverifiedExternalHosts: number;
  zeroPrimaryWithEligibleWallProjects: number;
  noEligibleWallProjects: number;
  multiplePrimaryWallProjects: number;
  manualResolutionRequired: number;
  changed: number;
}

type HostRow = { id: string; projectId: string | null; feature: PublicSurfaceFeature; resourceType: PublicSurfaceResourceType; resourceId: string | null; hostname: string; isDefault: boolean; status: string; verifiedAt: Date | null; retiredAt: Date | null };
type WallRow = { id: string; kind: WidgetType; isActive: boolean; wallSlug: string | null; publishedSnapshot: Prisma.JsonValue | null; isPrimaryWall: boolean; createdAt: Date };
type ProjectRow = { id: string; slug: string; createdAt: Date; hosts: HostRow[]; widgets: WallRow[] };
type Operation =
  | { type: "create"; feature: PublicSurfaceFeature; hostname: string }
  | { type: "host"; id: string; data: Record<string, unknown> }
  | { type: "primary"; ids: string[]; primaryId: string | null };

const emptySummary = (): PublicHostingBackfillSummary => ({ projectsScanned: 0, missingCollectionHosts: 0, missingWallHosts: 0, invalidHostnames: 0, normalizationConflicts: 0, inconsistentResources: 0, defaultConflicts: 0, legacyHosts: 0, unverifiedManagedFreeHosts: 0, unverifiedExternalHosts: 0, zeroPrimaryWithEligibleWallProjects: 0, noEligibleWallProjects: 0, multiplePrimaryWallProjects: 0, manualResolutionRequired: 0, changed: 0 });

function log(options: PublicHostingBackfillOptions, action: string, projectId: string, hostId?: string) {
  options.log(`public-hosting-backfill action=${action} projectId=${projectId}${hostId ? ` hostId=${hostId}` : ""}`);
}

function managedHost(host: HostRow, projectId: string, options: PublicHostingBackfillOptions) {
  const base = host.feature === PublicSurfaceFeature.COLLECTION ? normalizePublicHostname(options.formsBaseDomain) : normalizePublicHostname(options.wallsBaseDomain);
  if (!base || host.retiredAt !== null || host.projectId !== projectId || host.resourceType !== PublicSurfaceResourceType.PROJECT || (host.resourceId !== projectId && host.resourceId !== null)) return false;
  const hostname = normalizePublicHostname(host.hostname);
  const suffix = `.${base}`;
  if (!hostname || !hostname.endsWith(suffix)) return false;
  const label = hostname.slice(0, -suffix.length);
  return isValidSembliaFreeHostLabel(label) && !label.includes(".");
}

function isKnownLegacyHostname(hostname: string) {
  return normalizePublicHostname(hostname)?.endsWith(".testimonials.semblia.com") === true;
}

function planProject(project: ProjectRow, reservations: Map<string, Set<string | null>>, options: PublicHostingBackfillOptions, summary: PublicHostingBackfillSummary, emitPlan = true) {
  const operations: Operation[] = [];
  let manual = false;
  const markManual = (action: string, hostId?: string) => { manual = true; log(options, action, project.id, hostId); };
  for (const host of project.hosts) {
    const normalized = normalizePublicHostname(host.hostname);
    if (!normalized || !isValidDnsHostname(normalized)) { summary.invalidHostnames += 1; markManual("invalid-hostname", host.id); continue; }
    if (normalized !== host.hostname) {
      const duplicateNormalizedOwner = project.hosts.filter((entry) => (normalizePublicHostname(entry.hostname) ?? entry.hostname) === normalized).length > 1;
      const owners = reservations.get(normalized) ?? new Set<string | null>();
      if (duplicateNormalizedOwner || [...owners].some((owner) => owner !== project.id)) { summary.normalizationConflicts += 1; markManual("normalization-conflict", host.id); }
      else operations.push({ type: "host", id: host.id, data: { hostname: normalized } });
    }
    if (host.resourceType === PublicSurfaceResourceType.PROJECT && host.projectId === project.id && host.resourceId === null) {
      operations.push({ type: "host", id: host.id, data: { resourceId: project.id } });
    } else if (host.resourceType === PublicSurfaceResourceType.PROJECT && (host.projectId !== project.id || host.resourceId !== project.id)) {
      summary.inconsistentResources += 1; markManual("inconsistent-resource", host.id);
    }
    const isKnownLegacy = isKnownLegacyHostname(normalized);
    if (host.status === "ACTIVE" && host.verifiedAt === null && !isKnownLegacy) {
      if (managedHost(host, project.id, options)) { summary.unverifiedManagedFreeHosts += 1; operations.push({ type: "host", id: host.id, data: { verifiedAt: new Date() } }); }
      else { summary.unverifiedExternalHosts += 1; markManual("unverified-external", host.id); }
    }
  }

  let expected: { collection: string; wall: string } | null = null;
  if (!isValidSembliaFreeHostLabel(project.slug)) markManual("invalid-project-label");
  else {
    try { expected = buildSembliaFreeHostnames({ label: project.slug, formsBaseDomain: options.formsBaseDomain, wallsBaseDomain: options.wallsBaseDomain }); }
    catch { markManual("invalid-base-domain"); }
  }
  if (expected) {
    for (const [feature, hostname, counter] of [[PublicSurfaceFeature.COLLECTION, expected.collection, "missingCollectionHosts"], [PublicSurfaceFeature.WALL, expected.wall, "missingWallHosts"]] as const) {
      const exact = project.hosts.find((host) => host.feature === feature && (normalizePublicHostname(host.hostname) ?? host.hostname) === hostname && host.projectId === project.id && host.resourceType === PublicSurfaceResourceType.PROJECT && (host.resourceId === project.id || host.resourceId === null) && host.status === "ACTIVE" && host.retiredAt === null);
      if (!exact) {
        if (reservations.has(hostname)) markManual("reserved-hostname");
        else { summary[counter] += 1; operations.push({ type: "create", feature, hostname }); }
      }
      const defaults = project.hosts.filter((host) => host.feature === feature && host.status === "ACTIVE" && host.isDefault);
      if (defaults.length !== 1 || (exact && defaults[0]?.id !== exact.id)) summary.defaultConflicts += 1;
      for (const host of defaults.filter((host) => host.id !== exact?.id)) operations.push({ type: "host", id: host.id, data: { isDefault: false } });
      if (exact) {
        if (!exact.isDefault) operations.push({ type: "host", id: exact.id, data: { isDefault: true } });
      }
    }
  }
  for (const host of project.hosts.filter((host) => host.isDefault && isKnownLegacyHostname(host.hostname))) {
    summary.legacyHosts += 1; operations.push({ type: "host", id: host.id, data: { isDefault: false } });
  }
  const eligible = project.widgets.filter((widget) => isEligiblePrimaryWall(widget as never)).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  const primaries = project.widgets.filter((widget) => widget.isPrimaryWall === true);
  if (!eligible.length) { summary.noEligibleWallProjects += 1; if (primaries.length) operations.push({ type: "primary", ids: primaries.map((widget) => widget.id), primaryId: null }); }
  else {
    const eligiblePrimaries = eligible.filter((widget) => widget.isPrimaryWall === true);
    if (!eligiblePrimaries.length) summary.zeroPrimaryWithEligibleWallProjects += 1;
    if (primaries.length > 1) summary.multiplePrimaryWallProjects += 1;
    const primaryId = eligiblePrimaries[0]?.id ?? eligible[0]!.id;
    const clearIds = primaries.map((widget) => widget.id).filter((id) => id !== primaryId);
    if (clearIds.length || primaryId !== eligiblePrimaries[0]?.id) operations.push({ type: "primary", ids: clearIds, primaryId });
  }
  if (manual) summary.manualResolutionRequired += 1;
  const deduped = [...operations.reduce((result, operation) => {
    const key = operation.type === "host" ? `host:${operation.id}` : operation.type === "create" ? `create:${operation.hostname}` : "primary";
    const previous = result.get(key);
    result.set(key, previous?.type === "host" && operation.type === "host" ? { ...operation, data: { ...previous.data, ...operation.data } } : operation);
    return result;
  }, new Map<string, Operation>()).values()];
  if (!manual && emitPlan) for (const operation of deduped) log(options, `planned-${operation.type}`, project.id, operation.type === "host" ? operation.id : undefined);
  return { operations: manual ? [] : deduped, manual };
}

function hostReservations(rows: Array<{ hostname: string; projectId: string | null }>) {
  const reservations = new Map<string, Set<string | null>>();
  for (const row of rows) {
    const hostname = normalizePublicHostname(row.hostname) ?? row.hostname;
    const owners = reservations.get(hostname) ?? new Set<string | null>();
    owners.add(row.projectId);
    reservations.set(hostname, owners);
  }
  return reservations;
}

async function loadProjects(client: Pick<PrismaClient, "project">): Promise<ProjectRow[]> {
  const rows = await client.project.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, slug: true, createdAt: true, publicSurfaceHosts: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] }, widgets: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, kind: true, isActive: true, wallSlug: true, publishedSnapshot: true, isPrimaryWall: true, createdAt: true } } } });
  return (rows as unknown as Array<ProjectRow & { publicSurfaceHosts: HostRow[] }>).map((row) => ({ ...row, hosts: row.publicSurfaceHosts }));
}

async function applyOperations(tx: Prisma.TransactionClient, project: ProjectRow, operations: Operation[]) {
  for (const operation of operations) {
    if (operation.type === "host") await tx.publicSurfaceHost.update({ where: { id: operation.id }, data: operation.data as never });
    if (operation.type === "create") await tx.publicSurfaceHost.create({ data: { projectId: project.id, feature: operation.feature, resourceType: PublicSurfaceResourceType.PROJECT, resourceId: project.id, hostname: operation.hostname, isDefault: true, status: "ACTIVE", verifiedAt: new Date() } });
    if (operation.type === "primary") { if (operation.ids.length) await tx.widget.updateMany({ where: { id: { in: operation.ids } }, data: { isPrimaryWall: false } }); if (operation.primaryId) await tx.widget.updateMany({ where: { id: operation.primaryId, isPrimaryWall: { not: true } }, data: { isPrimaryWall: true } }); }
  }
}

function isHostnameP2002(error: unknown) {
  if (!(typeof error === "object" && error !== null && "code" in error && error.code === "P2002" && "meta" in error)) return false;
  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  const values = Array.isArray(target) ? target : [target];
  return values.some((value) => typeof value === "string" && /hostname/i.test(value));
}

export async function backfillPublicHosting(prisma: PrismaClient, options: PublicHostingBackfillOptions): Promise<PublicHostingBackfillSummary> {
  const summary = emptySummary();
  const projects = await loadProjects(prisma);
  const allHostnames = hostReservations(await prisma.publicSurfaceHost.findMany({ select: { hostname: true, projectId: true } }));
  for (const project of projects) {
    summary.projectsScanned += 1;
    const plan = planProject(project, allHostnames, options, summary);
    if (!options.apply || plan.manual || !plan.operations.length) continue;
    let applied = false;
    for (let attempt = 0; attempt < 2 && !applied; attempt += 1) {
      try {
        const committed = await prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT "id" FROM "Project" WHERE "id" = ${project.id} FOR UPDATE`;
          const current = (await loadProjects(tx as PrismaClient)).find((entry) => entry.id === project.id);
          if (!current) return;
          const currentReservations = hostReservations(await tx.publicSurfaceHost.findMany({ select: { hostname: true, projectId: true } }));
          const fresh = planProject(current, currentReservations, options, emptySummary(), false);
          if (fresh.manual) { summary.manualResolutionRequired += 1; return; }
          await applyOperations(tx, current, fresh.operations);
          return fresh.operations;
        });
        if (committed) {
          summary.changed += committed.length;
          for (const operation of committed) log(options, `applied-${operation.type}`, project.id, operation.type === "host" ? operation.id : undefined);
        }
        applied = true;
      } catch (error: unknown) {
        if (!isHostnameP2002(error)) throw error;
        if (attempt === 1) { summary.manualResolutionRequired += 1; log(options, "hostname-race", project.id); break; }
      }
    }
  }
  return summary;
}
