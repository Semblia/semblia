import { z } from "zod";

function parseHostProjectMap(value: string | undefined, ctx: z.RefinementCtx) {
  if (!value?.trim()) return {};

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      ctx.addIssue({
        code: "custom",
        message: "FORMS_RUNTIME_PROJECT_ID_BY_HOST must be a JSON object",
      });
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter((entry): entry is [string, string] => {
          const [host, projectId] = entry;
          return Boolean(host.trim()) && typeof projectId === "string" && Boolean(projectId.trim());
        })
        .map(([host, projectId]) => [host.trim().toLowerCase(), projectId.trim()]),
    );
  } catch {
    ctx.addIssue({
      code: "custom",
      message: "FORMS_RUNTIME_PROJECT_ID_BY_HOST must be valid JSON",
    });
    return {};
  }
}

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(3007),
    FORMS_RUNTIME_MODE: z.enum(["api", "mock"]).default("api"),
    FORMS_RUNTIME_API_BASE_URL: z.string().url().optional(),
    /**
     * Project signing secret used by forms_runtime when it proxies browser
     * submissions to api_v2. The public API expects X-Semblia-Signature over
     * `v1.{timestamp}.{rawBody}`, not the old internal runtime signature.
     */
    FORMS_RUNTIME_SIGNING_SECRET: z.string().min(32).optional(),
    FORMS_RUNTIME_SIGNING_SECRET_ARN: z.string().trim().min(1).optional(),
    FORMS_RUNTIME_PUBLIC_BASE_DOMAIN: z.string().default("forms.semblia.com"),
    /**
     * Temporary bridge until api_v2 exposes host-based runtime resolution. The
     * current api_v2 route still validates `projectId` as a required query.
     */
    FORMS_RUNTIME_PROJECT_ID: z.string().trim().min(1).optional(),
    FORMS_RUNTIME_PROJECT_ID_BY_HOST: z
      .string()
      .optional()
      .transform((value, ctx) => parseHostProjectMap(value, ctx)),
    /**
     * Space-separated CSP `connect-src` origins for presigned upload PUTs.
     * Defaults to `https:` so hosted pages can upload to storage without a
     * config-only outage; production should tighten this to the bucket origin.
     */
    FORMS_RUNTIME_UPLOAD_CONNECT_SRC: z.string().default("https:"),
    FORMS_RUNTIME_API_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(5000),
    FORMS_RUNTIME_EDGE_RATE_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(60_000),
  })
  .superRefine((env, ctx) => {
    if (env.FORMS_RUNTIME_MODE === "mock") return;
    if (!env.FORMS_RUNTIME_API_BASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["FORMS_RUNTIME_API_BASE_URL"],
        message: "FORMS_RUNTIME_API_BASE_URL is required in api mode",
      });
    }
  });

export type FormsRuntimeEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv): FormsRuntimeEnv {
  return envSchema.parse(source);
}
