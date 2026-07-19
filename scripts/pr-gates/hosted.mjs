import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { evaluateHostedPullRequest } from "./policy.mjs";

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

export function parseHostedArgs(argv) {
  const options = { json: false, number: null, repository: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") {
      continue;
    } else if (argument === "--json") {
      options.json = true;
    } else if (argument === "--pr" && argv[index + 1]) {
      const value = argv[index + 1];
      if (!/^[1-9]\d*$/.test(value)) {
        throw new Error("--pr must be a positive integer");
      }
      options.number = Number(value);
      if (!Number.isSafeInteger(options.number)) {
        throw new Error("--pr must be a positive integer");
      }
      index += 1;
    } else if (argument === "--repo" && argv[index + 1]) {
      options.repository = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`unknown or incomplete argument: ${argument}`);
    }
  }
  if (
    options.number !== null &&
    (!Number.isInteger(options.number) || options.number < 1)
  ) {
    throw new Error("--pr must be a positive integer");
  }
  return options;
}

function gh(args) {
  const run = spawnSync("gh", args, { encoding: "utf8" });
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
