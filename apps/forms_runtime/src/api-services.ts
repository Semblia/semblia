import { runtimeApiPost } from "./api-client.js";
import type { FormsRuntimeEnv } from "./env.js";
import type { FormsRuntimeServices, HostedFormResolveResult } from "./types.js";

export function createApiRuntimeServices(
  env: FormsRuntimeEnv,
): FormsRuntimeServices {
  return {
    resolveForm(context) {
      return runtimeApiPost<HostedFormResolveResult>(
        env,
        "/runtime/forms/resolve",
        context,
        {
          "x-tresta-original-host": `${context.projectPublicSlug}.${env.FORMS_RUNTIME_PUBLIC_BASE_DOMAIN}`,
          "x-tresta-original-path": context.path,
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
        },
      );
    },
  };
}
