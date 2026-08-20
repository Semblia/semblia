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
COMMENTED=value # operator note
QUOTED_COMMENT="value # preserved" # operator note
EMPTY=
`);

  assert.deepEqual(parsed, {
    NODE_ENV: "development",
    API_URL: "https://api.semblia.com",
    SECRET: "do not print",
    SINGLE: "one value",
    COMMENTED: "value",
    QUOTED_COMMENT: "value # preserved",
    EMPTY: "",
  });
});

test("rejects malformed environment lines", () => {
  assert.throws(
    () => parseEnvText("NODE_ENV production"),
    /invalid environment line 1/,
  );
});

test("rejects unquoted dollar signs that compose would expand", () => {
  assert.throws(
    () => parseEnvText("DATABASE_URL=postgresql://u:Xy$4kQz@db:5432/semblia"),
    /contains "\$"/,
  );
  assert.throws(
    () => parseEnvText('SECRET="Xy$4kQz"'),
    /contains "\$"/,
  );
  // The thrown message must name the key and line only, never the value.
  assert.throws(
    () => parseEnvText("TOKEN=abc$def"),
    (error) => {
      assert.doesNotMatch(error.message, /abc|def/);
      assert.match(error.message, /TOKEN on line 1/);
      return true;
    },
  );
  // Single quotes are literal to both parsers — allowed.
  assert.deepEqual(parseEnvText("SAFE='Xy$4kQz'"), { SAFE: "Xy$4kQz" });
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

test("redacts short configured values from schema failures", () => {
  const candidate = { SHORT_SECRET: "xy" };
  const message = formatValidationError(
    new Error("invalid SHORT_SECRET xy"),
    candidate,
  );

  assert.doesNotMatch(message, /xy/);
  assert.match(message, /SHORT_SECRET \[REDACTED\]/);
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
