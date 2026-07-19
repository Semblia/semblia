import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { parseArgs as parseNodeArgs } from "node:util";
import { pathToFileURL } from "node:url";

const TOOL_NAMES = new Set(["all", "coderabbit", "codescene"]);
const OUTPUT_FORMATS = new Set(["agent", "plain"]);
const COMMAND_TIMEOUT_MS = 30_000;
const CODESCENE_TIMEOUT_MS = 5 * 60_000;
const CODERABBIT_TIMEOUT_MS = 20 * 60_000;
const REVIEW_OUTPUT_BUFFER_BYTES = 10 * 1024 * 1024;

function parseArgs(argv) {
  const { values: options } = parseNodeArgs({
    args: argv.filter((argument) => argument !== "--"),
    allowPositionals: false,
    options: {
      base: { type: "string", default: "origin/main" },
      "dry-run": { type: "boolean", default: false },
      format: { type: "string", default: "agent" },
      "require-all": { type: "boolean", default: false },
      tool: { type: "string", default: "all" },
    },
    strict: true,
  });

  if (!TOOL_NAMES.has(options.tool))
    throw new Error(`unsupported tool: ${options.tool}`);
  if (!OUTPUT_FORMATS.has(options.format)) {
    throw new Error(`unsupported output format: ${options.format}`);
  }
  return {
    base: options.base,
    dryRun: options["dry-run"],
    format: options.format,
    requireAll: options["require-all"],
    tool: options.tool,
  };
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: options.stdio === "inherit" ? undefined : "utf8",
    maxBuffer: REVIEW_OUTPUT_BUFFER_BYTES,
    stdio: options.stdio,
    timeout: options.timeoutMs ?? COMMAND_TIMEOUT_MS,
  });
}

function failureMessage(result) {
  if (result.error?.code === "ETIMEDOUT") return "timed out";
  if (result.error) return result.error.message;
  return `exited ${result.status}`;
}

export function classifyCommandResult(result) {
  if (result.error?.code === "ENOENT") return "MISSING";
  if (result.error) return "FAILED";
  return result.status === 0 ? "READY" : "REJECTED";
}

function classifyOrThrow(result, context, { allowMissing = false } = {}) {
  const classification = classifyCommandResult(result);
  const fatalClassifications = allowMissing
    ? ["FAILED"]
    : ["FAILED", "MISSING"];
  if (fatalClassifications.includes(classification)) {
    throw new Error(`${context} ${failureMessage(result)}`);
  }
  return classification;
}

function diagnostic(options, message) {
  const output = options.format === "agent" ? process.stderr : process.stdout;
  output.write(`${message}\n`);
}

export function parseAgentError(output) {
  for (const line of (output ?? "").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.type === "error") return event;
    } catch {
      // The reviewer owns stdout. Non-JSON output is forwarded unchanged so a
      // caller can detect that its agent-output contract was violated.
    }
  }
  return null;
}

function git(args) {
  const result = run("git", args);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      (result.stderr || result.stdout || `git ${args[0]} failed`).trim(),
    );
  }
  return result.stdout.trim();
}

function skipped(name, message) {
  return { name, status: "SKIP", message };
}

function toolVersion(command, args) {
  const result = run(command, args);
  const classification = classifyOrThrow(result, `${command} version probe`, {
    allowMissing: true,
  });
  if (classification !== "READY") return null;
  return (result.stdout || result.stderr || "installed")
    .trim()
    .split(/\r?\n/)[0];
}

function reviewCodeScene(options) {
  const version = toolVersion("cs", ["version"]);
  if (!version) {
    return skipped(
      "CodeScene",
      "CLI is not installed; see https://codescene.io/docs/cli/index.html",
    );
  }
  if (!process.env.CS_ACCESS_TOKEN) {
    return skipped(
      "CodeScene",
      `${version} is installed, but CS_ACCESS_TOKEN is not set; create a CodeScene PAT before running delta review`,
    );
  }
  if (options.dryRun)
    return { name: "CodeScene", status: "READY", message: version };

  diagnostic(options, `RUN CodeScene delta against ${options.base}`);
  const result = run("cs", ["delta", "--output-format", "json", options.base], {
    stdio: "inherit",
    timeoutMs: CODESCENE_TIMEOUT_MS,
  });
  return result.status === 0
    ? { name: "CodeScene", status: "PASS", message: "delta review completed" }
    : {
        name: "CodeScene",
        status: "FAIL",
        message: `delta review ${failureMessage(result)}`,
      };
}

function wslPath(nativePath) {
  const result = run("wsl.exe", ["-e", "wslpath", "-a", "-u", nativePath]);
  const classification = classifyOrThrow(result, "WSL path translation");
  if (classification !== "READY") return null;
  return result.stdout.trim();
}

function windowsCodeRabbitCommand(options) {
  const command = run("wsl.exe", [
    "-e",
    "bash",
    "-lc",
    "command -v coderabbit",
  ]);
  const commandClassification = classifyOrThrow(
    command,
    "CodeRabbit WSL lookup",
    { allowMissing: true },
  );
  if (commandClassification !== "READY") return null;

  const executable = command.stdout.trim();
  const auth = run("wsl.exe", ["-e", executable, "auth", "status"]);
  const authClassification = classifyOrThrow(
    auth,
    "CodeRabbit WSL authentication probe",
  );
  if (authClassification !== "READY") {
    return {
      skip: "CodeRabbit is installed in WSL but is not authenticated; run `wsl coderabbit auth login`",
    };
  }

  const repoRoot = git(["rev-parse", "--show-toplevel"]);
  const gitDirectory = git(["rev-parse", "--absolute-git-dir"]);
  const wslRoot = wslPath(repoRoot);
  const wslGitDirectory = wslPath(gitDirectory);
  if (!wslRoot || !wslGitDirectory) {
    return { skip: "could not translate the Windows worktree paths for WSL" };
  }

  return {
    command: "wsl.exe",
    args: [
      "-e",
      "env",
      `GIT_DIR=${wslGitDirectory}`,
      `GIT_WORK_TREE=${wslRoot}`,
      executable,
      "review",
      options.format === "agent" ? "--agent" : "--plain",
      "--type",
      "all",
      "--base",
      options.base,
      "--dir",
      wslRoot,
    ],
  };
}

function nativeCodeRabbitCommand(options) {
  const executable = toolVersion("coderabbit", ["--version"])
    ? "coderabbit"
    : toolVersion("cr", ["--version"])
      ? "cr"
      : null;
  if (!executable) return null;

  const auth = run(executable, ["auth", "status"]);
  const authClassification = classifyOrThrow(
    auth,
    "CodeRabbit authentication probe",
  );
  if (authClassification !== "READY") {
    return {
      skip: "CodeRabbit is installed but is not authenticated; run `coderabbit auth login`",
    };
  }
  return {
    command: executable,
    args: [
      "review",
      options.format === "agent" ? "--agent" : "--plain",
      "--type",
      "all",
      "--base",
      options.base,
    ],
  };
}

function codeRabbitCommand(options) {
  return process.platform === "win32"
    ? windowsCodeRabbitCommand(options)
    : nativeCodeRabbitCommand(options);
}

function unavailableCodeRabbit(invocation) {
  if (!invocation) {
    return skipped(
      "CodeRabbit",
      "CLI is not installed; Windows uses WSL per https://docs.coderabbit.ai/cli/wsl-windows",
    );
  }
  if (invocation.skip) return skipped("CodeRabbit", invocation.skip);
  return null;
}

function runCodeRabbit(invocation, options) {
  diagnostic(options, `RUN CodeRabbit review against ${options.base}`);
  const captureAgentOutput = options.format === "agent";
  const result = run(invocation.command, invocation.args, {
    stdio: captureAgentOutput ? undefined : "inherit",
    timeoutMs: CODERABBIT_TIMEOUT_MS,
  });
  if (captureAgentOutput) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  const agentError = captureAgentOutput ? parseAgentError(result.stdout) : null;
  return { agentError, result };
}

function codeRabbitResult({ agentError, result }) {
  if (agentError?.errorType === "rate_limit") {
    return skipped(
      "CodeRabbit",
      `local review rate-limited: ${agentError.message ?? "retry after the service reset"}`,
    );
  }
  return result.status === 0
    ? { name: "CodeRabbit", status: "PASS", message: "local review completed" }
    : {
        name: "CodeRabbit",
        status: "FAIL",
        message: `local review ${failureMessage(result)}`,
      };
}

function reviewCodeRabbit(options) {
  const invocation = codeRabbitCommand(options);
  const unavailable = unavailableCodeRabbit(invocation);
  if (unavailable) return unavailable;
  if (options.dryRun) {
    return {
      name: "CodeRabbit",
      status: "READY",
      message: "CLI and authentication are ready",
    };
  }
  return codeRabbitResult(runCodeRabbit(invocation, options));
}

function selectedReviewers(options) {
  const reviewers = [];
  if (options.tool === "all" || options.tool === "codescene")
    reviewers.push(reviewCodeScene);
  if (options.tool === "all" || options.tool === "coderabbit")
    reviewers.push(reviewCodeRabbit);
  return reviewers;
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const results = selectedReviewers(options).map((reviewer) =>
    reviewer(options),
  );
  for (const result of results) {
    diagnostic(options, `${result.status} ${result.name}: ${result.message}`);
  }

  const failed = results.some((result) => result.status === "FAIL");
  const unavailable = results.some((result) => result.status === "SKIP");
  diagnostic(
    options,
    `LOCAL_REVIEW tools=${results.length} failed=${Number(failed)} unavailable=${Number(unavailable)}`,
  );
  return failed || (options.requireAll && unavailable) ? 1 : 0;
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(
      `LOCAL_REVIEW_ERROR ${error instanceof Error ? error.message : error}`,
    );
    process.exitCode = 2;
  }
}
