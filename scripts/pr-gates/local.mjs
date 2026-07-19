import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs as parseNodeArgs } from "node:util";
import { pathToFileURL } from "node:url";

import { evaluateLocalSnapshot } from "./policy.mjs";

function parseArgs(argv) {
  const { values } = parseNodeArgs({
    args: argv.filter((argument) => argument !== "--"),
    allowPositionals: false,
    options: {
      base: { type: "string", default: "origin/main" },
      json: { type: "boolean", default: false },
    },
    strict: true,
  });
  return values;
}

function git(args, { allowFailure = false } = {}) {
  const run = spawnSync("git", args, { encoding: "utf8" });
  if (run.error) throw run.error;
  if (!allowFailure && run.status !== 0) {
    throw new Error(
      (run.stderr || run.stdout || `git ${args[0]} failed`).trim(),
    );
  }
  return run;
}

function lines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseAddedLines(diff) {
  const additions = [];
  let file = null;
  let newLine = null;

  for (const rawLine of diff.split(/\r?\n/)) {
    if (rawLine.startsWith("+++ b/")) {
      file = rawLine.slice(6);
      newLine = null;
      continue;
    }

    const hunk = rawLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = Number.parseInt(hunk[1], 10);
      continue;
    }

    if (newLine === null) continue;
    if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      additions.push({ content: rawLine.slice(1), file, line: newLine });
      newLine += 1;
    } else if (!rawLine.startsWith("-") && !rawLine.startsWith("\\")) {
      newLine += 1;
    }
  }

  return additions;
}

function addedLines(base) {
  const diff = git([
    "diff",
    "--unified=0",
    "--no-color",
    `${base}...HEAD`,
  ]).stdout;
  return parseAddedLines(diff);
}

function workflowFiles(repoRoot) {
  const directory = resolve(repoRoot, ".github", "workflows");
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
    .map((entry) => ({
      path: `.github/workflows/${entry.name}`,
      content: readFileSync(resolve(directory, entry.name), "utf8"),
    }));
}

function diffCheckError(base) {
  const run = git(["diff", "--check", `${base}...HEAD`], {
    allowFailure: true,
  });
  if (run.status === 0) return "";
  return (run.stdout || run.stderr || "unknown whitespace error")
    .trim()
    .replace(/\s+/g, " ");
}

export function collectLocalSnapshot(base) {
  const repoRoot = git(["rev-parse", "--show-toplevel"]).stdout.trim();
  const verify = git(["rev-parse", "--verify", "--quiet", `${base}^{commit}`], {
    allowFailure: true,
  });
  const baseExists = verify.status === 0;
  const ancestor = baseExists
    ? git(["merge-base", "--is-ancestor", base, "HEAD"], { allowFailure: true })
    : { status: 1 };

  return {
    dirtyEntries: lines(
      git(["status", "--porcelain=v1", "--untracked-files=all"]).stdout,
    ),
    baseExists,
    baseIsAncestor: ancestor.status === 0,
    diffCheckError: baseExists ? diffCheckError(base) : "",
    changedFiles: baseExists
      ? lines(
          git(["diff", "--name-only", "--diff-filter=ACMR", `${base}...HEAD`])
            .stdout,
        )
      : [],
    addedLines: baseExists ? addedLines(base) : [],
    workflows: workflowFiles(repoRoot),
  };
}

function printEvaluation(evaluation, json) {
  if (json) {
    console.log(JSON.stringify(evaluation, null, 2));
    return;
  }

  for (const fact of evaluation.facts) console.log(`FACT ${fact}`);
  for (const warning of evaluation.warnings) console.log(`WARN ${warning}`);
  for (const blocker of evaluation.blockers) console.error(`BLOCK ${blocker}`);
  console.log(
    `PR_GATE_LOCAL blockers=${evaluation.blockers.length} warnings=${evaluation.warnings.length}`,
  );
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const evaluation = evaluateLocalSnapshot(collectLocalSnapshot(options.base));
  printEvaluation(evaluation, options.json);
  return evaluation.blockers.length === 0 ? 0 : 1;
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(
      `PR_GATE_LOCAL_ERROR ${error instanceof Error ? error.message : error}`,
    );
    process.exitCode = 2;
  }
}
