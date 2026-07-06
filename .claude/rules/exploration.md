# Codebase Exploration — Intent-Routed Hierarchy

Benchmark snapshot (2026-04-16, 15 canonical retrieval cases):

- Vector (`scripts/codesearch.py`): Top-6 hit 100%, MRR 0.833, median latency 3.70s
- Graphify (`graphify query`): Top-6 hit 53.3%, MRR 0.258, median latency 0.39s, ~4.0x token reduction

## Level 1 — pick primary traversal by intent

Accuracy-first file localization (default for implementation lookup —
identifying exact files/functions to edit):

```bash
python scripts/codesearch.py query "<your question>"
```

Speed-first structural orientation (architecture, relationships,
cross-module flow):

```bash
graphify query "<your question>" --graph graphify-out/graph.json --budget 1200
```

Also read `graphify-out/GRAPH_REPORT.md` for god nodes and community
structure before answering architecture/relationship questions. If
`graphify-out/wiki/index.md` exists, navigate it instead of raw files.
Use `graphify path` for dependency-flow questions.

## Level 2 — cross-check with the secondary traversal

- Started with vector and results are ambiguous/multi-hop → use graphify for
  relationship context (`GRAPH_REPORT.md` first, `graph.json` only if the
  report lacks detail).
- Started with graphify and need exact file targeting → run vector search
  before editing.

## Level 3 — raw file reads (last resort)

Only when levels 1 and 2 are insufficient, or when explicitly asked.

If Ollama is unreachable (`ollama serve` to start it), use graphify-only
traversal and explicitly note reduced file-level precision.

## Index maintenance — MANDATORY

After writing or modifying **any** source file in `apps/web_v2`,
`apps/api_v2`, or `packages`:

```bash
python scripts/update-indexes.py
```

This updates the vector store (incremental, seconds) and the knowledge graph
(AST for code changes). Stale indexes mean the next query returns wrong
files. `python scripts/rebuild-graphify.py` rebuilds the graph alone when
needed with a compatible interpreter.
