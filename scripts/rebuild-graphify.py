# type: ignore
"""
Incrementally rebuild the repository knowledge graph with a compatible Python interpreter.

Usage:
  python scripts/rebuild-graphify.py
  python3 scripts/rebuild-graphify.py

This wrapper exists because on Windows `python3` can resolve to a different
interpreter than `python`, and only one may have `graphify` installed.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
UPDATE_SCRIPT = REPO_ROOT / "scripts" / "update-indexes.py"


def configure_stdout() -> None:
    if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def build_env() -> dict[str, str]:
    env = os.environ.copy()
    env.setdefault("PYTHONIOENCODING", "utf-8")
    env.setdefault("PYTHONUTF8", "1")
    return env


def candidate_interpreters() -> list[list[str]]:
    candidates = [
        [sys.executable],
        ["python"],
        ["py", "-3.11"],
        ["py", "-3"],
        ["py"],
    ]
    unique: list[list[str]] = []
    seen: set[tuple[str, ...]] = set()
    for candidate in candidates:
        key = tuple(candidate)
        if key in seen:
            continue
        seen.add(key)
        unique.append(candidate)
    return unique


def can_import_graphify(interpreter: list[str], env: dict[str, str]) -> bool:
    try:
        result = subprocess.run(
            interpreter + ["-c", "import graphify"],
            cwd=REPO_ROOT,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    except OSError:
        return False
    return result.returncode == 0


def choose_interpreter(env: dict[str, str]) -> list[str] | None:
    for interpreter in candidate_interpreters():
        if can_import_graphify(interpreter, env):
            return interpreter
    return None


def main() -> int:
    configure_stdout()
    env = build_env()
    interpreter = choose_interpreter(env)
    if interpreter is None:
        print(
            "No Python interpreter with graphify installed was found. "
            "Install graphify for `python`, or run the graph rebuild from the "
            "interpreter that already supports `import graphify`."
        )
        return 1

    print(f"Using graphify interpreter: {' '.join(interpreter)}")
    result = subprocess.run(
        interpreter + [str(UPDATE_SCRIPT), "--graph"],
        cwd=REPO_ROOT,
        env=env,
        check=False,
    )
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())