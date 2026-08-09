import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import type { FormsRuntimeEnv } from "./env.js";

type SecretClient = Pick<SecretsManagerClient, "send">;

let deployedSecretCache = new Map<string, Promise<string>>();

function configurationError(): Error {
  return new Error("Runtime signing secret configuration is invalid");
}

function loadError(): Error {
  return new Error("Runtime signing secret could not be loaded");
}

function validSecret(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length >= 32;
}

function validSecretArn(value: string | undefined): value is string {
  return typeof value === "string" && /^arn:aws:secretsmanager:[a-z0-9-]+:\d{12}:secret:.+/.test(value);
}

function secretValue(value: { SecretString?: string; SecretBinary?: Uint8Array }): string | undefined {
  if (typeof value.SecretString === "string") return value.SecretString;
  if (value.SecretBinary instanceof Uint8Array) {
    return new TextDecoder().decode(value.SecretBinary);
  }
  return undefined;
}

async function fetchDeployedSecret(arn: string, client: SecretClient): Promise<string> {
  try {
    const response = await client.send(new GetSecretValueCommand({ SecretId: arn }));
    const secret = secretValue(response);
    if (!validSecret(secret)) throw loadError();
    return secret;
  } catch {
    throw loadError();
  }
}

export async function loadRuntimeSigningSecret(input: {
  env: FormsRuntimeEnv;
  deployedLambda: boolean;
  client?: SecretClient;
}): Promise<FormsRuntimeEnv> {
  if (input.env.FORMS_RUNTIME_MODE !== "api") return input.env;

  const rawSecret = input.env.FORMS_RUNTIME_SIGNING_SECRET;
  const secretArn = input.env.FORMS_RUNTIME_SIGNING_SECRET_ARN;
  if (input.deployedLambda) {
    if (rawSecret || !validSecretArn(secretArn)) throw configurationError();
    const cached = deployedSecretCache.get(secretArn);
    const secret = cached ?? fetchDeployedSecret(
      secretArn,
      input.client ?? new SecretsManagerClient({}),
    );
    if (!cached) deployedSecretCache.set(secretArn, secret);
    try {
      const env = { ...input.env };
      delete env.FORMS_RUNTIME_SIGNING_SECRET_ARN;
      return { ...env, FORMS_RUNTIME_SIGNING_SECRET: await secret };
    } catch (error) {
      if (deployedSecretCache.get(secretArn) === secret) {
        deployedSecretCache.delete(secretArn);
      }
      throw error;
    }
  }

  if (!validSecret(rawSecret) || secretArn) throw configurationError();
  return input.env;
}

export function resetRuntimeSigningSecretCacheForTests() {
  deployedSecretCache = new Map();
}
