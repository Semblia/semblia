import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { parseArgs as parseNodeArgs } from "node:util";
import { pathToFileURL } from "node:url";

import { evaluateHostedPullRequest } from "./policy.mjs";

const GH_TIMEOUT_MS = 60_000;

const PULL_REQUEST_FIELDS = [
  "changedFiles",
  "comments",
  "isDraft",
  "mergeable",
  "mergeStateStatus",
  "number",
  "reviewDecision",
  "state",
  "statusCheckRollup",
  "url",
].join(",");

const THREAD_QUERY = `
query($owner:String!,$repo:String!,$number:Int!,$cursor:String){
  repository(owner:$owner,name:$repo){
    pullRequest(number:$number){
      reviewThreads(first:100,after:$cursor){
        nodes{isResolved}
        pageInfo{hasNextPage endCursor}
      }
    }
  }
}`;

function parsePullRequestNumber(value) {
  if (value === undefined) return null;
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error("--pr must be a positive integer");
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number)) {
    throw new Error("--pr must be a positive integer");
  }
  return number;
}

export function parseHostedArgs(argv) {
  const { values } = parseNodeArgs({
    args: argv.filter((argument) => argument !== "--"),
    allowPositionals: false,
    options: {
      json: { type: "boolean", default: false },
      pr: { type: "string" },
      repo: { type: "string" },
    },
    strict: true,
  });
  return {
    json: values.json,
    number: parsePullRequestNumber(values.pr),
    repository: values.repo ?? null,
  };
}

function gh(args) {
  const run = spawnSync("gh", args, {
    encoding: "utf8",
    timeout: GH_TIMEOUT_MS,
  });
  if (run.error) throw run.error;
  if (run.status !== 0) {
    throw new Error(
      (run.stderr || run.stdout || `gh ${args[0]} failed`).trim(),
    );
  }
  return run.stdout;
}

function ghJson(args) {
  return JSON.parse(gh(args));
}

function repositoryName(explicitRepository) {
  if (explicitRepository) return explicitRepository;
  return ghJson(["repo", "view", "--json", "nameWithOwner"]).nameWithOwner;
}

function pullRequestNumber(explicitNumber, repository) {
  if (explicitNumber) return explicitNumber;
  return ghJson(["pr", "view", "--repo", repository, "--json", "number"])
    .number;
}

function fetchPullRequest(repository, number) {
  return ghJson([
    "pr",
    "view",
    String(number),
    "--repo",
    repository,
    "--json",
    PULL_REQUEST_FIELDS,
  ]);
}

function fetchThreadPage(owner, repo, number, cursor) {
  const args = [
    "api",
    "graphql",
    "-f",
    `query=${THREAD_QUERY}`,
    "-F",
    `owner=${owner}`,
    "-F",
    `repo=${repo}`,
    "-F",
    `number=${number}`,
  ];
  if (cursor) args.push("-F", `cursor=${cursor}`);
  return ghJson(args).data.repository.pullRequest.reviewThreads;
}

function unresolvedThreadCount(repository, number) {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo)
    throw new Error(`invalid repository name: ${repository}`);

  let cursor = null;
  let unresolved = 0;
  do {
    const page = fetchThreadPage(owner, repo, number, cursor);
    unresolved += page.nodes.filter((thread) => !thread.isResolved).length;
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  return unresolved;
}

function printEvaluation(pullRequest, evaluation, json) {
  if (json) {
    console.log(
      JSON.stringify(
        {
          pullRequest: pullRequest.number,
          url: pullRequest.url,
          ...evaluation,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`PR ${pullRequest.number} ${pullRequest.url}`);
  for (const fact of evaluation.facts) console.log(`FACT ${fact}`);
  for (const warning of evaluation.warnings) console.log(`WARN ${warning}`);
  for (const blocker of evaluation.blockers) console.error(`BLOCK ${blocker}`);
  console.log(
    `PR_GATE_HOSTED blockers=${evaluation.blockers.length} warnings=${evaluation.warnings.length}`,
  );
}

export function main(argv = process.argv.slice(2)) {
  const options = parseHostedArgs(argv);
  const repository = repositoryName(options.repository);
  const number = pullRequestNumber(options.number, repository);
  const pullRequest = fetchPullRequest(repository, number);
  const evaluation = evaluateHostedPullRequest({
    pullRequest,
    unresolvedThreads: unresolvedThreadCount(repository, number),
    comments: pullRequest.comments ?? [],
  });
  printEvaluation(pullRequest, evaluation, options.json);
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
      `PR_GATE_HOSTED_ERROR ${error instanceof Error ? error.message : error}`,
    );
    process.exitCode = 2;
  }
}
