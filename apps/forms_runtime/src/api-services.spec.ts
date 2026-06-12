import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiRuntimeServices } from "./api-services.js";
import type { FormsRuntimeEnv } from "./env.js";

const apiEnv: FormsRuntimeEnv = {
  FORMS_RUNTIME_MODE: "api",
  FORMS_RUNTIME_API_BASE_URL: "https://api.semblia.test/v2",
  FORMS_RUNTIME_SIGNING_SECRET: "s".repeat(32),
  FORMS_RUNTIME_PUBLIC_BASE_DOMAIN: "collect.semblia.test",
  FORMS_RUNTIME_API_TIMEOUT_MS: 5000,
  PORT: 3007,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createApiRuntimeServices", () => {
  it("forwards the actual viewer host while keeping the strict API context body", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        success: true,
        data: {
          project: {
            id: "project_1",
            slug: "acme",
            name: "Acme",
            publicSlug: "acme",
            brandColorPrimary: null,
          },
          form: {
            id: "form_1",
            slug: "default",
            name: "Default",
            description: null,
            config: {},
            publishedAt: null,
          },
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const services = createApiRuntimeServices(apiEnv);
    await services.resolveForm(
      {
        host: "feedback.customer.example",
        projectPublicSlug: "feedback",
        formSlug: "default",
        path: "/default",
      },
      {
        userAgent: "Hosted Browser",
        forwardedFor: "203.0.113.10",
      },
    );

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.body).toBe(
      JSON.stringify({
        projectPublicSlug: "feedback",
        formSlug: "default",
        path: "/default",
      }),
    );
    expect(init?.headers).toEqual(
      expect.objectContaining({
        "x-semblia-original-host": "feedback.customer.example",
        "x-semblia-original-user-agent": "Hosted Browser",
        "x-semblia-original-forwarded-for": "203.0.113.10",
      }),
    );
  });

  it("strips runtime-only submit metadata from the signed API body", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ success: true, data: { redirectTo: null } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const services = createApiRuntimeServices(apiEnv);
    await services.submitForm({
      context: {
        host: "feedback.customer.example",
        projectPublicSlug: "feedback",
        formSlug: "default",
        path: "/default",
      },
      contentType: "application/x-www-form-urlencoded",
      body: "answers%5Bcontent%5D=Great",
      metadata: {
        userAgent: "Hosted Browser",
        forwardedFor: "203.0.113.10",
      },
    });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.body).toBe(
      JSON.stringify({
        context: {
          projectPublicSlug: "feedback",
          formSlug: "default",
          path: "/default",
        },
        contentType: "application/x-www-form-urlencoded",
        body: "answers%5Bcontent%5D=Great",
      }),
    );
    expect(init?.headers).toEqual(
      expect.objectContaining({
        "x-semblia-original-host": "feedback.customer.example",
        "x-semblia-original-user-agent": "Hosted Browser",
        "x-semblia-original-forwarded-for": "203.0.113.10",
      }),
    );
  });
});
