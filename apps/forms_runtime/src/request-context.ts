export type HostedFormRequestContext = {
  projectPublicSlug: string;
  formSlug: string | null;
  path: string;
};

const submitSuffix = "/__submit";

export function toSubmitPath(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === "/") return submitSuffix;
  return `${normalized}${submitSuffix}`;
}

export function toSubmittedFormPath(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === submitSuffix) return "/";
  if (!normalized.endsWith(submitSuffix)) return normalized;
  const formPath = normalized.slice(0, -submitSuffix.length);
  return formPath || "/";
}

export function resolveRequestContext(input: {
  host: string | undefined;
  url: string | undefined;
  baseDomain: string;
}): HostedFormRequestContext {
  const host = input.host?.split(":")[0]?.toLowerCase();
  if (!host || !host.endsWith(`.${input.baseDomain}`)) {
    throw new Error("Unsupported hosted form host");
  }

  const projectPublicSlug = host.slice(
    0,
    host.length - input.baseDomain.length - 1,
  );
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(projectPublicSlug)) {
    throw new Error("Invalid hosted form project slug");
  }

  const parsed = new URL(input.url ?? "/", `https://${host}`);
  const path = normalizePath(parsed.pathname);
  const segments = path.split("/").filter(Boolean);

  return {
    projectPublicSlug,
    formSlug: segments[0] ?? null,
    path,
  };
}

function normalizePath(path: string): string {
  const normalized = path.replace(/\/+$/, "") || "/";
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}
