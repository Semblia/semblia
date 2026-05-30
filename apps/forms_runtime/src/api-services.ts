import { runtimeApiPost } from "./api-client.js";
import type { FormsRuntimeEnv } from "./env.js";
import type {
  FormsRuntimeServices,
  HostedFormRequestMetadata,
  HostedFormResolveResult,
} from "./types.js";

function runtimeForwardHeaders(
  metadata: HostedFormRequestMetadata | undefined,
): Record<string, string> {
  return {
    ...(metadata?.userAgent
      ? { "x-tresta-original-user-agent": metadata.userAgent }
      : {}),
    ...(metadata?.forwardedFor
      ? { "x-tresta-original-forwarded-for": metadata.forwardedFor }
      : {}),
  };
}

export function createApiRuntimeServices(
  env: FormsRuntimeEnv,
): FormsRuntimeServices {
  return {
    resolveForm(context, metadata) {
      return runtimeApiPost<HostedFormResolveResult>(
        env,
        "/runtime/forms/resolve",
        context,
        {
          "x-tresta-original-host": `${context.projectPublicSlug}.${env.FORMS_RUNTIME_PUBLIC_BASE_DOMAIN}`,
          "x-tresta-original-path": context.path,
          ...runtimeForwardHeaders(metadata),
        },
      );
    },
    submitForm(input) {
      return runtimeApiPost<{ redirectTo: string | null }>(
        env,
        "/runtime/forms/submit",
        input,
        {
          "x-tresta-original-host": `${input.context.projectPublicSlug}.${env.FORMS_RUNTIME_PUBLIC_BASE_DOMAIN}`,
          "x-tresta-original-path": input.context.path,
          ...runtimeForwardHeaders(input.metadata),
        },
      );
    },
  };
}
