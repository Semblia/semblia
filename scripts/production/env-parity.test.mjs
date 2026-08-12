import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("email parity checks the real WS-C environment contract", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "semblia-env-parity-"));
  try {
    const staging = path.join(directory, "staging.env");
    const production = path.join(directory, "production.env");
    const partial = "RESEND_API_KEY=re_test\nEMAIL_FROM=Semblia <notifications@semblia.com>\n";
    writeFileSync(staging, partial);
    writeFileSync(production, partial);

    const result = spawnSync(
      process.execPath,
      ["scripts/check-env-parity.mjs", staging, production],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    const output = `${result.stdout}${result.stderr}`;

    assert.equal(result.status, 2);
    assert.doesNotMatch(output, /ENABLE_REAL_EMAILS/);
    assert.match(output, /EMAIL_ENABLED/);
    assert.match(output, /EMAIL_REPLY_TO/);
    assert.match(output, /EMAIL_DAILY_LIMIT/);
    assert.match(output, /EMAIL_UNSUBSCRIBE_SECRET/);
    assert.match(output, /EMAIL_BACKLOG_ALERT_SECONDS/);
    assert.match(output, /API_PUBLIC_URL/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
