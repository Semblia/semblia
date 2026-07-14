const WALLS_BASE_DOMAIN = "walls.semblia.com";

/** Normalizes only the directly connected Host header; never trust forwarded hosts. */
export function normalizeWallHostname(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const candidate = value.trim().toLowerCase();
  const port = candidate.match(/:(\d+)$/)?.[1];
  if (port && (Number(port) > 65535 || Number(port) < 1)) return null;
  const hostname = (
    port ? candidate.slice(0, -(port.length + 1)) : candidate
  ).replace(/\.+$/, "");
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(
    hostname,
  )
    ? hostname
    : null;
}

/** A project wall is exactly one DNS label below the managed wall service host. */
export function projectWallHostname(
  host: string | null | undefined,
): string | null {
  const hostname = normalizeWallHostname(host);
  if (!hostname || !hostname.endsWith(`.${WALLS_BASE_DOMAIN}`)) return null;
  const label = hostname.slice(0, -(WALLS_BASE_DOMAIN.length + 1));
  return label && !label.includes(".") ? hostname : null;
}

export function isProjectWallHost(host: string | null | undefined): boolean {
  return projectWallHostname(host) !== null;
}
