import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  checkoutCredentialViolations,
  evaluateHostedPullRequest,
  evaluateLocalSnapshot,
  findAddedSecrets,
} from "./policy.mjs";
import { parseHostedArgs } from "./hosted.mjs";
import { parseAgentError } from "./local-review.mjs";
import { parseAddedLines } from "./local.mjs";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function hosted(overrides = {}) {
  return {
    changedFiles: 12,
    isDraft: false,
    mergeable: "MERGEABLE",
    mergeStateStatus: "CLEAN",
    reviewDecision: "",
    state: "OPEN",
    statusCheckRollup: [
      { name: "Test, build, and coverage", conclusion: "SUCCESS" },
      { context: "CodeRabbit", state: "SUCCESS" },
    ],
    ...overrides,
  };
}

function local(overrides = {}) {
  return {
    addedLines: [],
    baseExists: true,
    baseIsAncestor: true,
    changedFiles: [
      "scripts/pr-gates/local.mjs",
      "scripts/pr-gates/pr-gates.test.mjs",
    ],
    diffCheckError: "",
    dirtyEntries: [],
    workflows: [
      {
        path: ".github/workflows/pull-requests.yml",
        content: [
          "steps:",
          "  - name: Checkout",
          "    uses: actions/checkout@v4",
          "    with:",
          "      persist-credentials: false",
        ].join("\n"),
      },
    ],
    ...overrides,
  };
}

test("hosted gate accepts mergeable PRs with advisory failures", () => {
  const evaluation = evaluateHostedPullRequest({
    pullRequest: hosted({
      mergeStateStatus: "UNSTABLE",
      statusCheckRollup: [
        { name: "Test, build, and coverage", conclusion: "SUCCESS" },
        { name: "CodeScene Code Health Review (main)", conclusion: "FAILURE" },
      ],
    }),
    unresolvedThreads: 0,
  });

  assert.deepEqual(evaluation.blockers, []);
  assert.ok(
    evaluation.warnings.some((message) => message.includes("CodeScene")),
  );
  assert.ok(
    evaluation.warnings.some((message) => message.includes("UNSTABLE")),
  );
});

test("hosted gate reports stale branch, pending check, unresolved threads, and skipped review", () => {
  const evaluation = evaluateHostedPullRequest({
    pullRequest: hosted({
      changedFiles: 118,
      mergeStateStatus: "BEHIND",
      statusCheckRollup: [
        { name: "Test, build, and coverage", status: "IN_PROGRESS" },
      ],
    }),
    unresolvedThreads: 4,
    comments: [
      {
        author: { login: "coderabbitai" },
        body: "Review skipped: Too many files!",
      },
    ],
  });

  assert.ok(evaluation.blockers.some((message) => message.includes("BEHIND")));
  assert.ok(
    evaluation.blockers.some((message) => message.includes("IN_PROGRESS")),
  );
  assert.ok(
    evaluation.blockers.some((message) => message.includes("4 review thread")),
  );
  assert.ok(
    evaluation.warnings.some((message) =>
      message.includes("118 changed files"),
    ),
  );
  assert.ok(evaluation.warnings.some((message) => message.includes("skipped")));
});

test("hosted gate falls through an empty conclusion to the live check status", () => {
  const evaluation = evaluateHostedPullRequest({
    pullRequest: hosted({
      statusCheckRollup: [
        {
          name: "Test, build, and coverage",
          conclusion: "",
          status: "IN_PROGRESS",
        },
        {
          name: "CodeScene Code Health Review (main)",
          conclusion: "",
          status: "COMPLETED",
        },
      ],
    }),
    unresolvedThreads: 0,
  });

  assert.ok(
    evaluation.blockers.some((message) => message.includes("IN_PROGRESS")),
  );
  assert.ok(
    evaluation.warnings.some((message) => message.includes("COMPLETED")),
  );
});

test("hosted gate accepts only a complete positive integer PR token", () => {
  assert.equal(parseHostedArgs(["--pr", "48"]).number, 48);
  for (const value of ["0", "-1", "1.5", "48suffix", "9007199254740992"]) {
    assert.throws(() => parseHostedArgs(["--pr", value]));
  }
});

test("checkout workflow policy requires credentials to be disabled per step", () => {
  const violations = checkoutCredentialViolations([
    {
      path: ".github/workflows/unsafe.yml",
      content: [
        "steps:",
        "  - uses: actions/checkout@v4",
        "  - uses: actions/setup-node@v4",
        "  - uses: actions/checkout@v4",
        "    with:",
        "      persist-credentials: 'FALSE' # safe quoted value",
      ].join("\n"),
    },
    {
      path: ".github/workflows/safe.yml",
      content: [
        "steps:",
        "  - uses: actions/checkout@v4",
        "    with:",
        "      fetch-depth: 2",
        "      persist-credentials: false",
      ].join("\n"),
    },
  ]);

  assert.deepEqual(violations, [".github/workflows/unsafe.yml:2"]);
});

test("local gate catches dirty state, stale base, secrets, and workflow credentials", () => {
  const fakeKey = `AKIA${"A".repeat(16)}`;
  const evaluation = evaluateLocalSnapshot(
    local({
      addedLines: [`const leaked = "${fakeKey}";`],
      baseIsAncestor: false,
      dirtyEntries: [" M package.json"],
      workflows: [
        {
          path: ".github/workflows/pull-requests.yml",
          content: "steps:\n  - uses: actions/checkout@v4",
        },
      ],
    }),
  );

  assert.ok(
    evaluation.blockers.some((message) => message.includes("not clean")),
  );
  assert.ok(
    evaluation.blockers.some((message) =>
      message.includes("update the branch"),
    ),
  );
  assert.ok(
    evaluation.blockers.some((message) => message.includes("AWS access key")),
  );
  assert.ok(
    evaluation.blockers.some((message) =>
      message.includes("persist-credentials"),
    ),
  );
});

test("local gate warns when application source changes without a test diff", () => {
  const withoutTest = evaluateLocalSnapshot(
    local({
      changedFiles: ["apps/api_v2/src/modules/example/example.service.ts"],
    }),
  );
  const withTest = evaluateLocalSnapshot(
    local({
      changedFiles: [
        "apps/api_v2/src/modules/example/example.service.ts",
        "apps/api_v2/src/modules/example/example.service.spec.ts",
      ],
    }),
  );

  assert.ok(
    withoutTest.warnings.some((message) =>
      message.includes("without a test-file"),
    ),
  );
  assert.ok(
    !withTest.warnings.some((message) =>
      message.includes("without a test-file"),
    ),
  );
});

test("secret scanner ignores ordinary added lines", () => {
  assert.deepEqual(
    findAddedSecrets(["const mode = 'test';", "FORMS_RUNTIME_SIGNING_SECRET="]),
    [],
  );
});

test("secret scanner reports the actual added file and line", () => {
  const fakeKey = `AKIA${"A".repeat(16)}`;
  const additions = parseAddedLines(
    [
      "diff --git a/apps/api_v2/src/example.ts b/apps/api_v2/src/example.ts",
      "--- a/apps/api_v2/src/example.ts",
      "+++ b/apps/api_v2/src/example.ts",
      "@@ -9,0 +10,2 @@",
      "+const safe = true;",
      `+const leaked = \"${fakeKey}\";`,
    ].join("\n"),
  );

  assert.deepEqual(additions, [
    {
      content: "const safe = true;",
      file: "apps/api_v2/src/example.ts",
      line: 10,
    },
    {
      content: `const leaked = \"${fakeKey}\";`,
      file: "apps/api_v2/src/example.ts",
      line: 11,
    },
  ]);
  assert.deepEqual(findAddedSecrets(additions), [
    "AWS access key pattern at apps/api_v2/src/example.ts:11",
  ]);
});

test("local gate does not duplicate no-change noise when the base is missing", () => {
  const evaluation = evaluateLocalSnapshot(
    local({ baseExists: false, baseIsAncestor: false, changedFiles: [] }),
  );

  assert.ok(
    evaluation.blockers.some((message) => message.includes("does not exist")),
  );
  assert.ok(
    !evaluation.blockers.some((message) => message.includes("no changes")),
  );
});

test("agent-mode local reviewer keeps diagnostics off stdout", () => {
  const run = spawnSync(
    process.execPath,
    [
      join(repoRoot, "scripts/pr-gates/local-review.mjs"),
      "--dry-run",
      "--tool",
      "codescene",
      "--format",
      "agent",
    ],
    { encoding: "utf8" },
  );

  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout, "");
  assert.match(run.stderr, /LOCAL_REVIEW tools=1/);
});

test("local reviewer recognizes a recoverable agent rate-limit event", () => {
  assert.deepEqual(
    parseAgentError(
      [
        JSON.stringify({ type: "status", phase: "setup" }),
        JSON.stringify({
          type: "error",
          errorType: "rate_limit",
          message: "Rate limit exceeded",
          recoverable: true,
        }),
      ].join("\n"),
    ),
    {
      type: "error",
      errorType: "rate_limit",
      message: "Rate limit exceeded",
      recoverable: true,
    },
  );
});

test("repository scripts and agent rules expose the PR gates", () => {
  const packageJson = JSON.parse(read("package.json"));
  const agents = read("AGENTS.md");
  const hostedGate = read("scripts/pr-gates/hosted.mjs");
  const localGate = read("scripts/pr-gates/local.mjs");
  const pullRequestRule = read(".claude/rules/pull-requests.md");

  assert.match(packageJson.scripts["quality:check"], /^pnpm build &&/);
  assert.equal(
    packageJson.scripts["pr:gate:hosted"],
    "node scripts/pr-gates/hosted.mjs",
  );
  assert.equal(
    packageJson.scripts["review:local"],
    "node scripts/pr-gates/local-review.mjs",
  );
  assert.match(agents, /pr-quality-gates\.md/);
  assert.match(hostedGate, /timeout: GH_TIMEOUT_MS/);
  assert.match(localGate, /timeout: GIT_TIMEOUT_MS/);
  assert.match(pullRequestRule, /pnpm pr:gate:local/);
  assert.match(pullRequestRule, /pnpm pr:gate:hosted/);
});
