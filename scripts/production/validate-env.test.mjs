import assert from "node:assert/strict";
import test from "node:test";

import {
  formatValidationError,
  parseEnvText,
  validateProductionEnvironment,
} from "./validate-env.mjs";

test("parses comments, exports, and quoted values", () => {
  const parsed = parseEnvText(`
# deployment configuration
NODE_ENV=development
export API_URL=https://api.semblia.com
SECRET="do not print"
SINGLE='one value'
EMPTY=
`);

  assert.deepEqual(parsed, {
    NODE_ENV: "development",
    API_URL: "https://api.semblia.com",
    SECRET: "do not print",
    SINGLE: "one value",
    EMPTY: "",
  });
});

test("rejects malformed environment lines", () => {
  assert.throws(
    () => parseEnvText("NODE_ENV production"),
    /invalid environment line 1/,
  );
});

test("redacts configured values from schema failures", () => {
  const candidate = {
    DATABASE_URL: "postgres://user:password@example/semblia",
    API_V2_SECRET_ENCRYPTION_KEY: "highly-sensitive-base64-value",
  };
  const message = formatValidationError(
    new Error(
      `DATABASE_URL contained ${candidate.DATABASE_URL}; key ${candidate.API_V2_SECRET_ENCRYPTION_KEY}`,
    ),
    candidate,
  );

  assert.doesNotMatch(message, /password|highly-sensitive/);
  assert.match(message, /DATABASE_URL/);
  assert.match(message, /\[REDACTED\]/);
});

test("forces production validation without mutating the parsed input", () => {
  const parsed = { NODE_ENV: "development", DATABASE_URL: "postgres://db" };
  let received;

  const result = validateProductionEnvironment(parsed, (candidate) => {
    received = candidate;
    return candidate;
  });

  assert.equal(received.NODE_ENV, "production");
  assert.equal(result.NODE_ENV, "production");
  assert.equal(parsed.NODE_ENV, "development");
});

test("rethrows validation failures with secret values redacted", () => {
  const parsed = { SECRET: "never-emit-this-value" };

  assert.throws(
    () =>
      validateProductionEnvironment(parsed, () => {
        throw new Error(`invalid SECRET never-emit-this-value`);
      }),
    (error) => {
      assert.doesNotMatch(error.message, /never-emit-this-value/);
      assert.match(error.message, /invalid SECRET \[REDACTED\]/);
      return true;
    },
  );
});
