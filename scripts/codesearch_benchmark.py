#!/usr/bin/env python
"""Benchmark retrieval quality for scripts/codesearch.py.

Usage:
  python scripts/codesearch_benchmark.py
  python scripts/codesearch_benchmark.py --max-depth 4 --top-k 6
  python scripts/codesearch_benchmark.py --cases-file path/to/cases.json

Case file format (JSON):
[
  {
    "id": "D1-1",
    "depth": 1,
    "difficulty": "easy",
    "query": "find auth guard",
    "expected": ["^apps/api_v2/src/common/guards/clerk-auth\\.guard\\.ts$"]
  }
]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
CODESEARCH_SCRIPT = REPO_ROOT / "scripts" / "codesearch.py"
LAST_QUERY_FILE = REPO_ROOT / "vector-store" / "last_query.json"
DEFAULT_OUTPUT_FILE = REPO_ROOT / "vector-store" / "codesearch_benchmark_latest.json"


DEFAULT_CASES: list[dict[str, Any]] = [
    {
        "id": "D1-1",
        "depth": 1,
        "difficulty": "easy",
        "query": "where is Next.js proxy for route protection in web v2",
        "expected": [r"^apps/web_v2/proxy\.ts$"],
    },
    {
        "id": "D1-2",
        "depth": 1,
        "difficulty": "easy",
        "query": "api client for web_v2 /v2 endpoint calls",
        "expected": [r"^apps/web_v2/lib/api-client\.ts$", r"^apps/web_v2/lib/api\.ts$"],
    },
    {
        "id": "D1-3",
        "depth": 1,
        "difficulty": "easy",
        "query": "clerk auth guard in api_v2",
        "expected": [r"^apps/api_v2/src/common/guards/clerk-auth\.guard\.ts$"],
    },
    {
        "id": "D2-1",
        "depth": 2,
        "difficulty": "medium",
        "query": "nestjs entry point bootstrap app module for api_v2",
        "expected": [r"^apps/api_v2/src/main\.ts$", r"^apps/api_v2/src/app\.module\.ts$"],
    },
    {
        "id": "D2-2",
        "depth": 2,
        "difficulty": "medium",
        "query": "current user id decorator for authenticated request handlers",
        "expected": [
            r"^apps/api_v2/src/common/decorators/current-user-id\.decorator\.ts$",
            r"^apps/api_v2/src/modules/users/users\.controller\.ts$",
        ],
    },
    {
        "id": "D2-3",
        "depth": 2,
        "difficulty": "medium",
        "query": "shared prisma client setup in database package",
        "expected": [r"^packages/database/src/prisma\.ts$", r"^packages/database/prisma\.config\.ts$"],
    },
    {
        "id": "D3-1",
        "depth": 3,
        "difficulty": "hard",
        "query": "first-run onboarding flow welcome experience in web_v2 app",
        "expected": [
            r"^apps/web_v2/app/\(app\)/welcome/_welcome-flow\.tsx$",
            r"^apps/web_v2/app/\(app\)/welcome/page\.tsx$",
        ],
    },
    {
        "id": "D3-2",
        "depth": 3,
        "difficulty": "hard",
        "query": "keyboard shortcuts dialog and hook for command keys",
        "expected": [
            r"^apps/web_v2/components/kbd-shortcuts-dialog\.tsx$",
            r"^apps/web_v2/hooks/use-keyboard-shortcuts\.ts$",
        ],
    },
    {
        "id": "D3-3",
        "depth": 3,
        "difficulty": "hard",
        "query": "theme toggle provider integration in web_v2",
        "expected": [
            r"^apps/web_v2/components/providers/theme-provider\.tsx$",
            r"^apps/web_v2/components/ui/theme-toggle\.tsx$",
            r"^apps/web_v2/app/design/theme-toggle\.tsx$",
        ],
    },
    {
        "id": "D4-1",
        "depth": 4,
        "difficulty": "adversarial",
        "query": "how does v2 enforce public routes while keeping auth pages accessible",
        "expected": [r"^apps/web_v2/proxy\.ts$"],
    },
    {
        "id": "D4-2",
        "depth": 4,
        "difficulty": "adversarial",
        "query": "health check endpoint module and controller wiring in api v2",
        "expected": [
            r"^apps/api_v2/src/modules/health/health\.controller\.ts$",
            r"^apps/api_v2/src/modules/health/health\.module\.ts$",
        ],
    },
    {
        "id": "D4-3",
        "depth": 4,
        "difficulty": "adversarial",
        "query": "synchronize clerk identities into local user records service logic",
        "expected": [
            r"^apps/api_v2/src/modules/clerk/clerk\.service\.ts$",
            r"^apps/api_v2/src/modules/users/users\.service\.ts$",
        ],
    },
    {
        "id": "D5-1",
        "depth": 5,
        "difficulty": "extreme",
        "query": "project-scoped sidebar menu source for /projects/[slug] navigation",
        "expected": [r"^apps/web_v2/components/nav/project-sidebar\.tsx$"],
    },
    {
        "id": "D5-2",
        "depth": 5,
        "difficulty": "extreme",
        "query": "which file enables rawBody for svix webhook signature verification in api_v2",
        "expected": [r"^apps/api_v2/src/main\.ts$", r"^apps/api_v2/src/modules/users/users\.controller\.ts$"],
    },
    {
        "id": "D5-3",
        "depth": 5,
        "difficulty": "extreme",
        "query": "where is webhook event transformed into Clerk user payload for upsert",
        "expected": [r"^apps/api_v2/src/modules/users/users\.controller\.ts$", r"^apps/api_v2/src/modules/users/users\.service\.ts$"],
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Benchmark scripts/codesearch.py retrieval quality")
    parser.add_argument("--max-depth", type=int, default=5, help="Run cases up to this depth (default: 5)")
    parser.add_argument("--top-k", type=int, default=6, help="Top-K threshold for pass/fail metrics")
    parser.add_argument("--timeout-s", type=int, default=180, help="Per-query timeout in seconds")
    parser.add_argument("--cases-file", type=str, default="", help="Optional JSON file of benchmark cases")
    parser.add_argument("--output", type=str, default=str(DEFAULT_OUTPUT_FILE), help="Path to output JSON report")
    parser.add_argument(
        "--fail-on-miss",
        action="store_true",
        help="Exit non-zero when any case misses Top-K",
    )
    return parser.parse_args()


def load_cases(cases_file: str) -> list[dict[str, Any]]:
    if not cases_file:
        return DEFAULT_CASES

    payload = json.loads(Path(cases_file).read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError("cases file must contain a JSON array")

    required = {"id", "depth", "difficulty", "query", "expected"}
    for index, case in enumerate(payload, start=1):
        if not isinstance(case, dict):
            raise ValueError(f"case #{index} must be an object")
        missing = required - set(case.keys())
        if missing:
            raise ValueError(f"case #{index} is missing keys: {sorted(missing)}")
        if not isinstance(case["expected"], list) or not case["expected"]:
            raise ValueError(f"case #{index} expected must be a non-empty array of regex strings")

    return payload


def run_query(question: str, top_k: int, timeout_s: int) -> dict[str, Any]:
    env = os.environ.copy()
    env["CODESEARCH_TOP_K"] = str(max(1, top_k))

    completed = subprocess.run(
        [sys.executable, str(CODESEARCH_SCRIPT), "query", question],
        cwd=REPO_ROOT,
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout_s,
    )

    if completed.returncode != 0:
        raise RuntimeError(
            f"codesearch query failed for {question!r}:\n{completed.stdout}\n{completed.stderr}"
        )

    if not LAST_QUERY_FILE.exists():
        raise RuntimeError("vector-store/last_query.json not found after query run")

    return json.loads(LAST_QUERY_FILE.read_text(encoding="utf-8"))


def find_rank(results: list[dict[str, Any]], expected_patterns: list[str]) -> int:
    compiled = [re.compile(pattern) for pattern in expected_patterns]
    for index, item in enumerate(results, start=1):
        file_path = str(item.get("file", ""))
        if any(regex.search(file_path) for regex in compiled):
            return index
    return 0


def summarize(group: list[dict[str, Any]], top_k: int) -> dict[str, Any]:
    total = len(group)
    top1 = sum(1 for row in group if row["rank"] == 1)
    top3 = sum(1 for row in group if 0 < row["rank"] <= 3)
    topk = sum(1 for row in group if 0 < row["rank"] <= top_k)
    mrr = sum((1.0 / row["rank"]) for row in group if row["rank"] > 0) / total
    return {
        "total": total,
        "top1Hits": top1,
        "top3Hits": top3,
        "topKHits": topk,
        "top1Rate": round((top1 / total) * 100, 1),
        "top3Rate": round((top3 / total) * 100, 1),
        "topKRate": round((topk / total) * 100, 1),
        "mrr": round(mrr, 3),
    }


def main() -> int:
    args = parse_args()
    cases = [case for case in load_cases(args.cases_file) if int(case["depth"]) <= args.max_depth]
    if not cases:
        print("No benchmark cases selected.")
        return 1

    print(f"Running {len(cases)} benchmark cases (max depth={args.max_depth}, top-k={args.top_k})")

    results = []
    for case in cases:
        print(f"- {case['id']} depth={case['depth']} difficulty={case['difficulty']}")
        payload = run_query(str(case["query"]), args.top_k, args.timeout_s)
        ranked = list(payload.get("results", []))
        rank = find_rank(ranked, list(case["expected"]))

        row = {
            "id": case["id"],
            "depth": int(case["depth"]),
            "difficulty": case["difficulty"],
            "query": case["query"],
            "expected": case["expected"],
            "rank": rank,
            "hitTop1": rank == 1,
            "hitTop3": 0 < rank <= 3,
            "hitTopK": 0 < rank <= args.top_k,
            "top1": ranked[0] if ranked else {},
            "topResults": ranked[:3],
            "queryVariants": payload.get("query_variants", []),
        }
        results.append(row)

        top1_file = row["top1"].get("file", "NONE")
        print(f"  rank={rank} top1={top1_file}")

    by_depth: dict[int, list[dict[str, Any]]] = defaultdict(list)
    by_difficulty: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in results:
        by_depth[int(row["depth"])].append(row)
        by_difficulty[str(row["difficulty"])].append(row)

    depth_summary = []
    for depth in sorted(by_depth):
        summary = summarize(by_depth[depth], args.top_k)
        summary["depth"] = depth
        depth_summary.append(summary)

    difficulty_summary = []
    for difficulty in sorted(by_difficulty):
        summary = summarize(by_difficulty[difficulty], args.top_k)
        summary["difficulty"] = difficulty
        difficulty_summary.append(summary)

    overall = summarize(results, args.top_k)

    report = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "settings": {
            "maxDepth": args.max_depth,
            "topK": args.top_k,
            "timeoutSeconds": args.timeout_s,
            "ollamaBase": os.environ.get("CODESEARCH_OLLAMA_BASE_URL", "http://localhost:11434"),
            "modelProfile": os.environ.get("CODESEARCH_MODEL_PROFILE", "local"),
        },
        "overall": overall,
        "depthSummary": depth_summary,
        "difficultySummary": difficulty_summary,
        "cases": results,
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("\nDepth summary:")
    for row in depth_summary:
        print(
            f"  depth={row['depth']} total={row['total']} "
            f"top1={row['top1Hits']}/{row['total']} ({row['top1Rate']}%) "
            f"top3={row['top3Hits']}/{row['total']} ({row['top3Rate']}%) "
            f"top{args.top_k}={row['topKHits']}/{row['total']} ({row['topKRate']}%) "
            f"mrr={row['mrr']}"
        )

    print("\nOverall:")
    print(
        f"  total={overall['total']} "
        f"top1={overall['top1Hits']}/{overall['total']} ({overall['top1Rate']}%) "
        f"top3={overall['top3Hits']}/{overall['total']} ({overall['top3Rate']}%) "
        f"top{args.top_k}={overall['topKHits']}/{overall['total']} ({overall['topKRate']}%) "
        f"mrr={overall['mrr']}"
    )
    print(f"\nReport written to {output_path}")

    if args.fail_on_miss and any(not row["hitTopK"] for row in results):
        return 2
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.TimeoutExpired as exc:
        print(f"ERROR: query timed out after {exc.timeout}s", file=sys.stderr)
        raise SystemExit(3)
    except Exception as exc:  # noqa: BLE001 - benchmark should fail with explicit message
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)