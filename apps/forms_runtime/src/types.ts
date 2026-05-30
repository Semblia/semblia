import type { FormConfig } from "@workspace/forms-core";
import type { HostedFormRequestContext } from "./request-context.js";

export interface HostedFormResolveResult {
  project: {
    id: string;
    slug: string;
    name: string;
    publicSlug: string;
    brandColorPrimary: string | null;
  };
  form: {
    id: string;
    slug: string | null;
    name: string;
    description: string | null;
    config: FormConfig | Record<string, unknown>;
    publishedAt: string | null;
  };
}

export interface HostedFormSubmitResult {
  redirectTo: string | null;
}

export interface FormsRuntimeServices {
  resolveForm(
    context: HostedFormRequestContext,
  ): Promise<HostedFormResolveResult>;
  submitForm(input: {
    context: HostedFormRequestContext;
    contentType: string;
    body: string;
  }): Promise<HostedFormSubmitResult>;
}
