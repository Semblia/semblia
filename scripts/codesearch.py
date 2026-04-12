# type: ignore
"""
Codebase vector search using ChromaDB + Ollama (nomic-embed-text).

Usage:
  python scripts/codesearch.py index              # index/re-index all source files
  python scripts/codesearch.py query "auth flow"  # find relevant files
  python scripts/codesearch.py status             # show index state

Environment:
    CODESEARCH_OLLAMA_BASE_URL=http://127.0.0.1:11435
    CODESEARCH_MODEL_PROFILE=remote|local
    CODESEARCH_OLLAMA_MODEL=<model-name>
    CODESEARCH_EMBED_BATCH_SIZE=<int>
    CODESEARCH_INDEX_FLUSH_CHUNKS=<int>
    CODESEARCH_TOP_K=<int>
    CODESEARCH_MAX_QUERY_VARIANTS=<int>

This is Claude's PRIMARY codebase exploration tool. Outputs file paths +
relevant snippets so Claude reads only what matters, not everything.
"""
import sys
import os
import json
import hashlib
import re
import urllib.error
import urllib.request
from pathlib import Path

# Fix Windows console encoding
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

REPO_ROOT = Path(__file__).parent.parent
STORE_DIR = REPO_ROOT / "vector-store"
LEGACY_MANIFEST_FILE = STORE_DIR / "manifest.json"

MODEL_PROFILES = {
    "local": "nomic-embed-text",
    "remote": "mxbai-embed-large",
}

MODEL_PROFILE = os.environ.get("CODESEARCH_MODEL_PROFILE", "local").strip().lower()
DEFAULT_MODEL = MODEL_PROFILES.get(MODEL_PROFILE, MODEL_PROFILES["local"])
OLLAMA_MODEL = os.environ.get("CODESEARCH_OLLAMA_MODEL", DEFAULT_MODEL).strip()
OLLAMA_BASE_URL = os.environ.get("CODESEARCH_OLLAMA_BASE_URL", "http://localhost:11434").strip()
SAFE_MODEL_NAME = re.sub(r"[^a-zA-Z0-9]+", "_", OLLAMA_MODEL).strip("_").lower() or "default"
COLLECTION_NAME = os.environ.get("CODESEARCH_COLLECTION", f"codebase_{SAFE_MODEL_NAME}").strip()
MANIFEST_FILE = STORE_DIR / f"manifest_{SAFE_MODEL_NAME}.json"

DEFAULT_EMBED_MAX_CHARS = 3000 if "mxbai-embed-large" in OLLAMA_MODEL else 20000
EMBED_MAX_CHARS = int(os.environ.get("CODESEARCH_EMBED_MAX_CHARS", str(DEFAULT_EMBED_MAX_CHARS)))
EMBED_MIN_RETRY_CHARS = int(os.environ.get("CODESEARCH_EMBED_MIN_RETRY_CHARS", "512"))
DEFAULT_EMBED_BATCH_SIZE = 96 if MODEL_PROFILE == "remote" else 16
EMBED_BATCH_SIZE = max(1, int(os.environ.get("CODESEARCH_EMBED_BATCH_SIZE", str(DEFAULT_EMBED_BATCH_SIZE))))
DEFAULT_INDEX_FLUSH_CHUNKS = 512 if MODEL_PROFILE == "remote" else 96
INDEX_FLUSH_CHUNKS = max(1, int(os.environ.get("CODESEARCH_INDEX_FLUSH_CHUNKS", str(DEFAULT_INDEX_FLUSH_CHUNKS))))
EMBED_HTTP_TIMEOUT_S = int(os.environ.get("CODESEARCH_EMBED_HTTP_TIMEOUT_S", "300"))

# Source directories to index (matches graphify scope)
DEFAULT_SOURCE_DIRS = [
    "apps/web_v2",
    "apps/api_v2",
    "packages/database",
    # Keep repo tooling searchable for agent workflows and index debugging.
    "scripts",
]

# Optional override: comma-separated relative paths.
# Example: CODESEARCH_SOURCE_DIRS=apps/web_v2,apps/api_v2
SOURCE_DIRS = [
    p.strip().replace("\\", "/")
    for p in os.environ.get("CODESEARCH_SOURCE_DIRS", ",".join(DEFAULT_SOURCE_DIRS)).split(",")
    if p.strip()
]

# Extensions to index
INCLUDE_EXTS = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".py", ".json", ".md", ".css", ".scss",
}

# Paths to skip
SKIP_PATTERNS = [
    "node_modules", ".next", "dist", "build",
    ".graphifyignore", "vector-store", "graphify-out",
    "__pycache__", ".git",
    "pnpm-lock.yaml", "package-lock.json",
    "generated/prisma", "generated/client",
    # Large decorative/style files not useful for navigation
    "background-beams",
    "globals.css",
]

# Skip files larger than this (likely minified/generated)
MAX_FILE_BYTES = 150_000

CHUNK_SIZE = 90    # lines per chunk
CHUNK_OVERLAP = 18 # lines of overlap between chunks
TOP_K = max(1, int(os.environ.get("CODESEARCH_TOP_K", "6")))
MAX_QUERY_VARIANTS = max(1, int(os.environ.get("CODESEARCH_MAX_QUERY_VARIANTS", "4")))

# Query ranking controls
QUERY_CANDIDATE_MULTIPLIER = 20
QUERY_MIN_CANDIDATES = 80
QUERY_EXHAUSTIVE_CHUNK_LIMIT = 2000
SEMANTIC_WEIGHT = 0.62
LEXICAL_WEIGHT = 0.38

NOISY_PATH_PENALTIES = {
    "/components/ui/": 0.10,
}

NOISY_QUERY_ALLOWLIST = {
    "ui",
    "component",
    "components",
    "shadcn",
    "radix",
}

TOKEN_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]+")
STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "how",
    "i",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "to",
    "what",
    "when",
    "where",
    "which",
    "with",
}

DOC_INTENT_TOKENS = {
    "doc",
    "docs",
    "documentation",
    "readme",
    "guide",
    "overview",
}

TEST_INTENT_TOKENS = {
    "test",
    "tests",
    "spec",
    "unit",
    "integration",
    "e2e",
}

CODE_INTENT_TOKENS = {
    "code",
    "source",
    "file",
    "files",
    "implement",
    "implementation",
    "logic",
    "handler",
    "endpoint",
    "route",
    "routes",
    "module",
    "controller",
    "service",
    "guard",
    "decorator",
    "hook",
    "function",
    "class",
    "wiring",
    "bootstrap",
}

ROUTING_INTENT_TOKENS = {
    "auth",
    "protect",
    "protected",
    "public",
    "route",
    "routes",
    "routing",
    "middleware",
    "proxy",
    "guard",
    "access",
    "accessible",
}

WIRING_INTENT_TOKENS = {
    "module",
    "modules",
    "controller",
    "controllers",
    "service",
    "services",
    "guard",
    "decorator",
    "wiring",
    "bootstrap",
    "endpoint",
}

API_CLIENT_INTENT_TOKENS = {
    "api",
    "client",
    "endpoint",
    "fetch",
    "call",
    "calls",
    "request",
    "requests",
}

ONBOARDING_INTENT_TOKENS = {
    "welcome",
    "onboarding",
    "first",
    "run",
    "start",
}


def normalize_rel(path_or_rel) -> str:
    if isinstance(path_or_rel, Path):
        rel = str(path_or_rel.relative_to(REPO_ROOT))
    else:
        rel = str(path_or_rel)
    return rel.replace("\\", "/")


def normalize_manifest(manifest: dict) -> dict:
    return {normalize_rel(k): v for k, v in manifest.items()}


def tokenize(text: str) -> set[str]:
    return {
        tok.lower()
        for tok in TOKEN_RE.findall(text)
        if len(tok) > 1 and tok.lower() not in STOPWORDS
    }


def lexical_overlap(query_tokens: set[str], text: str) -> float:
    if not query_tokens:
        return 0.0
    text_tokens = tokenize(text)
    if not text_tokens:
        return 0.0
    return len(query_tokens & text_tokens) / len(query_tokens)


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def has_any(tokens: set[str], candidates: set[str]) -> bool:
    return bool(tokens & candidates)


def is_test_file(source_file: str) -> bool:
    lower = source_file.lower()
    return (
        ".spec." in lower
        or ".test." in lower
        or "/tests/" in lower
        or "/test/" in lower
    )


def build_query_profile(question: str, question_tokens: set[str]) -> dict:
    lowered = question.lower()
    doc_intent = has_any(question_tokens, DOC_INTENT_TOKENS)
    test_intent = has_any(question_tokens, TEST_INTENT_TOKENS)
    routing_intent = has_any(question_tokens, ROUTING_INTENT_TOKENS)
    wiring_intent = has_any(question_tokens, WIRING_INTENT_TOKENS)
    api_client_intent = has_any(question_tokens, API_CLIENT_INTENT_TOKENS)
    onboarding_intent = has_any(question_tokens, ONBOARDING_INTENT_TOKENS)
    code_intent = has_any(question_tokens, CODE_INTENT_TOKENS) or routing_intent or wiring_intent

    scope_prefixes = []
    if "web_v2" in lowered or re.search(r"\bweb[\s/_-]*v2\b", lowered):
        scope_prefixes.append("apps/web_v2/")
    if "api_v2" in lowered or re.search(r"\bapi[\s/_-]*v2\b", lowered):
        scope_prefixes.append("apps/api_v2/")
    if "packages/database" in lowered or "database package" in lowered or "database" in question_tokens:
        scope_prefixes.append("packages/database/")
    if "scripts" in question_tokens or "script" in question_tokens:
        scope_prefixes.append("scripts/")

    return {
        "doc_intent": doc_intent,
        "test_intent": test_intent,
        "code_intent": code_intent,
        "routing_intent": routing_intent,
        "wiring_intent": wiring_intent,
        "api_client_intent": api_client_intent,
        "onboarding_intent": onboarding_intent,
        "scope_prefixes": scope_prefixes,
    }


def build_query_variants(question: str, query_profile: dict) -> list[str]:
    variants = [question]

    if query_profile["routing_intent"]:
        variants.append(f"{question}\nproxy middleware guard route matcher auth protect public route")
    if query_profile["wiring_intent"]:
        variants.append(f"{question}\nmodule controller service guard decorator implementation wiring")
    if query_profile["api_client_intent"]:
        variants.append(f"{question}\napi-client lib api endpoint fetch request /v2")
    if query_profile["onboarding_intent"]:
        variants.append(f"{question}\nwelcome onboarding first-run flow")
    if query_profile["code_intent"] and not query_profile["doc_intent"]:
        variants.append(f"{question}\nsource code implementation file path")

    deduped = []
    seen = set()
    for variant in variants:
        key = variant.strip().lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(variant)
        if len(deduped) >= MAX_QUERY_VARIANTS:
            break

    return deduped


def path_penalty(source_file: str, query_tokens: set[str]) -> float:
    normalized = "/" + source_file
    if query_tokens & NOISY_QUERY_ALLOWLIST:
        return 0.0
    penalty = 0.0
    for pattern, amount in NOISY_PATH_PENALTIES.items():
        if pattern in normalized:
            penalty = max(penalty, amount)
    return penalty


def file_type_penalty(source_file: str, query_profile: dict) -> float:
    lower = source_file.lower()
    penalty = 0.0
    if query_profile["code_intent"] and not query_profile["doc_intent"] and lower.endswith(".md"):
        penalty += 0.18
    if not query_profile["test_intent"] and is_test_file(source_file):
        penalty += 0.16
    return penalty


def intent_path_boost(source_file: str, query_profile: dict) -> float:
    lower = source_file.lower()
    boost = 0.0

    for prefix in query_profile["scope_prefixes"]:
        if lower.startswith(prefix):
            boost += 0.06
            break

    if query_profile["routing_intent"] and any(
        marker in lower for marker in ("/proxy.", "proxy.ts", "middleware", "guard")
    ):
        boost += 0.14

    if query_profile["wiring_intent"]:
        if "/modules/" in lower:
            boost += 0.05
        if any(
            marker in lower
            for marker in ("module.", "controller.", "service.", "guard.", "decorator.")
        ):
            boost += 0.12

    if query_profile["api_client_intent"] and any(
        marker in lower for marker in ("/lib/api", "api-client", "/api.ts")
    ):
        boost += 0.12

    if query_profile["onboarding_intent"] and "/welcome/" in lower:
        boost += 0.10

    return boost


def build_embedding_text(source_file: str, start_line: int, chunk_text: str) -> str:
    # Include path metadata in embeddings so filename/path intent improves recall.
    text = f"file: {source_file}\nstart_line: {start_line}\n\n{chunk_text}"
    return text[:EMBED_MAX_CHARS]


def score_candidate(
    question_tokens: set[str],
    query_profile: dict,
    source_file: str,
    snippet: str,
    semantic_score: float,
):
    lexical_doc = lexical_overlap(question_tokens, snippet)
    lexical_path = lexical_overlap(question_tokens, source_file.replace("/", " "))
    lexical_name = lexical_overlap(question_tokens, Path(source_file).name.replace(".", " "))
    lexical = max(lexical_doc, lexical_path, lexical_name)
    boost = (0.08 * lexical_path) + (0.12 * lexical_name)
    if lexical_name >= 0.5:
        boost += 0.08
    boost += intent_path_boost(source_file, query_profile)
    penalty = path_penalty(source_file, question_tokens) + file_type_penalty(source_file, query_profile)
    hybrid = clamp01((semantic_score * SEMANTIC_WEIGHT) + (lexical * LEXICAL_WEIGHT) + boost - penalty)
    return hybrid, lexical, boost, penalty


def should_skip(path: Path) -> bool:
    # Normalize to forward slashes for cross-platform matching
    path_str = str(path).replace("\\", "/")
    parts = path.parts
    return any(skip in parts or skip in path_str for skip in SKIP_PATTERNS)


def iter_source_files():
    for src in SOURCE_DIRS:
        base = REPO_ROOT / src
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if (
                path.is_file()
                and path.suffix in INCLUDE_EXTS
                and not should_skip(path)
                and path.stat().st_size <= MAX_FILE_BYTES
            ):
                yield path


def chunk_file(path: Path):
    """Split a file into overlapping line chunks. Returns list of (chunk_text, start_line)."""
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return []
    lines = text.splitlines()
    if not lines:
        return []
    chunks = []
    i = 0
    while i < len(lines):
        chunk_lines = lines[i : i + CHUNK_SIZE]
        chunks.append(("\n".join(chunk_lines), i + 1))
        if i + CHUNK_SIZE >= len(lines):
            break
        i += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def file_hash(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()


def get_client():
    import chromadb
    STORE_DIR.mkdir(exist_ok=True)
    return chromadb.PersistentClient(path=str(STORE_DIR / "chroma"))


def get_collection(client):
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def batched(items: list[str], size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def embed_single_with_retry(client, text: str) -> list[float]:
    current_text = text
    while True:
        try:
            resp = client.embeddings(model=OLLAMA_MODEL, prompt=current_text)
            return resp["embedding"]
        except Exception as e:
            msg = str(e).lower()
            can_retry = (
                "exceeds the context length" in msg
                or "input length exceeds the context length" in msg
            )
            if not can_retry or len(current_text) <= EMBED_MIN_RETRY_CHARS:
                raise
            # Retry with a smaller prompt when model context limits are hit.
            next_len = max(EMBED_MIN_RETRY_CHARS, int(len(current_text) * 0.7))
            current_text = current_text[:next_len]


def embed_batch_http(batch: list[str]) -> list[list[float]]:
    payload = json.dumps({"model": OLLAMA_MODEL, "input": batch}).encode("utf-8")
    url = f"{OLLAMA_BASE_URL.rstrip('/')}/api/embed"
    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=EMBED_HTTP_TIMEOUT_S) as resp:
            body = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace") if hasattr(e, "read") else str(e)
        raise RuntimeError(f"batch embed request failed: {detail}") from e

    data = json.loads(body)
    embeddings = data.get("embeddings")
    if isinstance(embeddings, list) and len(embeddings) == len(batch):
        return embeddings
    if len(batch) == 1 and isinstance(data.get("embedding"), list):
        return [data["embedding"]]
    raise RuntimeError("batch embed response did not include expected embeddings")


def embed(texts: list[str]) -> list[list[float]]:
    """Embed texts using Ollama, preferring batched embedding requests."""
    import ollama

    if not texts:
        return []

    client = ollama.Client(host=OLLAMA_BASE_URL)
    results = []
    for batch in batched(texts, EMBED_BATCH_SIZE):
        if len(batch) == 1:
            results.append(embed_single_with_retry(client, batch[0]))
            continue

        try:
            results.extend(embed_batch_http(batch))
        except Exception:
            # If batch embed fails (server compatibility or context), fallback to
            # single-item embedding for this batch to preserve correctness.
            for text in batch:
                results.append(embed_single_with_retry(client, text))

    return results


def load_manifest() -> dict:
    if MANIFEST_FILE.exists():
        return normalize_manifest(json.loads(MANIFEST_FILE.read_text()))
    return {}


def save_manifest(manifest: dict):
    STORE_DIR.mkdir(exist_ok=True)
    MANIFEST_FILE.write_text(json.dumps(manifest, indent=2))


def cmd_index(force: bool = False):
    """Index or incrementally update the vector store."""
    print("Scanning source files...")
    files = list(iter_source_files())
    print(f"Found {len(files)} files in {SOURCE_DIRS}")

    client = get_client()

    if force:
        print("Force mode: wiping existing collection...")
        try:
            client.delete_collection(COLLECTION_NAME)
        except Exception:
            pass
        manifest = {}
    else:
        manifest = load_manifest()

    collection = get_collection(client)

    files_by_rel = {normalize_rel(f): f for f in files}

    # Remove manifest entries/chunks for files no longer in scope.
    if not force:
        orphaned = sorted(set(manifest.keys()) - set(files_by_rel.keys()))
        if orphaned:
            print(f"Removing {len(orphaned)} orphaned file(s) from index...")
            for rel in orphaned:
                try:
                    existing = collection.get(where={"source_file": rel})
                    if existing["ids"]:
                        collection.delete(ids=existing["ids"])
                except Exception:
                    pass
                manifest.pop(rel, None)

    to_index = []
    for rel, f in files_by_rel.items():
        h = file_hash(f)
        if force or manifest.get(rel) != h:
            to_index.append((rel, f, h))

    if not to_index:
        save_manifest(manifest)
        print("All files up to date. Nothing to re-index.")
        return

    print(f"Indexing {len(to_index)} new/changed files...")
    print(f"Batch settings: embed_batch={EMBED_BATCH_SIZE}, flush_chunks={INDEX_FLUSH_CHUNKS}")

    indexed = 0
    skipped = 0
    prepared = 0

    pending_chunk_texts = []
    pending_embedding_texts = []
    pending_chunk_ids = []
    pending_chunk_metas = []
    pending_manifest_updates = {}

    def flush_pending():
        nonlocal indexed, skipped
        if not pending_chunk_ids:
            return

        try:
            embeddings = embed(pending_embedding_texts)
            collection.add(
                ids=pending_chunk_ids,
                embeddings=embeddings,
                documents=pending_chunk_texts,
                metadatas=pending_chunk_metas,
            )
            indexed += len(pending_manifest_updates)
            for k, v in pending_manifest_updates.items():
                manifest[k] = v
        except Exception as e:
            print(f"  WARN: skipped batch ({len(pending_manifest_updates)} files): {e}")
            skipped += len(pending_manifest_updates)
        finally:
            pending_chunk_texts.clear()
            pending_embedding_texts.clear()
            pending_chunk_ids.clear()
            pending_chunk_metas.clear()
            pending_manifest_updates.clear()

    for rel, f, h in to_index:
        chunks = chunk_file(f)
        if not chunks:
            skipped += 1
            continue

        # Remove old chunks for this file
        try:
            existing = collection.get(where={"source_file": rel})
            if existing["ids"]:
                collection.delete(ids=existing["ids"])
        except Exception:
            pass

        # Build chunk docs
        for chunk_text, start_line in chunks:
            chunk_id = f"{rel}::{start_line}"
            pending_chunk_texts.append(chunk_text)
            pending_embedding_texts.append(build_embedding_text(rel, start_line, chunk_text))
            pending_chunk_ids.append(chunk_id)
            pending_chunk_metas.append({
                "source_file": rel,
                "start_line": start_line,
                "file_ext": f.suffix,
            })

        pending_manifest_updates[rel] = h
        prepared += 1

        if prepared % 10 == 0:
            print(f"  prepared {prepared}/{len(to_index)} files...")

        if len(pending_chunk_ids) >= INDEX_FLUSH_CHUNKS:
            flush_pending()

    flush_pending()

    save_manifest(manifest)
    print(f"\nDone. {indexed} files indexed, {skipped} skipped.")
    print(f"Total in store: {collection.count()} chunks")


def cmd_query(question: str):
    """Find the most relevant files for a question."""
    client = get_client()
    collection = get_collection(client)

    if collection.count() == 0:
        print("ERROR: Index is empty. Run: python scripts/codesearch.py index")
        sys.exit(1)

    question_tokens = tokenize(question)
    query_profile = build_query_profile(question, question_tokens)
    query_variants = build_query_variants(question, query_profile)

    try:
        query_embeddings = embed(query_variants)
    except Exception as e:
        print(f"ERROR: Could not embed query. Is Ollama running? ({e})")
        print("Start Ollama: ollama serve")
        sys.exit(1)

    total_chunks = collection.count()
    if total_chunks <= QUERY_EXHAUSTIVE_CHUNK_LIMIT:
        candidate_count = total_chunks
    else:
        candidate_count = min(
            max(TOP_K * QUERY_CANDIDATE_MULTIPLIER, QUERY_MIN_CANDIDATES),
            total_chunks,
        )

    results = collection.query(
        query_embeddings=query_embeddings,
        n_results=candidate_count,
        include=["documents", "metadatas", "distances"],
    )

    # Deduplicate by file, keep best-scoring chunk per file.
    # Hybrid score = semantic similarity + lexical overlap + small path boost - noise penalty.
    seen_files = {}
    for docs, metas, dists in zip(
        results["documents"],
        results["metadatas"],
        results["distances"],
    ):
        for doc, meta, dist in zip(docs, metas, dists):
            f = meta["source_file"]
            semantic_score = clamp01(1 - dist)
            hybrid, lexical, boost, penalty = score_candidate(
                question_tokens,
                query_profile,
                f,
                doc,
                semantic_score,
            )
            if f not in seen_files or hybrid > seen_files[f]["score"]:
                seen_files[f] = {
                    "score": hybrid,
                    "semantic": semantic_score,
                    "lexical": lexical,
                    "snippet": doc,
                    "line": meta["start_line"],
                    "path_boost": boost,
                    "path_penalty": penalty,
                }

    # Sort by score, take top K
    ranked = sorted(seen_files.items(), key=lambda x: -x[1]["score"])[:TOP_K]

    print(f"Query: {question}")
    print(f"Top {len(ranked)} relevant files:\n")
    output = []
    for i, (filepath, info) in enumerate(ranked, 1):
        score_pct = int(info["score"] * 100)
        semantic_pct = int(info["semantic"] * 100)
        lexical_pct = int(info["lexical"] * 100)
        snippet_preview = info["snippet"][:300].replace("\n", " ").strip()
        line = info["line"]
        print(
            f"{i}. {filepath}:{line}  "
            f"[{score_pct}% match | sem={semantic_pct}% lex={lexical_pct}%]"
        )
        print(f"   {snippet_preview}...")
        print()
        output.append({
            "file": filepath,
            "line": line,
            "score": score_pct,
            "semantic": semantic_pct,
            "lexical": lexical_pct,
            "path_boost": round(info["path_boost"], 3),
            "path_penalty": round(info["path_penalty"], 3),
            "snippet": info["snippet"],
        })

    # Machine-readable output for programmatic use
    result_file = STORE_DIR / "last_query.json"
    result_file.write_text(
        json.dumps(
            {
                "question": question,
                "query_variants": query_variants,
                "results": output,
            },
            indent=2,
        )
    )

    return output


def cmd_status():
    """Show index status."""
    manifest = load_manifest()
    files = list(iter_source_files())
    file_hashes = {normalize_rel(f): file_hash(f) for f in files}
    indexed = sum(1 for rel in manifest if rel in file_hashes)
    total = len(files)
    stale = sum(
        1 for rel, h in file_hashes.items()
        if manifest.get(rel) != h
    )
    orphaned = sum(1 for rel in manifest if rel not in file_hashes)

    try:
        client = get_client()
        collection = get_collection(client)
        chunks = collection.count()
    except Exception:
        chunks = 0

    print(f"Vector store status:")
    print(f"  Files indexed : {indexed} / {total}")
    print(f"  Stale files   : {stale} (run 'index' to update)")
    print(f"  Orphaned      : {orphaned} (run 'index' to clean)")
    print(f"  Chunks stored : {chunks}")
    print(f"  Store path    : {STORE_DIR / 'chroma'}")
    print(f"  Model profile : {MODEL_PROFILE}")
    print(f"  Ollama model  : {OLLAMA_MODEL}")
    print(f"  Collection    : {COLLECTION_NAME}")
    print(f"  Ollama base   : {OLLAMA_BASE_URL}")
    print(f"  Embed batch   : {EMBED_BATCH_SIZE}")
    print(f"  Flush chunks  : {INDEX_FLUSH_CHUNKS}")
    print(f"  Top K results : {TOP_K}")
    print(f"  Query variants: {MAX_QUERY_VARIANTS}")

    try:
        import ollama
        c = ollama.Client(host=OLLAMA_BASE_URL)
        models = [m.model for m in c.list().models]
        available = OLLAMA_MODEL in models or any(OLLAMA_MODEL in m for m in models)
        print(f"  Ollama status : {'ready' if available else 'model not pulled yet'}")
    except Exception as e:
        print(f"  Ollama status : not reachable ({e})")
        print("  -> Start with: ollama serve")


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args or args[0] == "status":
        cmd_status()
    elif args[0] == "index":
        force = "--force" in args
        cmd_index(force=force)
    elif args[0] == "query":
        if len(args) < 2:
            print("Usage: python scripts/codesearch.py query \"your question\"")
            sys.exit(1)
        cmd_query(" ".join(args[1:]))
    else:
        print(__doc__)
        sys.exit(1)
