import { Controller, Inject, Module, Post, Req } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { createHash, createHmac } from "node:crypto";
import type { Request } from "express";
import {
  canonicalizeRuntimeRequest,
  formatRuntimeSignature,
  SEMBLIA_RUNTIME_HEADERS,
} from "@workspace/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormsRuntimeTrustService } from "./forms-runtime-trust.service.js";
import { PublicHostingObservabilityService } from "./public-hosting-observability.service.js";

let trustService: FormsRuntimeTrustService;

@Controller("v2/runtime/forms/contact")
class RuntimeTestController {
  constructor(
    @Inject(FormsRuntimeTrustService)
    private readonly runtimeTrust: FormsRuntimeTrustService,
  ) {}

  @Post("submissions")
  async verify(@Req() request: Request & { rawBody?: Buffer }) {
    await this.runtimeTrust.verifyAndResolve(request, {
      operation: "SUBMISSION",
    });
    return {
      accepted: true,
      rawBody: request.rawBody?.toString("utf8") ?? null,
    };
  }
}

@Module({
  controllers: [RuntimeTestController],
  providers: [
    { provide: FormsRuntimeTrustService, useFactory: () => trustService },
  ],
})
class RuntimeTestModule {}

describe("forms runtime raw-body capture", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>> | undefined;

  afterEach(async () => app?.close());

  it("accepts an exact whitespace-sensitive body signature and rejects a parsed/reserialized-body signature", async () => {
    const timestamp = 1_752_505_200;
    const secret = "runtime-deployment-secret-that-is-not-a-project-secret";
    trustService = new FormsRuntimeTrustService(
      {
        get: vi.fn((key: string) =>
          key === "FORMS_RUNTIME_SIGNING_SECRET" ? secret : "forms.semblia.com",
        ),
      } as never,
      {
        resolveHost: vi.fn().mockResolvedValue({
          projectId: "project_1",
          canonicalHostname: "acme.forms.semblia.com",
        }),
      } as never,
      new PublicHostingObservabilityService(() => undefined),
      () => timestamp * 1000,
    );
    app = await NestFactory.create(RuntimeTestModule, {
      rawBody: true,
      logger: false,
    });
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address();
    const body = '{ "answer" : 1 }';
    const target = "/v2/runtime/forms/contact/submissions?b=2&a=1";
    const signatureFor = (payload: string) =>
      formatRuntimeSignature(
        createHmac("sha256", secret)
          .update(
            canonicalizeRuntimeRequest({
              timestampSeconds: timestamp,
              method: "POST",
              requestTarget: target,
              hostname: "acme.forms.semblia.com",
              bodySha256: createHash("sha256").update(payload).digest("hex"),
            }),
          )
          .digest(),
      );
    const send = (signature: string) =>
      fetch(`http://127.0.0.1:${address.port}${target}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [SEMBLIA_RUNTIME_HEADERS.host]: "acme.forms.semblia.com",
          [SEMBLIA_RUNTIME_HEADERS.timestamp]: String(timestamp),
          [SEMBLIA_RUNTIME_HEADERS.signature]: signature,
        },
        body,
      });

    const accepted = await send(signatureFor(body));
    expect(accepted.status).toBe(201);
    expect((await accepted.json()) as { rawBody: string }).toMatchObject({
      rawBody: body,
    });

    const rejected = await send(signatureFor(JSON.stringify(JSON.parse(body))));
    expect(rejected.status).toBe(401);
    expect((await rejected.json()) as { message: string }).toMatchObject({
      message: "Unauthorized runtime request",
    });
  });
});
