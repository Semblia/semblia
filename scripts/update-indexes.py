# type: ignore
"""
Update both the vector store and knowledge graph after file changes.

Usage:
  python scripts/update-indexes.py          # update both (incremental)
  python scripts/update-indexes.py --vec    # vector store only (fast, ~seconds)
  python scripts/update-indexes.py --graph  # knowledge graph only (uses LLM)

Run this after creating or modifying source files anywhere in the repo
(apps/*, packages, scripts, docs, memory, deploy).

Vector store update: incremental, local Ollama, free, ~seconds.
Graph update: incremental, AST for code (free); doc/image changes are
detected but left for a manual `/graphify . --update` semantic pass since
that needs Claude.
"""
import sys
import subprocess
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO_ROOT = Path(__file__).parent.parent
GRAPH_TARGETS = [
    "apps/web_v2", "apps/api_v2", "apps/admin", "apps/forms_runtime",
    "packages", "scripts", "docs", "memory", "deploy",
]


def update_vector():
    print("-- Vector store (incremental) --")
    result = subprocess.run(
        [sys.executable, "-u", "scripts/codesearch.py", "index"],
        cwd=REPO_ROOT,
    )
    return result.returncode == 0


def update_graph():
    print("-- Knowledge graph (incremental) --")

    # Check if graphify manifest exists (needed for --update to work)
    manifest = REPO_ROOT / "graphify-out" / "manifest.json"
    if not manifest.exists():
        print("  No existing graph manifest. Run /graphify first to build the initial graph.")
        return False

    try:
        import json
        from graphify.detect import detect_incremental, save_manifest 
        from pathlib import Path as P

        # Detect changed files across all target dirs
        all_changed = {"new_files": {}, "new_total": 0}
        all_unchanged: dict[str, list[str]] = {}
        for target in GRAPH_TARGETS:
            r = detect_incremental(P(target))
            all_changed["new_total"] += r.get("new_total", 0)
            for cat, files in r.get("new_files", {}).items():
                all_changed["new_files"].setdefault(cat, []).extend(files)
            for cat, files in r.get("unchanged_files", {}).items():
                all_unchanged.setdefault(cat, []).extend(files)

        if all_changed["new_total"] == 0:
            print("  Graph up to date. No changed files detected.")
            return True

        print(f"  {all_changed['new_total']} changed file(s) detected.")

        # Separate code vs doc/image files
        code_exts = {
            ".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
            ".go", ".rs", ".java", ".cpp", ".c", ".rb", ".cs",
            ".kt", ".swift", ".scala", ".php",
        }
        all_changed_files = [f for files in all_changed["new_files"].values() for f in files]
        code_only = all(P(f).suffix.lower() in code_exts for f in all_changed_files)

        # AST extraction for code files
        from graphify.extract import collect_files, extract

        code_files = [P(f) for f in all_changed_files if P(f).suffix.lower() in code_exts]
        if code_files:
            print(f"  AST extraction: {len(code_files)} code file(s)...")
            ast_result = extract(code_files)
            P(".graphify_ast_update.json").write_text(
                json.dumps(ast_result, indent=2), encoding="utf-8"
            )
            print(f"  AST: {len(ast_result['nodes'])} nodes, {len(ast_result['edges'])} edges")
        else:
            ast_result = {"nodes": [], "edges": [], "hyperedges": []}
            P(".graphify_ast_update.json").write_text(json.dumps(ast_result), encoding="utf-8")

        if code_only:
            print("  Code-only changes — skipping semantic extraction.")
            sem_result = {"nodes": [], "edges": [], "hyperedges": []}
        else:
            print("  Semantic extraction needed for doc/image changes.")
            print("  Run /graphify . --update --no-viz")
            print("  (Semantic extraction requires Claude — skipping for now)")
            sem_result = {"nodes": [], "edges": [], "hyperedges": []}

        # Merge into existing graph
        from graphify.build import build_from_json
        from graphify.cluster import cluster, score_all
        from graphify.analyze import god_nodes, surprising_connections, suggest_questions
        from graphify.report import generate
        from graphify.export import to_json
        from networkx.readwrite import json_graph
        import networkx as nx

        existing_data = json.loads(P("graphify-out/graph.json").read_text(encoding="utf-8"))
        G_existing = json_graph.node_link_graph(existing_data, edges="links")

        # Build update graph
        update_extraction = {
            "nodes": ast_result["nodes"] + sem_result.get("nodes", []),
            "edges": ast_result["edges"] + sem_result.get("edges", []),
            "hyperedges": sem_result.get("hyperedges", []),
        }
        if update_extraction["nodes"] or update_extraction["edges"]:
            G_new = build_from_json(update_extraction)
            G_existing.update(G_new)
            print(f"  Merged: {G_existing.number_of_nodes()} nodes, {G_existing.number_of_edges()} edges")

            # Re-cluster and regenerate report
            communities = cluster(G_existing)
            cohesion = score_all(G_existing, communities)
            gods = god_nodes(G_existing)
            surprises = surprising_connections(G_existing, communities)
            labels = {cid: "Community " + str(cid) for cid in communities}
            questions = suggest_questions(G_existing, communities, labels)
            detection = {"total_files": 0, "total_words": 99999, "needs_graph": True,
                         "warning": None, "files": {"code": [], "document": [], "paper": []}}
            tokens = {"input": 0, "output": 0}

            report = generate(
                G_existing, communities, cohesion, labels, gods, surprises,
                detection, tokens, " + ".join(GRAPH_TARGETS),
                suggested_questions=questions,
            )
            P("graphify-out/GRAPH_REPORT.md").write_text(report, encoding="utf-8")
            to_json(G_existing, communities, "graphify-out/graph.json")

            # Only mark files that were actually extracted (AST code files) as
            # seen. Doc/image files are detected but never extracted here
            # (that needs Claude via /graphify --update), so they must stay
            # out of the manifest or a future run would silently skip them
            # forever. This also preserves every previously-tracked file
            # instead of replacing the whole manifest with just this delta.
            manifest_files = {k: list(v) for k, v in all_unchanged.items()}
            manifest_files.setdefault("code", [])
            manifest_files["code"] = sorted(set(manifest_files["code"]) | {str(f) for f in code_files})
            save_manifest(manifest_files)
            print("  Graph and GRAPH_REPORT.md updated.")
        else:
            print("  No extractable changes for graph update.")

        # Clean up temp files
        for tmp in [".graphify_ast_update.json"]:
            P(tmp).unlink(missing_ok=True)

        return True

    except ImportError as e:
        print(f"  graphify not available: {e}")
        return False
    except Exception as e:
        print(f"  Graph update failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    args = set(sys.argv[1:])
    vec_only = "--vec" in args
    graph_only = "--graph" in args
    run_both = not vec_only and not graph_only

    success = True
    if run_both or vec_only:
        success &= update_vector()
    if run_both or graph_only:
        success &= update_graph()

    sys.exit(0 if success else 1)
