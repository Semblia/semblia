import assert from "node:assert/strict";
import test from "node:test";

import {
  assertApiHealth,
  assertAppResponse,
  parseArguments,
  parseComposePs,
  verifyProductionSpine,
} from "./spine.mjs";

test("accepts successful and redirecting app responses", () => {
  assert.doesNotThrow(() => assertAppResponse(new Response(null, { status: 200 })));
  assert.doesNotThrow(() => assertAppResponse(new Response(null, { status: 302 })));
});

test("rejects Vercel DEPLOYMENT_NOT_FOUND", () => {
  const response = new Response("missing", {
    status: 404,
    headers: { "x-vercel-error": "DEPLOYMENT_NOT_FOUND" },
  });

  assert.throws(() => assertAppResponse(response), /DEPLOYMENT_NOT_FOUND/);
});

test("rejects non-successful app responses", () => {
  assert.throws(
    () => assertAppResponse(new Response(null, { status: 503 })),
    /HTTP 503/,
  );
});

test("accepts API health only when database and Redis are up", () => {
  assert.doesNotThrow(() =>
    assertApiHealth({
      status: "ok",
      dependencies: { database: "up", redis: "up" },
    }),
  );
});

test("requires database and Redis health", () => {
  assert.throws(
    () =>
      assertApiHealth({
        status: "degraded",
        dependencies: { database: "up", redis: "down" },
      }),
    /status=degraded database=up redis=down/,
  );
});

test("requires healthy api and worker Compose services from JSON lines", () => {
  const services = parseComposePs(
    [
      JSON.stringify({ Service: "api", State: "running", Health: "healthy" }),
      JSON.stringify({ Service: "worker", State: "running", Health: "healthy" }),
    ].join("\n"),
  );

  assert.deepEqual([...services.keys()].sort(), ["api", "worker"]);
});

test("accepts Compose JSON arrays", () => {
  const services = parseComposePs(
    JSON.stringify([
      { Service: "api", State: "running", Health: "healthy" },
      { Service: "worker", State: "running", Health: "healthy" },
    ]),
  );

  assert.equal(services.size, 2);
});

test("rejects missing or unhealthy Compose services", () => {
  assert.throws(
    () =>
      parseComposePs(
        JSON.stringify([
          { Service: "api", State: "running", Health: "healthy" },
          { Service: "worker", State: "running", Health: "unhealthy" },
        ]),
      ),
    /worker state=running health=unhealthy/,
  );
});

test("parses required URLs and production verifier defaults", () => {
  assert.deepEqual(
    parseArguments([
      "--app-url",
      "https://app.semblia.com",
      "--api-url",
      "https://api.semblia.com",
      "--public-only",
    ]),
    {
      appUrl: "https://app.semblia.com",
      apiUrl: "https://api.semblia.com",
      composeFile: "deploy/production/compose.yaml",
      envFile: "deploy/production/runtime.env",
      publicOnly: true,
    },
  );
});

test("rejects incomplete or unknown verifier arguments", () => {
  assert.throws(
    () => parseArguments(["--app-url", "https://app.semblia.com"]),
    /--app-url and --api-url are required/,
  );
  assert.throws(
    () => parseArguments(["--unknown", "value"]),
    /unknown option: --unknown/,
  );
});

test("verifies public endpoints without invoking Compose", async () => {
  const requested = [];
  const result = await verifyProductionSpine(
    {
      appUrl: "https://app.semblia.com",
      apiUrl: "https://api.semblia.com/",
      publicOnly: true,
    },
    {
      fetchImpl: async (url) => {
        requested.push(url);
        return url.endsWith("/health")
          ? Response.json({
              status: "ok",
              dependencies: { database: "up", redis: "up" },
            })
          : new Response(null, { status: 302 });
      },
      runCompose: () => {
        throw new Error("Compose must not run in public-only mode");
      },
    },
  );

  assert.deepEqual(requested, [
    "https://app.semblia.com",
    "https://api.semblia.com/health",
  ]);
  assert.equal(result.appStatus, 302);
  assert.equal(result.apiStatus, "ok");
  assert.equal(result.services, undefined);
});

test("verifies Compose state with the requested files", async () => {
  let composeArgs;
  const result = await verifyProductionSpine(
    {
      appUrl: "https://app.semblia.com",
      apiUrl: "https://api.semblia.com",
      composeFile: "custom-compose.yaml",
      envFile: "custom.env",
      publicOnly: false,
    },
    {
      fetchImpl: async (url) =>
        url.endsWith("/health")
          ? Response.json({
              status: "ok",
              dependencies: { database: "up", redis: "up" },
            })
          : new Response(null, { status: 200 }),
      runCompose: (args) => {
        composeArgs = args;
        return {
          status: 0,
          stdout: [
            JSON.stringify({
              Service: "api",
              State: "running",
              Health: "healthy",
            }),
            JSON.stringify({
              Service: "worker",
              State: "running",
              Health: "healthy",
            }),
          ].join("\n"),
        };
      },
    },
  );

  assert.deepEqual(composeArgs, [
    "compose",
    "-f",
    "custom-compose.yaml",
    "--env-file",
    "custom.env",
    "ps",
    "--format",
    "json",
  ]);
  assert.equal(result.services.size, 2);
});
