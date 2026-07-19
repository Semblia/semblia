const REQUIRED_CHECK = "Test, build, and coverage";
const READY_MERGE_STATES = new Set(["CLEAN", "UNSTABLE"]);
const SUCCESS_STATES = new Set(["SUCCESS", "NEUTRAL", "SKIPPED"]);
const HOSTED_REVIEW_FILE_LIMIT = 100;

const SOURCE_FILE = /^(?:apps|packages)\/[^/]+\/src\/.+\.[cm]?[jt]sx?$/i;
const TEST_FILE =
  /(?:^|\/)(?:__tests__|test|tests)(?:\/|$)|\.(?:spec|test)\.[cm]?[jt]sx?$/i;

const SECRET_PATTERNS = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/],
  ["live secret key", /\bsk_live_[A-Za-z0-9]{16,}\b/],
];

function result() {
  return { blockers: [], warnings: [], facts: [] };
}

function add(target, level, message) {
  target[level].push(message);
}

function checkName(check) {
  return check.name ?? check.context ?? "unknown check";
}

function checkState(check) {
  for (const candidate of [check.conclusion, check.state, check.status]) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.toUpperCase();
    }
  }
  return "UNKNOWN";
}

function latestCodeRabbitComment(comments) {
  return [...comments]
    .reverse()
    .find((comment) =>
      (comment.user?.login ?? comment.author?.login ?? "")
        .toLowerCase()
        .includes("coderabbit"),
    );
}

function evaluateRequiredCheck(target, checks) {
  const required = checks.find((check) => checkName(check) === REQUIRED_CHECK);
  if (!required) {
    add(target, "blockers", `required check is missing: ${REQUIRED_CHECK}`);
    return;
  }

  const state = checkState(required);
  if (state !== "SUCCESS") {
    add(target, "blockers", `required check is ${state}: ${REQUIRED_CHECK}`);
    return;
  }

  add(target, "facts", `required check is green: ${REQUIRED_CHECK}`);
}

function evaluateAdvisoryChecks(target, checks) {
  for (const check of checks) {
    if (checkName(check) === REQUIRED_CHECK) continue;
    const state = checkState(check);
    if (SUCCESS_STATES.has(state)) continue;
    add(target, "warnings", `advisory check is ${state}: ${checkName(check)}`);
  }
}

function evaluateHostedReviewCoverage(target, pullRequest, comments) {
  if (pullRequest.changedFiles > HOSTED_REVIEW_FILE_LIMIT) {
    add(
      target,
      "warnings",
      `${pullRequest.changedFiles} changed files exceeds CodeRabbit's observed hosted-review limit of ${HOSTED_REVIEW_FILE_LIMIT}; run the local reviewer or split the PR`,
    );
  }

  const latest = latestCodeRabbitComment(comments);
  if (
    latest &&
    /review skipped|too many files|rate limit/i.test(latest.body ?? "")
  ) {
    add(
      target,
      "warnings",
      "the latest CodeRabbit summary reports a skipped or rate-limited review",
    );
  }
}

export function evaluateHostedPullRequest({
  pullRequest,
  unresolvedThreads,
  comments = [],
}) {
  const target = result();
  const checks = pullRequest.statusCheckRollup ?? [];

  if (pullRequest.state !== "OPEN") {
    add(target, "blockers", `pull request state is ${pullRequest.state}`);
  }
  if (pullRequest.isDraft)
    add(target, "blockers", "pull request is still a draft");
  if (pullRequest.reviewDecision === "CHANGES_REQUESTED") {
    add(target, "blockers", "a reviewer has requested changes");
  }
  if (pullRequest.mergeable !== "MERGEABLE") {
    add(target, "blockers", `mergeable is ${pullRequest.mergeable}`);
  }
  if (!READY_MERGE_STATES.has(pullRequest.mergeStateStatus)) {
    add(
      target,
      "blockers",
      `mergeStateStatus is ${pullRequest.mergeStateStatus}`,
    );
  }
  if (unresolvedThreads > 0) {
    add(
      target,
      "blockers",
      `${unresolvedThreads} review thread(s) remain unresolved`,
    );
  } else {
    add(target, "facts", "review threads are at zero unresolved");
  }

  evaluateRequiredCheck(target, checks);
  evaluateAdvisoryChecks(target, checks);
  evaluateHostedReviewCoverage(target, pullRequest, comments);

  if (pullRequest.mergeStateStatus === "UNSTABLE") {
    add(
      target,
      "warnings",
      "merge state is UNSTABLE because an advisory check is red",
    );
  }

  add(target, "facts", `${pullRequest.changedFiles} changed file(s)`);
  return target;
}

export function findAddedSecrets(addedLines) {
  const findings = [];
  for (const [index, entry] of addedLines.entries()) {
    const content = typeof entry === "string" ? entry : entry.content;
    const location =
      typeof entry === "string" || !entry.file || !Number.isInteger(entry.line)
        ? `added line ${index + 1}`
        : `${entry.file}:${entry.line}`;
    for (const [name, pattern] of SECRET_PATTERNS) {
      if (pattern.test(content))
        findings.push(`${name} pattern at ${location}`);
    }
  }
  return findings;
}

function checkoutStep(lines, useIndex) {
  const useLine = lines[useIndex];
  const useIndent = useLine.match(/^\s*/)?.[0].length ?? 0;
  const stepIndent = /^\s*-\s/.test(useLine)
    ? useIndent
    : Math.max(0, useIndent - 2);
  let end = lines.length;

  for (let index = useIndex + 1; index < lines.length; index += 1) {
    const indent = lines[index].match(/^\s*/)?.[0].length ?? 0;
    if (indent === stepIndent && lines[index].trimStart().startsWith("- ")) {
      end = index;
      break;
    }
  }

  return lines.slice(useIndex, end).join("\n");
}

export function checkoutCredentialViolations(workflows) {
  const violations = [];

  for (const { path, content } of workflows) {
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      if (!/uses:\s*actions\/checkout@/.test(lines[index])) continue;
      if (
        !/^\s*persist-credentials:\s*(?:false|"false"|'false')\s*(?:#.*)?$/im.test(
          checkoutStep(lines, index),
        )
      ) {
        violations.push(`${path}:${index + 1}`);
      }
    }
  }

  return violations;
}

function evaluateLocalGitState(target, snapshot) {
  const {
    dirtyEntries,
    baseExists,
    baseIsAncestor,
    diffCheckError,
    changedFiles,
  } = snapshot;
  if (dirtyEntries.length > 0) {
    add(
      target,
      "blockers",
      `worktree is not clean (${dirtyEntries.length} path(s))`,
    );
  }
  if (!baseExists) add(target, "blockers", "base ref does not exist locally");
  if (baseExists && !baseIsAncestor) {
    add(
      target,
      "blockers",
      "base ref is not an ancestor of HEAD; update the branch first",
    );
  }
  if (diffCheckError)
    add(target, "blockers", `git diff --check failed: ${diffCheckError}`);
  if (baseExists && changedFiles.length === 0)
    add(target, "blockers", "branch has no changes against base");
}

function evaluateLocalSecurity(target, { addedLines, workflows }) {
  for (const finding of findAddedSecrets(addedLines)) {
    add(target, "blockers", finding);
  }
  for (const violation of checkoutCredentialViolations(workflows)) {
    add(
      target,
      "blockers",
      `actions/checkout must set persist-credentials: false (${violation})`,
    );
  }
}

function evaluateLocalBlockers(target, snapshot) {
  evaluateLocalGitState(target, snapshot);
  evaluateLocalSecurity(target, snapshot);
}

function evaluateLocalWarnings(target, changedFiles, sourceFiles, testFiles) {
  if (changedFiles.length > HOSTED_REVIEW_FILE_LIMIT) {
    add(
      target,
      "warnings",
      `${changedFiles.length} changed files exceeds CodeRabbit's observed hosted-review limit of ${HOSTED_REVIEW_FILE_LIMIT}`,
    );
  }
  if (sourceFiles.length > 0 && testFiles.length === 0) {
    add(
      target,
      "warnings",
      `${sourceFiles.length} source file(s) changed without a test-file change; record why existing coverage is sufficient or add a regression test`,
    );
  }
}

export function evaluateLocalSnapshot(snapshot) {
  const target = result();
  const sourceFiles = snapshot.changedFiles.filter((file) =>
    SOURCE_FILE.test(file),
  );
  const testFiles = snapshot.changedFiles.filter((file) =>
    TEST_FILE.test(file),
  );

  evaluateLocalBlockers(target, snapshot);
  evaluateLocalWarnings(target, snapshot.changedFiles, sourceFiles, testFiles);

  add(target, "facts", `${snapshot.changedFiles.length} changed file(s)`);
  add(target, "facts", `${sourceFiles.length} source file(s)`);
  add(target, "facts", `${testFiles.length} test file(s)`);
  return target;
}

export const policyConstants = {
  HOSTED_REVIEW_FILE_LIMIT,
  REQUIRED_CHECK,
};
