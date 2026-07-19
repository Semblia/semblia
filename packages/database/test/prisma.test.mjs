import assert from "node:assert/strict";
import test from "node:test";

import { resolveDatabaseUrl } from "../dist/prisma.js";

test("explicit maintenance URL wins", () => {
  assert.equal(
    resolveDatabaseUrl("postgresql://explicit", {
      DATABASE_URL: "postgresql://environment",
      NODE_ENV: "production",
    }),
    "postgresql://explicit",
  );
});

test("configured environment URL is used in production", () => {
  assert.equal(
    resolveDatabaseUrl(undefined, {
      DATABASE_URL: "postgresql://environment",
      NODE_ENV: "production",
    }),
    "postgresql://environment",
  );
});

test("production without DATABASE_URL fails fast", () => {
  assert.throws(
    () => resolveDatabaseUrl(undefined, { NODE_ENV: "production" }),
    /DATABASE_URL must be set in production/,
  );
});

test("local development retains the Docker fallback", () => {
  assert.match(
    resolveDatabaseUrl(undefined, { NODE_ENV: "development" }),
    /localhost:5432\/appdb/,
  );
});
