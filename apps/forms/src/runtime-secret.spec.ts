import { describe, expect, it, vi } from "vitest";
import type { FormsRuntimeEnv } from "./env.js";
import {
  loadRuntimeSigningSecret,
  resetRuntimeSigningSecretCacheForTests,
} from "./runtime-secret.js";

const baseEnv: FormsRuntimeEnv = {
  FORMS_RUNTIME_MODE: "api",
  FORMS_RUNTIME_API_BASE_URL: "https://api.semblia.test/v2",
  FORMS_RUNTIME_PUBLIC_BASE_DOMAIN: "forms.semblia.test",
  FORMS_RUNTIME_PROJECT_ID: "project_1",
  FORMS_RUNTIME_PROJECT_ID_BY_HOST: {},
  FORMS_RUNTIME_UPLOAD_CONNECT_SRC: "https:",
  FORMS_RUNTIME_API_TIMEOUT_MS: 5000,
  FORMS_RUNTIME_EDGE_RATE_WINDOW_MS: 60_000,
  PORT: 3007,
};

describe("loadRuntimeSigningSecret", () => {
  it("accepts exactly one raw local API secret", async () => {
    await expect(
      loadRuntimeSigningSecret({
        env: { ...baseEnv, FORMS_RUNTIME_SIGNING_SECRET: "s".repeat(32) },
        deployedLambda: false,
      }),
    ).resolves.toMatchObject({ FORMS_RUNTIME_SIGNING_SECRET: "s".repeat(32) });
  });

  it("rejects ambiguous or missing local/deployed secret configuration", async () => {
    await expect(
      loadRuntimeSigningSecret({ env: baseEnv, deployedLambda: false }),
    ).rejects.toThrow("Runtime signing secret configuration is invalid");
    await expect(
      loadRuntimeSigningSecret({
        env: {
          ...baseEnv,
          FORMS_RUNTIME_SIGNING_SECRET: "s".repeat(32),
          FORMS_RUNTIME_SIGNING_SECRET_ARN: "arn:aws:secretsmanager:us-east-1:123456789012:secret:runtime-abc",
        },
        deployedLambda: false,
      }),
    ).rejects.toThrow("Runtime signing secret configuration is invalid");
  });

  it("loads a deployed secret once and caches it in memory", async () => {
    resetRuntimeSigningSecretCacheForTests();
    const send = vi.fn().mockResolvedValue({ SecretString: "s".repeat(32) });
    const env = {
      ...baseEnv,
      FORMS_RUNTIME_SIGNING_SECRET_ARN:
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:runtime-abc",
    };
    const first = await loadRuntimeSigningSecret({ env, deployedLambda: true, client: { send } });
    const second = await loadRuntimeSigningSecret({ env, deployedLambda: true, client: { send } });

    expect(first.FORMS_RUNTIME_SIGNING_SECRET).toBe("s".repeat(32));
    expect(second.FORMS_RUNTIME_SIGNING_SECRET).toBe("s".repeat(32));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("coalesces concurrent cold loads and retries after a failed load", async () => {
    resetRuntimeSigningSecretCacheForTests();
    const env = {
      ...baseEnv,
      FORMS_RUNTIME_SIGNING_SECRET_ARN:
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:runtime-abc",
    };
    const send = vi.fn()
      .mockRejectedValueOnce(new Error("arn:aws:secretsmanager:us-east-1:123456789012:secret:runtime-abc"))
      .mockResolvedValue({ SecretString: "s".repeat(32) });
    await expect(loadRuntimeSigningSecret({ env, deployedLambda: true, client: { send } })).rejects.toThrow("Runtime signing secret could not be loaded");
    await Promise.all([
      loadRuntimeSigningSecret({ env, deployedLambda: true, client: { send } }),
      loadRuntimeSigningSecret({ env, deployedLambda: true, client: { send } }),
    ]);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("accepts SecretBinary and rejects absent secret values", async () => {
    const env = {
      ...baseEnv,
      FORMS_RUNTIME_SIGNING_SECRET_ARN:
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:runtime-binary",
    };
    resetRuntimeSigningSecretCacheForTests();
    await expect(loadRuntimeSigningSecret({
      env,
      deployedLambda: true,
      client: { send: vi.fn().mockResolvedValue({ SecretBinary: new TextEncoder().encode("b".repeat(32)) }) },
    })).resolves.toMatchObject({ FORMS_RUNTIME_SIGNING_SECRET: "b".repeat(32) });
    resetRuntimeSigningSecretCacheForTests();
    await expect(loadRuntimeSigningSecret({
      env,
      deployedLambda: true,
      client: { send: vi.fn().mockResolvedValue({}) },
    })).rejects.toThrow("Runtime signing secret could not be loaded");
  });

  it("rejects a raw deployed secret and an ARN in local execution", async () => {
    await expect(loadRuntimeSigningSecret({
      env: { ...baseEnv, FORMS_RUNTIME_SIGNING_SECRET: "s".repeat(32) },
      deployedLambda: true,
    })).rejects.toThrow("Runtime signing secret configuration is invalid");
    await expect(loadRuntimeSigningSecret({
      env: {
        ...baseEnv,
        FORMS_RUNTIME_SIGNING_SECRET_ARN: "arn:aws:secretsmanager:us-east-1:123456789012:secret:runtime-abc",
      },
      deployedLambda: false,
    })).rejects.toThrow("Runtime signing secret configuration is invalid");
  });

  it("rejects malformed Secrets Manager values without exposing secret material", async () => {
    resetRuntimeSigningSecretCacheForTests();
    await expect(
      loadRuntimeSigningSecret({
        env: {
          ...baseEnv,
          FORMS_RUNTIME_SIGNING_SECRET_ARN:
            "arn:aws:secretsmanager:us-east-1:123456789012:secret:runtime-abc",
        },
        deployedLambda: true,
        client: { send: vi.fn().mockResolvedValue({ SecretString: "too-short" }) },
      }),
    ).rejects.toThrow("Runtime signing secret could not be loaded");
  });
});
